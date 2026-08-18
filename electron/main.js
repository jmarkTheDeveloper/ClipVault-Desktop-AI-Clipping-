import { app, BrowserWindow, shell, globalShortcut, nativeImage, protocol, net, dialog, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Windows Taskbar UserModelID for App Icon Persistence
if (process.platform === 'win32') {
  app.setAppUserModelId('ClipVault.AI.VideoStudio');
}

// Register privileged scheme BEFORE app is ready to bypass all security blocks
protocol.registerSchemesAsPrivileged([
  { scheme: 'local', privileges: { bypassCSP: true, supportFetchAPI: true, corsEnabled: true, stream: true } }
]);

// Enable GPU and hardware video decoding for smooth playback and lag-free UI
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('enable-accelerated-video-decode');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

let mainWindow;
let pythonProcess;

function createWindow() {
  protocol.handle('local', (request) => {
    try {
      const fileUrl = request.url.replace(/^local:\/\//i, 'file://');
      return net.fetch(fileUrl, { bypassCustomProtocolHandlers: true });
    } catch (err) {
      console.error('[Electron]: Failed to handle local:// protocol', err);
      return new Response('File not found', { status: 404 });
    }
  });

  ipcMain.handle('show-open-dialog', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result.filePaths;
  });

  ipcMain.handle('select-directory', async (event, defaultPath) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory'],
        defaultPath: defaultPath || undefined
      });
      return result.filePaths?.[0] || null;
    } catch (err) {
      console.error('[Electron]: select-directory error:', err);
      return null;
    }
  });

  ipcMain.handle('open-path', async (event, folderPath) => {
    try {
      if (folderPath) {
        await shell.openPath(folderPath);
        return true;
      }
    } catch (err) {
      console.error('[Electron]: openPath error:', err);
    }
    return false;
  });

  ipcMain.handle('show-item-in-folder', async (event, filePath) => {
    try {
      if (filePath) {
        shell.showItemInFolder(filePath);
        return true;
      }
    } catch (err) {
      console.error('[Electron]: showItemInFolder error:', err);
    }
    return false;
  });

  const iconPath = path.join(__dirname, '../public/icon.ico');
  const appIcon = nativeImage.createFromPath(iconPath);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    title: 'ClipVault AI Video Studio',
    show: false,
    icon: appIcon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      backgroundThrottling: false,
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#050505',
      symbolColor: '#f8fafc',
    }
  });

  mainWindow.setIcon(appIcon);

  // Security Guard: Safely delegate external web links to default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Security Guard: Block unauthorized in-app remote navigation while allowing file:// and local origins
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost') && !url.startsWith('http://127.0.0.1') && !url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  const isDev = process.env.NODE_ENV === 'development';
  const distPath = path.join(__dirname, '../dist/index.html');

  if (isDev) {
    mainWindow.loadURL('http://localhost:54321').catch(() => {
      mainWindow.loadFile(distPath);
    });
  } else {
    mainWindow.loadFile(distPath);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
    mainWindow.focus();
  });

  // Local Ctrl+R and F5 for reloading (not global!)
  let isReloading = false;
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (
      input.type === 'keyDown' &&
      ((input.control && input.key.toLowerCase() === 'r') || input.key === 'F5')
    ) {
      event.preventDefault();
      if (isReloading) return;
      isReloading = true;
      console.log('[Electron]: Ctrl+R detected. Rebooting Python backend and reloading UI...');
      killPythonBackend();
      startPythonBackend();
      mainWindow.webContents.reloadIgnoringCache();
      
      setTimeout(() => {
        isReloading = false;
      }, 2000);
    }
  });
}

