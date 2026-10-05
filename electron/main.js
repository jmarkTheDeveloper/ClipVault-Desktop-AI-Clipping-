import { app, BrowserWindow, session, shell, globalShortcut, nativeImage, protocol, net, dialog, ipcMain, Notification } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { spawn, exec } from 'child_process';
import util from 'util';
import nodeNet from 'node:net'; // Fix 3: TCP probe for port 8000 (never taskkill a foreign PID)
import updaterPkg from 'electron-updater';
const autoUpdater = updaterPkg.autoUpdater || (updaterPkg.default && updaterPkg.default.autoUpdater);

const execAsync = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV === 'development' && !app.isPackaged;
const configuredEdition = (process.env.CLIPVAULT_EDITION || process.env.CLIPVAULT_MODE || '').toLowerCase();
let currentEdition = configuredEdition === 'consumer' ? 'consumer' : (configuredEdition === 'developer' ? 'developer' : (isDev ? 'developer' : 'consumer'));

// Security Guard 1: Anti-Malicious Debugger & CLI Flag Injection Lockdown
const suspiciousFlags = ['--remote-debugging-port', '--inspect', '--inspect-brk', '--remote-debugging-targets'];
if (
  process.env.ELECTRON_RUN_AS_NODE ||
  process.argv.some(arg => suspiciousFlags.some(flag => arg.includes(flag)))
) {
  console.error('[SECURITY ALERT]: Suspicious debugging flag or NODE override detected. Terminating process immediately.');
  app.quit();
  process.exit(1);
}

// Generate single-session 256-bit cryptographically secure token for Python API authorization
const BACKEND_AUTH_TOKEN = crypto.randomBytes(32).toString('hex');

// Set Application Name & Identity so Windows Task Manager, Settings, and Notifications show ClipVault
app.name = 'ClipVault';
app.setName('ClipVault');

// Disable Electron console security warnings in dev mode (packaged app already excludes these)
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

