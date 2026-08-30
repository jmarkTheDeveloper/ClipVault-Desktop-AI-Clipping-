import { app, BrowserWindow, shell, globalShortcut, nativeImage, protocol, net, dialog, ipcMain, Notification } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn, exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set Application Name & Identity so Windows Task Manager, Settings, and Notifications show ClipVault Studio
app.name = 'ClipVault Studio';
app.setName('ClipVault Studio');

// Disable Electron console security warnings in dev mode (packaged app already excludes these)
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

// Windows Taskbar & Toast Notification Identity Registration
if (process.platform === 'win32') {
  app.setAppUserModelId('com.clipvault.studio');
  try {
    const shortcutDir = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs');
    const shortcutPath = path.join(shortcutDir, 'ClipVault Studio.lnk');
    const iconFile = path.join(__dirname, '../public/icon.ico');
    shell.writeShortcutLink(shortcutPath, 'create', {
      target: process.execPath,
      args: app.isPackaged ? '' : `"${path.join(__dirname, '..')}"`,
      appUserModelId: 'com.clipvault.studio',
      description: 'ClipVault AI Video Studio',
      icon: iconFile,
      iconIndex: 0
    });
  } catch (e) {}
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
      let target = folderPath;
      if (!target || target === 'clips' || target === 'Default (engine/clips)' || target === 'Main Library' || target === 'all' || target === 'root') {
        target = path.join(__dirname, '..', 'clips');
        if (!fs.existsSync(target)) {
          target = path.join(__dirname, '..', 'engine', 'clips');
        }
      } else if (!path.isAbsolute(target)) {
        let base = path.join(__dirname, '..', 'clips');
        if (!fs.existsSync(base)) {
          base = path.join(__dirname, '..', 'engine', 'clips');
        }
        target = path.join(base, target);
      }
      const norm = path.normalize(target);
      if (!fs.existsSync(norm)) {
        try { fs.mkdirSync(norm, { recursive: true }); } catch (e) {}
      }

      if (process.platform === 'win32') {
        // Yield focus so Windows allows Explorer to take the top-level foreground
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.blur();
        }
        exec(`start "" explorer.exe "${norm}"`);
        return true;
      } else {
        const err = await shell.openPath(norm);
        return !err;
      }
    } catch (err) {
      console.error('[Electron]: openPath error:', err);
    }
    return false;
  });

  ipcMain.handle('show-item-in-folder', async (event, filePath) => {
    try {
      if (filePath) {
        const norm = path.normalize(filePath);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.blur();
        }
        shell.showItemInFolder(norm);
        return true;
      }
    } catch (err) {
      console.error('[Electron]: showItemInFolder error:', err);
    }
    return false;
  });

  ipcMain.on('start-drag', (event, filePath) => {
    try {
      if (filePath) {
        const resolvedPath = path.resolve(filePath);
        if (fs.existsSync(resolvedPath)) {
          const iconPath = path.join(__dirname, '../public/icon.ico');
          event.sender.startDrag({
            file: resolvedPath,
            icon: nativeImage.createFromPath(iconPath),
          });
        }
      }
    } catch (err) {
      console.error('[Electron]: startDrag error:', err);
    }
  });

  ipcMain.handle('show-notification', async (event, { title, body, icon }) => {
    try {
      if (Notification.isSupported()) {
        const notifIconPath = icon || path.join(__dirname, '../public/icon.png');
        const notifIcon = nativeImage.createFromPath(notifIconPath);
        const notif = new Notification({
          title: title || 'ClipVault Studio',
          body: body || 'Your viral clips are ready!',
          icon: notifIcon.isEmpty() ? undefined : notifIcon,
          silent: false,
        });
        notif.on('click', () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
          }
        });
        notif.show();
        return true;
      }
    } catch (err) {
      console.error('[Electron]: notification error:', err);
    }
    return false;
  });