function startPythonBackend() {
  const backendPath = path.join(__dirname, '../engine');
  
  const spawnPython = () => {
    try {
      // Removed shell: true to fix the Node DeprecationWarning and prevent cmd.exe wrapping
      // Added PYTHONUTF8: 1 to prevent Windows charmap crashes when backend prints emojis
      pythonProcess = spawn('python', ['-m', 'uvicorn', 'server:app', '--host', '127.0.0.1', '--port', '8000', '--log-level', 'info'], {
        cwd: backendPath,
        shell: false,
        env: { ...process.env, PYTHONUTF8: '1' }
      });

      pythonProcess.on('error', (err) => {
        console.error('[Electron]: Failed to start Python process:', err);
      });

      pythonProcess.stdout.on('data', (data) => {
        console.log(`[Python]: ${data}`);
      });

      pythonProcess.stderr.on('data', (data) => {
        console.error(`[Python Error]: ${data}`);
      });
    } catch (err) {
      console.error('[Electron]: Exception while spawning Python:', err);
    }
  };

  // Prevent zombie Python processes from locking port 8000 if the app crashed previously
  if (process.platform === 'win32') {
    exec('netstat -aon | findstr :8000', (err, stdout) => {
      if (stdout) {
        const lines = stdout.trim().split(/\r?\n/);
        for (const line of lines) {
          if (line.includes('LISTENING')) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0' && pid !== process.pid.toString()) {
              console.log(`[Electron]: Killing zombie process (PID: ${pid}) on port 8000...`);
              try { exec(`taskkill /F /PID ${pid}`); } catch (e) {}
            }
          }
        }
      }
      setTimeout(spawnPython, 400); // Give OS time to release the port
    });
  } else {
    exec('lsof -ti:8000 | xargs kill -9', () => {
      setTimeout(spawnPython, 400);
    });
  }
}

function killPythonBackend() {
  if (pythonProcess && pythonProcess.pid) {
    console.log('[Electron]: Terminating Python backend process tree...');
    if (process.platform === 'win32') {
      try {
        spawn('taskkill', ['/pid', pythonProcess.pid.toString(), '/T', '/F']);
      } catch (err) {
        console.error('[Electron]: Error terminating Python process tree:', err);
      }
    } else {
      try {
        pythonProcess.kill('SIGTERM');
      } catch (err) {
        console.error('[Electron]: Error killing Python process:', err);
      }
    }
    pythonProcess = null;
  }
}

app.whenReady().then(() => {
  startPythonBackend();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// IPC Handlers for Native YouTube Downloads
ipcMain.handle('get-youtube-info', async (event, url) => {
  try {
    const { stdout } = await execAsync(`python -m yt_dlp --dump-json "${url}"`, { maxBuffer: 1024 * 1024 * 10 });
    const info = JSON.parse(stdout);
    
    // Find best 4k/1080p video (mp4)
    const videoFormats = (info.formats || []).filter(f => f.vcodec !== 'none' && f.acodec === 'none' && f.ext === 'mp4');
    const bestVideo = videoFormats.sort((a, b) => (b.height || 0) - (a.height || 0))[0];
    
    // Find best audio (m4a or webm)
    const audioFormats = (info.formats || []).filter(f => f.acodec !== 'none' && f.vcodec === 'none');
    const bestAudio = audioFormats.sort((a, b) => (b.abr || 0) - (a.abr || 0))[0];

    // Fallback to combined if separated doesn't exist
    const combinedFormat = (info.formats || []).slice().reverse().find(f => f.vcodec !== 'none' && f.acodec !== 'none' && f.ext === 'mp4') || info;

    return {
      success: true,
      title: info.title,
      duration: info.duration,
      thumbnail: info.thumbnail,
      streamUrl: bestVideo ? bestVideo.url : combinedFormat.url,
      previewUrl: combinedFormat ? combinedFormat.url : (bestVideo ? bestVideo.url : info.url),
      audioUrl: bestAudio ? bestAudio.url : null,
      id: info.id
    };
  } catch (error) {
    console.error("yt-dlp Error:", error);
    return { success: false, error: error.message };
  }
});

app.on('window-all-closed', function () {
  killPythonBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  killPythonBackend();
});

app.on('will-quit', () => {
  killPythonBackend();
});