// Windows Taskbar & Toast Notification Identity Registration
if (process.platform === 'win32') {
  app.setAppUserModelId('ClipVault');
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
// Fix 1/4: single source of truth for the engine data directory. The spawn and the
// open-path / local:// handlers all resolve through this, so a packaged build always
// uses the writable userData path (never a path inside app.asar).
let engineDataDir = null;

function resolveEngineDataDir() {
  if (!engineDataDir) {
    engineDataDir = app.isPackaged
      ? path.join(app.getPath('userData'), 'engine_data')
      : path.resolve(__dirname, '..', 'engine');
  }
  return engineDataDir;
}

// Fix 1: containment check for the local:// handler. Compares fully resolved paths and
// requires a trailing separator so "C:\data-evil" can never match the root "C:\data".
function isPathInsideRoot(resolvedPath, root) {
  if (!resolvedPath || !root) return false;
  const normalizeCase = (value) => (process.platform === 'win32' ? value.toLowerCase() : value);
  const target = normalizeCase(resolvedPath);
  const base = normalizeCase(path.resolve(root));
  const baseWithSep = base.endsWith(path.sep) ? base : base + path.sep;
  return target === base || target.startsWith(baseWithSep);
}

// Fix 1: only the engine data dir (clips, temp, backgrounds, music) and the app's own
// renderer assets may be served over local://.
function getAllowedLocalRoots() {
  const roots = [];
  try {
    roots.push(resolveEngineDataDir());
  } catch (err) {
    console.error('[Electron]: Could not resolve engine data dir for local:// roots:', err);
  }
  try {
    roots.push(path.resolve(__dirname, '..', 'dist'));
    roots.push(path.resolve(__dirname, '..', 'public'));
  } catch (err) {
    console.error('[Electron]: Could not resolve asset roots for local://:', err);
  }
  return roots.filter(Boolean);
}

function isAllowedLocalPath(resolvedPath) {
  return getAllowedLocalRoots().some((root) => isPathInsideRoot(resolvedPath, root));
}

// Security Guard 2: Secure IPC Auth Token Handler with Frame Validation
ipcMain.handle('get-auth-token', (event) => {
  const senderUrl = event.senderFrame?.url || event.sender?.getURL() || '';
  if (
    senderUrl.startsWith('http://localhost') ||
    senderUrl.startsWith('http://127.0.0.1') ||
    senderUrl.startsWith('file://') ||
    senderUrl.startsWith('local://')
  ) {
    return BACKEND_AUTH_TOKEN;
  }
  return null;
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
      // Fix 4: resolve against the real engine data dir (writable outside app.asar).
      // Resolving inside app.asar made mkdirSync throw into a swallowed catch, so the
      // button silently did nothing in packaged builds.
      const clipsDir = path.join(resolveEngineDataDir(), 'clips');
      let target = folderPath;
      if (!target || target === 'clips' || target === 'Default (engine/clips)' || target === 'Main Library' || target === 'all' || target === 'root') {
        target = clipsDir;
      } else if (!path.isAbsolute(target)) {
        target = path.join(clipsDir, target);
      }
      const norm = path.normalize(target);
      if (!fs.existsSync(norm)) {
        try { fs.mkdirSync(norm, { recursive: true }); } catch (e) {
          console.error('[Electron]: Could not create folder for open-path:', e);
        }
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

  ipcMain.handle('open-external', async (event, url) => {
    try {
      if (url && (url.startsWith('http:') || url.startsWith('https:') || url.startsWith('mailto:'))) {
        await shell.openExternal(url);
        return true;
      }
    } catch (err) {
      console.error('[Electron]: openExternal error:', err);
    }
    return false;
  });

  ipcMain.handle('set-title-bar-overlay', async (event, options) => {
    try {
      if (mainWindow && !mainWindow.isDestroyed() && typeof mainWindow.setTitleBarOverlay === 'function') {
        mainWindow.setTitleBarOverlay(options);
        return true;
      }
    } catch (err) {
      console.error('[Electron]: setTitleBarOverlay error:', err);
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

// Fix 5: this used to delete ANY *.lnk in the user's Start Menu whose name merely
// contained "clipvault", so user-created shortcuts disappeared on every launch. It no
// longer deletes anything; ClipVault only writes/updates its own ClipVault.lnk below.
function cleanupLegacyWindowsShortcuts() {
  if (process.platform !== 'win32') return;
  try {
    // Intentionally no unlink of pre-existing shortcuts.
  } catch (err) {
    console.error('[Electron]: Legacy shortcut cleanup error:', err);
  }
}

  ipcMain.handle('show-notification', async (event, { title, body, icon }) => {
    try {
      cleanupLegacyWindowsShortcuts();
      if (Notification.isSupported()) {
        const notifIconPath = icon || path.join(__dirname, '../public/icon.png');
        const notifIcon = nativeImage.createFromPath(notifIconPath);
        const notif = new Notification({
          title: title || 'ClipVault',
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
  const iconIco = path.resolve(__dirname, '../public/icon.ico');
  const iconPng = path.resolve(__dirname, '../public/icon.png');
  const icon512 = path.resolve(__dirname, '../public/icon-512.png');
  const iconTarget = process.platform === 'win32'
    ? (fs.existsSync(iconIco) ? iconIco : (fs.existsSync(icon512) ? icon512 : iconPng))
    : (fs.existsSync(icon512) ? icon512 : (fs.existsSync(iconPng) ? iconPng : iconIco));
  const appIcon = fs.existsSync(iconTarget) ? nativeImage.createFromPath(iconTarget) : undefined;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    title: 'ClipVault',
    show: false,
    icon: (appIcon && !appIcon.isEmpty()) ? appIcon : iconTarget,
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
      color: '#080c14',
      symbolColor: '#e2e8f0',
      height: 48,
    }
  });

  if (appIcon && !appIcon.isEmpty()) {
    try {
      mainWindow.setIcon(appIcon);
    } catch (e) {}
  }

  // Security Guard: Safely delegate external web links and mailto protocols to default system browser / mail client
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:') || url.startsWith('mailto:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Security Guard: Block unauthorized in-app remote navigation while allowing file:// and local origins
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('mailto:')) {
      event.preventDefault();
      shell.openExternal(url);
      return;
    }
    if (!url.startsWith('http://localhost') && !url.startsWith('http://127.0.0.1') && !url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Security Guard: Disable browser context menu across non-editable elements (prevents inspect, text scraping)
  mainWindow.webContents.on('context-menu', (event, params) => {
    if (!params.isEditable) {
      event.preventDefault();
    }
  });

  const distPath = path.join(__dirname, '../dist/index.html');

  let loadAttempts = 0;
  const loadApp = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (isDev && currentEdition === 'developer') {
      mainWindow.loadURL('http://localhost:54321?edition=developer').catch(() => {
        if (mainWindow && !mainWindow.isDestroyed() && fs.existsSync(distPath)) {
          mainWindow.loadFile(distPath, { query: { edition: 'developer' } });
        }
      });
    } else {
      mainWindow.loadFile(distPath, { query: { edition: currentEdition } });
    }
  };

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.warn(`[Electron]: Page failed to load (${errorCode}: ${errorDescription}) at ${validatedURL}`);
    if (isDev && currentEdition === 'developer' && loadAttempts < 5) {
      loadAttempts++;
      setTimeout(() => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        console.log(`[Electron]: Retrying connection to dev server (attempt ${loadAttempts})...`);
        mainWindow.loadURL('http://localhost:54321?edition=developer').catch(() => {
          if (mainWindow && !mainWindow.isDestroyed() && fs.existsSync(distPath)) {
            mainWindow.loadFile(distPath, { query: { edition: 'developer' } });
          }
        });
      }, 1000);
    } else if (mainWindow && !mainWindow.isDestroyed() && fs.existsSync(distPath)) {
      console.log('[Electron]: Falling back to built bundle dist/index.html');
      mainWindow.loadFile(distPath, { query: { edition: currentEdition } });
    }
  });

  loadApp();

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
    mainWindow.focus();
    setupAutoUpdater();
  });

  // Guard Window Exit: Intercept titlebar close button (X) and forward to React to check active task state
  mainWindow.on('close', (event) => {
    if (!isQuittingConfirmed) {
      event.preventDefault();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('app-close-requested');
      }
    }
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

    // 2. Clean UI reload (Ctrl+R / F5) & Full Reboot (Ctrl+Shift+R)
    if (
      input.type === 'keyDown' &&
      ((input.control && input.key.toLowerCase() === 'r') || input.key === 'F5')
    ) {
      event.preventDefault();
      if (input.control && input.shift) {
        if (isReloading) return;
        isReloading = true;
        console.log('[Electron]: Ctrl+Shift+R detected. Rebooting Python backend and UI cleanly...');
        killPythonBackend();
        setTimeout(() => {
          startPythonBackend();
          const checkReady = (retries = 25) => {
            fetch('http://127.0.0.1:8000/api/health')
              .then(() => {
                mainWindow.webContents.reloadIgnoringCache();
                isReloading = false;
              })
              .catch(() => {
                if (retries > 0) setTimeout(() => checkReady(retries - 1), 200);
                else {
                  mainWindow.webContents.reloadIgnoringCache();
                  isReloading = false;
                }
              });
          };
          setTimeout(checkReady, 600);
        }, 300);
      } else {
        // Standard Ctrl+R: reload renderer immediately in 100ms
        console.log('[Electron]: Ctrl+R detected. Reloading UI renderer...');
        mainWindow.webContents.reloadIgnoringCache();
      }
    }
  });
}

// Fix 2: a zero-byte / truncated exe is what an antivirus quarantine usually leaves behind.
function isBundledEngineUsable(exePath) {
  try {
    const stat = fs.statSync(exePath);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

// Fix 3: detect a busy port instead of killing whatever holds it. Probing with a socket
// works for any program (HTTP or not) and on every platform.
function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = nodeNet.connect({ host: '127.0.0.1', port });
    const finish = (inUse) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(inUse);
    };
    socket.setTimeout(800);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

// Give our own just-killed engine (Ctrl+Shift+R restart) a moment to release the port
// before we conclude that somebody else owns it.
async function waitForPortFree(port, attempts = 6, delayMs = 300) {
  for (let i = 0; i < attempts; i++) {
    if (!(await isPortInUse(port))) return true;
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

function isClipVaultEngineHealthy(port = 8000) {
  return new Promise((resolve) => {
    const socket = nodeNet.connect({ host: '127.0.0.1', port });
    socket.setTimeout(800);
    socket.once('connect', () => {
      socket.destroy();
      try {
        net.fetch(`http://127.0.0.1:${port}/api/health`, { method: 'GET' })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data && (data.status === 'ok' || data.app?.includes('Clip'))) {
              resolve(true);
            } else {
              resolve(false);
            }
          })
          .catch(() => resolve(false));
      } catch {
        resolve(false);
      }
    });
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
    socket.once('error', () => { resolve(false); });
  });
}

async function freePort(port) {
  if (process.platform === 'win32') {
    try {
      await execAsync(`powershell -NoProfile -NonInteractive -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`);
    } catch (err) {
      console.warn(`[Electron]: Could not force-free port ${port}:`, err);
    }
  }
}

// Fix 3: smart port conflict resolution — auto-adopt healthy engine or allow 1-click free port
async function ensurePortAvailable(port) {
  for (;;) {
    if (await waitForPortFree(port)) return true;

    // If port 8000 is occupied by a running, healthy ClipVault engine, re-use it immediately!
    const healthy = await isClipVaultEngineHealthy(port);
    if (healthy) {
      console.log(`[Electron]: Port ${port} is occupied by an active, healthy ClipVault engine. Reusing instance.`);
      return 'reused';
    }

    const choice = dialog.showMessageBoxSync({
      type: 'warning',
      title: 'ClipVault Port Conflict',
      message: `Port ${port} is currently busy. An existing ClipVault background process or another program is using it.`,
      detail: 'Choose "Free Port & Continue" to automatically close the old background process, or "Retry" after closing it manually.',
      buttons: ['Free Port & Continue', 'Retry', 'Quit ClipVault'],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
    });

    if (choice === 0) {
      console.log(`[Electron]: User requested to free port ${port}. Terminating stale process...`);
      await freePort(port);
      await new Promise((r) => setTimeout(r, 600));
    } else if (choice === 2) {
      return false;
    }
  }
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

  // Fix 2: a packaged build must never fall back to system Python (customers do not have
  // it) - that produced a UI that loaded, did nothing and explained nothing. This runs
  // synchronously before createWindow(), and again on every Ctrl+Shift+R restart.
  if (isPackaged && !isBundledEngineUsable(bundledExePath)) {
    console.error('[Electron]: Bundled engine_server.exe is missing or unusable at:', bundledExePath);
    dialog.showErrorBox(
      'ClipVault Engine Missing',
      "ClipVault's engine is missing or was blocked by antivirus. Please reinstall."
    );
    app.exit(1);
    return;
  }

  const spawnPython = () => {
    try {
      let pythonCmd, args, cwd;

      if (isPackaged) {
        // ── PRODUCTION: launch bundled standalone engine_server.exe ──────────
        // The exe has all Python + FastAPI + uvicorn embedded inside it.
        // We pass the data dir so it knows where to read/write clips and temp files.
        engineDataDir = resolveEngineDataDir();
        pythonCmd = bundledExePath;
        args = [];
        cwd = bundledExeDir;
        console.log('[Electron]: Launching bundled engine_server.exe...');
      } else {
        // ── DEV / SOURCE: launch via system python + uvicorn ─────────────────
        // Fix 2: --reload is a development-only flag; this branch only ever runs unpackaged.
        engineDataDir = resolveEngineDataDir();
        pythonCmd = 'python';
        args = ['-m', 'uvicorn', 'server:app', '--host', '127.0.0.1', '--port', '8000', '--reload', '--timeout-graceful-shutdown', '2', '--log-level', 'info'];
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
          CLIPVAULT_AUTH_TOKEN: BACKEND_AUTH_TOKEN,
          // Fix 6: packaged-mode signal consumed by the engine's licence enforcement.
          CLIPVAULT_PACKAGED: app.isPackaged ? '1' : '0',
        }
      });

      pythonProcess.on('error', (err) => {
        console.error('[Electron]: Failed to start backend process:', err);
        // Fix 2: a failed spawn in a packaged build is fatal - say so instead of showing
        // a UI that silently does nothing.
        if (isPackaged) {
          dialog.showErrorBox(
            'ClipVault Engine Failed to Start',
            "ClipVault's engine could not be started. Please reinstall."
          );
          app.exit(1);
        }
      });

      const isNoisyLog = (str) => {
        if (!str) return false;
        return (
          str.includes('/stream?') ||
          str.includes('/stream ') ||
          str.includes('/api/progress') ||
          str.includes('/api/thumbnail') ||
          str.includes('/clips/')
        );
      };

      pythonProcess.stdout?.on('data', (data) => {
        const text = data.toString().trim();
        if (!text || isNoisyLog(text)) return;
        console.log(`[Backend]: ${text}`);
      });

      pythonProcess.stderr?.on('data', (data) => {
        const text = data.toString().trim();
        if (!text || isNoisyLog(text)) return;
        // Don't label standard Python/Uvicorn INFO or startup notices as errors
        if (
          text.startsWith('INFO:') ||
          text.includes('Started server process') ||
          text.includes('Waiting for application startup') ||
          text.includes('Application startup complete') ||
          text.includes('Will watch for changes')
        ) {
          console.log(`[Backend]: ${text}`);
        } else {
          console.error(`[Backend Error]: ${text}`);
        }
      });
    } catch (err) {
      console.error('[Electron]: Exception while spawning backend:', err);
    }
  };

  // Fix 3: this used to parse `netstat -aon | findstr :8000` (a substring match, so
  // :80000 etc. matched too) and taskkill /F /T every listening PID - which killed
  // unrelated customer software. We now detect a busy port and let the user decide.
  ensurePortAvailable(8000).then((status) => {
    if (!status) {
      console.log('[Electron]: Port 8000 is used by another program - user chose to quit.');
      app.exit(1);
      return;
    }
    if (status === 'reused') {
      console.log('[Electron]: Port 8000 already running active ClipVault engine. Connected successfully.');
      return;
    }
    setTimeout(spawnPython, 600);
  }).catch((err) => {
    console.error('[Electron]: Port availability check failed, starting engine anyway:', err);
    setTimeout(spawnPython, 600);
  });
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
  // Fix 3: the blanket `netstat | findstr :8000 | taskkill` sweep that ran here killed
  // whatever held port 8000 even after our own engine had already exited. Removed -
  // only the process tree we spawned (above) is ever terminated.
}