function createWindow() {
  const iconPath = path.join(__dirname, '../public/icon.ico');
  const appIcon = nativeImage.createFromPath(iconPath);

  const isDev = process.env.NODE_ENV === 'development' && !app.isPackaged;

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
      devTools: isDev, // Completely disable DevTools in compiled .exe production builds
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

  // Strict Production Security: Prevent opening DevTools in packaged .exe builds
  if (!isDev) {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools();
    });
  }

  // Input Event Interceptor: Handle clean reload (Ctrl+R/F5) & block DevTools shortcuts in production
  let isReloading = false;
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // 1. Block DevTools inspection keys in production EXE
    if (!isDev) {
      if (
        input.key === 'F12' ||
        (input.control && input.shift && (input.key.toLowerCase() === 'i' || input.key.toLowerCase() === 'j' || input.key.toLowerCase() === 'c')) ||
        (input.control && input.key.toLowerCase() === 'u')
      ) {
        event.preventDefault();
        return;
      }
    }

    // 2. Clean backend reboot and UI reload
    if (
      input.type === 'keyDown' &&
      ((input.control && input.key.toLowerCase() === 'r') || input.key === 'F5')
    ) {
      event.preventDefault();
      if (isReloading) return;
      isReloading = true;
      console.log('[Electron]: Ctrl+R detected. Rebooting Python backend and UI cleanly...');
      killPythonBackend();
      setTimeout(() => {
        startPythonBackend();
        setTimeout(() => {
          mainWindow.webContents.reloadIgnoringCache();
          isReloading = false;
        }, 400);
      }, 150);
    }
  });
}

function startPythonBackend() {
  // ── Locate backend: bundled exe (production) OR python source (dev) ──────
  const isPackaged = app.isPackaged;

  // In packaged production build, the Python backend is bundled as engine_server.exe
  // electron-builder places extraResources at process.resourcesPath
  const bundledExePath = path.join(process.resourcesPath, 'engine_server', 'engine_server.exe');
  const bundledExeDir  = path.join(process.resourcesPath, 'engine_server');

  // In dev mode, the backend runs from the source engine/ folder
  const devBackendPath = path.join(__dirname, '../engine');

  const spawnPython = () => {
    try {
      let pythonCmd, args, cwd, engineDataDir;

      if (isPackaged && require('fs').existsSync(bundledExePath)) {
        // ── PRODUCTION: launch bundled standalone engine_server.exe ──────────
        // The exe has all Python + FastAPI + uvicorn embedded inside it.
        // We pass the data dir so it knows where to read/write clips and temp files.
        engineDataDir = path.join(app.getPath('userData'), 'engine_data');
        pythonCmd = bundledExePath;
        args = [];
        cwd = bundledExeDir;
        console.log('[Electron]: Launching bundled engine_server.exe...');
      } else {
        // ── DEV / SOURCE: launch via system python + uvicorn ─────────────────
        engineDataDir = devBackendPath;
        pythonCmd = 'python';
        args = ['-m', 'uvicorn', 'server:app', '--host', '127.0.0.1', '--port', '8000', '--reload', '--log-level', 'info'];
        cwd = devBackendPath;
        console.log('[Electron]: Launching Python dev backend...');
      }

      pythonProcess = spawn(pythonCmd, args, {
        cwd,
        shell: false,
        env: {
          ...process.env,
          PYTHONUTF8: '1',
          CLIPVAULT_ENGINE_DATA: engineDataDir,
        }
      });

      pythonProcess.on('error', (err) => {
        console.error('[Electron]: Failed to start backend process:', err);
      });

      pythonProcess.stdout?.on('data', (data) => {
        console.log(`[Backend]: ${data}`);
      });

      pythonProcess.stderr?.on('data', (data) => {
        console.error(`[Backend Error]: ${data}`);
      });
    } catch (err) {
      console.error('[Electron]: Exception while spawning backend:', err);
    }
  };

  // Prevent zombie processes from locking port 8000 if the app crashed previously
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
              try { exec(`taskkill /F /T /PID ${pid}`); } catch (e) {}
            }
          }
        }
      }
      setTimeout(spawnPython, 600);
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
  if (process.platform === 'win32') {
    try {
      exec('for /f "tokens=5" %a in (\'netstat -aon ^| findstr :8000 ^| findstr LISTENING\') do taskkill /f /t /pid %a');
    } catch (e) {}
  }
}

app.whenReady().then(() => {
  protocol.handle('local', async (request) => {
    try {
      const rawUrl = request.url.replace(/^local:\/\//i, '').replace(/^local:\//i, '');
      const decodedPath = decodeURIComponent(rawUrl);
      let normPath = decodedPath.replace(/\\/g, '/');
      if (process.platform === 'win32' && normPath.startsWith('/')) {
        normPath = normPath.slice(1);
      }
      const fileUrl = 'file:///' + normPath;
      const response = await net.fetch(fileUrl, { bypassCustomProtocolHandlers: true }).catch(() => null);
      if (response) {
        return response;
      }
      return new Response('File not found', { status: 404 });
    } catch {
      return new Response('File not found', { status: 404 });
    }
  });

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