// Security Guard 3: Stamp every engine request with the per-session auth token at the network
// layer. Renderer-side patching cannot do this reliably: with contextIsolation enabled the
// preload's fetch wrapper lives in an isolated world and never reaches the React app's fetch, and
// <img>/<video> subresource loads (thumbnails, /stream) carry no scriptable headers at all.
// Hooking the session covers every request, which lets the Python shield verify first-party
// identity even though Chromium omits the Origin header for this window (webSecurity is disabled
// so local media loads freely).
function installEngineAuthHeader() {
  try {
    const engineUrls = ['http://127.0.0.1:8000/*', 'http://localhost:8000/*'];
    session.defaultSession.webRequest.onBeforeSendHeaders({ urls: engineUrls }, (details, callback) => {
      details.requestHeaders['X-App-Auth-Token'] = BACKEND_AUTH_TOKEN;
      callback({ requestHeaders: details.requestHeaders });
    });
  } catch (err) {
    console.error('[Electron]: Failed to install engine auth header:', err);
  }
}

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    try {
      const shortcutDir = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs');
      const shortcutPath = path.join(shortcutDir, 'ClipVault.lnk');
      const iconIco = path.resolve(__dirname, '../public/icon.ico');

      cleanupLegacyWindowsShortcuts();

      const rootDir = path.resolve(__dirname, '..');
      const shortcutOptions = {
        target: process.execPath,
        args: app.isPackaged ? '' : rootDir,
        cwd: rootDir,
        appUserModelId: 'ClipVault',
        description: 'ClipVault',
        icon: iconIco,
        iconIndex: 0,
      };
      if (fs.existsSync(iconIco)) {
        try {
          shell.writeShortcutLink(shortcutPath, 'replace', shortcutOptions);
        } catch (e) {
          shell.writeShortcutLink(shortcutPath, 'create', shortcutOptions);
        }
      }
    } catch (err) {
      console.error('[Electron]: Shortcut creation error:', err);
    }
  }

  // Fix 1: this handler used to decode whatever followed local:// and hand it straight to
  // net.fetch, so any renderer script could read ANY file on disk (e.g.
  // local:///C:/Users/<user>/.clipvault/keys_vault.json). It is a media fallback, so it now
  // only serves files inside the engine data dir / the app's own assets.
  const refusedLocalRequests = new Set();
  const logLocalRefusal = (reason, requested) => {
    // Log each distinct refusal once so a hostile renderer cannot flood the console.
    if (refusedLocalRequests.has(requested) || refusedLocalRequests.size >= 50) return;
    refusedLocalRequests.add(requested);
    console.warn(`[Electron]: Refused local:// request (${reason}).`);
  };

  protocol.handle('local', async (request) => {
    try {
      const rawUrl = request.url.replace(/^local:\/\//i, '').replace(/^local:\//i, '');
      const decodedPath = decodeURIComponent(rawUrl);
      let normPath = decodedPath.replace(/\\/g, '/');
      if (process.platform === 'win32' && normPath.startsWith('/')) {
        normPath = normPath.slice(1);
      }

      // Reject empty requests, UNC / device paths (\\server\share, \\?\C:) and anything
      // that is not an absolute path after normalisation.
      const isUncPath = /^[\\/]{2}/.test(decodedPath);
      const isAbsolutePath = process.platform === 'win32'
        ? /^[a-zA-Z]:[\\/]/.test(normPath)
        : normPath.startsWith('/');
      if (!normPath.trim() || isUncPath || !isAbsolutePath) {
        logLocalRefusal('not an absolute local path', decodedPath);
        return new Response('Forbidden', { status: 403 });
      }

      const resolvedPath = path.resolve(normPath);
      if (!isAllowedLocalPath(resolvedPath)) {
        // Never echo the requested path back to the caller.
        logLocalRefusal('outside allowed roots', decodedPath);
        return new Response('Forbidden', { status: 403 });
      }

      const fileUrl = 'file:///' + resolvedPath.replace(/\\/g, '/');
      const response = await net.fetch(fileUrl, { bypassCustomProtocolHandlers: true }).catch(() => null);
      if (response) {
        return response;
      }
      return new Response('File not found', { status: 404 });
    } catch {
      return new Response('File not found', { status: 404 });
    }
  });

  installEngineAuthHeader();
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

let isQuittingConfirmed = false;

ipcMain.handle('confirm-exit-app', async () => {
  isQuittingConfirmed = true;
  killPythonBackend();
  app.exit(0);
});

ipcMain.on('confirm-exit-app', () => {
  isQuittingConfirmed = true;
  killPythonBackend();
  app.exit(0);
});

ipcMain.handle('quit-app', async () => {
  isQuittingConfirmed = true;
  killPythonBackend();
  app.exit(0);
});

ipcMain.on('quit-app', () => {
  isQuittingConfirmed = true;
  killPythonBackend();
  app.exit(0);
});

// --- Automated Weekly Software Updater Engine ---
const WEEK_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const PERIODIC_CHECK_TICK_MS = 6 * 60 * 60 * 1000; // Periodic 6-hour interval to evaluate weekly cadence

function getUpdateStateFilePath() {
  try {
    return path.join(app.getPath('userData'), 'clipvault_updater_state.json');
  } catch {
    return null;
  }
}

function loadUpdateState() {
  const filePath = getUpdateStateFilePath();
  const defaultState = {
    lastUpdateCheck: 0,
    lastCheckedVersion: app.getVersion(),
    updateCadence: 'weekly',
    updateIntervalDays: 7,
    lastCheckStatus: 'never_checked',
    lastErrorMessage: null,
    pendingUpdate: null,
  };

  if (!filePath || !fs.existsSync(filePath)) {
    return defaultState;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      lastUpdateCheck: Number(parsed.lastUpdateCheck) || 0,
      lastCheckedVersion: parsed.lastCheckedVersion || app.getVersion(),
      updateCadence: 'weekly',
      updateIntervalDays: 7,
      lastCheckStatus: parsed.lastCheckStatus || 'idle',
      lastErrorMessage: parsed.lastErrorMessage || null,
      pendingUpdate: parsed.pendingUpdate || null,
    };
  } catch (err) {
    console.warn('[AutoUpdater]: Could not parse updater state file, using defaults:', err);
    return defaultState;
  }
}

function saveUpdateState(state) {
  try {
    const filePath = getUpdateStateFilePath();
    if (filePath) {
      fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
    }
  } catch (err) {
    console.warn('[AutoUpdater]: Could not persist update state:', err);
  }
}

let updaterState = loadUpdateState();
let isUpdateCheckRunning = false;

async function performWeeklyUpdateCheck(isManual = false) {
  if (isUpdateCheckRunning) {
    return { ok: true, inProgress: true, message: 'Update check is already in progress.' };
  }

  const now = Date.now();
  const timeSinceLast = now - (updaterState.lastUpdateCheck || 0);
  const isDue = timeSinceLast >= WEEK_MS;

  if (!isManual && !isDue && updaterState.lastUpdateCheck > 0) {
    const hoursRemaining = Math.max(0, (WEEK_MS - timeSinceLast) / (1000 * 60 * 60));
    const daysRemaining = (hoursRemaining / 24).toFixed(1);
    console.log(`[AutoUpdater]: Weekly schedule check skipped. Next scheduled weekly check in ~${daysRemaining} days (${Math.round(hoursRemaining)} hours).`);
    return {
      ok: true,
      scheduled: true,
      lastCheck: updaterState.lastUpdateCheck,
      nextScheduled: updaterState.lastUpdateCheck + WEEK_MS,
      currentVersion: app.getVersion(),
    };
  }

  console.log(`[AutoUpdater]: Initiating ${isManual ? 'manual' : 'scheduled weekly'} software update inspection...`);
  isUpdateCheckRunning = true;

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('checking-for-update');
  }

  if (isDev || !autoUpdater) {
    updaterState.lastUpdateCheck = now;
    updaterState.lastCheckStatus = 'dev_mode';
    updaterState.lastCheckedVersion = app.getVersion();
    saveUpdateState(updaterState);
    isUpdateCheckRunning = false;
    return {
      ok: true,
      status: 'dev_mode',
      message: 'Running in development environment. Auto-updater operates on packaged desktop distributions.',
      currentVersion: app.getVersion(),
      lastCheck: now,
      nextScheduled: now + WEEK_MS,
    };
  }

  try {
    const result = await autoUpdater.checkForUpdatesAndNotify();
    updaterState.lastUpdateCheck = now;
    updaterState.lastCheckStatus = 'success';
    updaterState.lastCheckedVersion = app.getVersion();
    updaterState.lastErrorMessage = null;
    saveUpdateState(updaterState);
    isUpdateCheckRunning = false;
    return {
      ok: true,
      status: 'checked',
      result,
      currentVersion: app.getVersion(),
      lastCheck: now,
      nextScheduled: now + WEEK_MS,
    };
  } catch (err) {
    console.warn('[AutoUpdater]: Weekly update inspection error:', err?.message || err);
    updaterState.lastUpdateCheck = now;
    updaterState.lastCheckStatus = 'error';
    updaterState.lastErrorMessage = err?.message || String(err);
    saveUpdateState(updaterState);
    isUpdateCheckRunning = false;
    return {
      ok: false,
      status: 'error',
      error: err?.message || String(err),
      currentVersion: app.getVersion(),
      lastCheck: now,
      nextScheduled: now + WEEK_MS,
    };
  }
}

function setupAutoUpdater() {
  if (isDev || !autoUpdater) {
    console.log('[AutoUpdater]: Skipping auto-updater background triggers in development environment.');
    return;
  }
  try {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => {
      console.log('[AutoUpdater]: Querying GitHub Releases weekly update channel...');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('checking-for-update');
      }
    });

    autoUpdater.on('update-available', (info) => {
      console.log('[AutoUpdater]: New weekly update found:', info?.version);
      updaterState.pendingUpdate = info?.version || null;
      saveUpdateState(updaterState);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-available', info);
      }
    });

    autoUpdater.on('update-not-available', (info) => {
      console.log('[AutoUpdater]: ClipVault Studio is fully up to date.');
      updaterState.pendingUpdate = null;
      saveUpdateState(updaterState);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-not-available', {
          currentVersion: app.getVersion(),
          checkedAt: Date.now(),
        });
      }
    });

    autoUpdater.on('error', (err) => {
      console.warn('[AutoUpdater]: Non-critical update check warning:', err?.message || err);
      updaterState.lastErrorMessage = err?.message || String(err);
      saveUpdateState(updaterState);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-error', { message: err?.message || String(err) });
      }
    });

    autoUpdater.on('download-progress', (progressObj) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-download-progress', progressObj);
      }
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('[AutoUpdater]: Weekly update downloaded cleanly:', info?.version);
      updaterState.pendingUpdate = info?.version || null;
      saveUpdateState(updaterState);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-downloaded', info);
      }
    });

    // Initial check after startup: evaluate if 7 days have passed since previous check
    setTimeout(() => {
      performWeeklyUpdateCheck(false).catch((err) => {
        console.warn('[AutoUpdater]: Initial weekly update check error:', err?.message || err);
      });
    }, 8000);

    // Periodic 6-hour schedule evaluation to handle long-running desktop sessions
    setInterval(() => {
      performWeeklyUpdateCheck(false).catch((err) => {
        console.warn('[AutoUpdater]: Periodic weekly interval check error:', err?.message || err);
      });
    }, PERIODIC_CHECK_TICK_MS);
  } catch (err) {
    console.warn('[AutoUpdater]: Failed to initialize auto-updater:', err);
  }
}

// IPC Handlers for Weekly Auto-Updater
ipcMain.handle('get-update-status', async () => {
  const now = Date.now();
  const lastCheck = updaterState.lastUpdateCheck || 0;
  const nextCheck = lastCheck > 0 ? lastCheck + WEEK_MS : now;
  return {
    currentVersion: app.getVersion(),
    lastUpdateCheck: lastCheck,
    nextScheduledCheck: nextCheck,
    updateIntervalDays: 7,
    updateCadence: 'Continuous',
    isDev: isDev || !app.isPackaged,
    lastCheckStatus: updaterState.lastCheckStatus,
    pendingUpdate: updaterState.pendingUpdate,
    isChecking: isUpdateCheckRunning,
  };
});

ipcMain.handle('check-for-updates', async () => {
  return await performWeeklyUpdateCheck(true);
});

ipcMain.handle('restart-and-install-update', async () => {
  try {
    if (!autoUpdater) {
      return { ok: false, error: 'Auto-updater unavailable' };
    }
    autoUpdater.quitAndInstall(false, true);
    return { ok: true };
  } catch (err) {
    console.error('[AutoUpdater]: Failed to restart and install update:', err?.message || err);
    return { ok: false, error: err?.message || String(err) };
  }
});

ipcMain.handle('get-app-edition', () => {
  return currentEdition;
});

ipcMain.handle('set-app-edition', (event, newEdition) => {
  if (newEdition === 'consumer' || newEdition === 'developer') {
    currentEdition = newEdition;
    console.log(`[Electron]: Application edition set to: ${newEdition}`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app-edition-changed', newEdition);
    }
    return { ok: true, edition: currentEdition };
  }
  return { ok: false, error: 'Invalid edition' };
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

