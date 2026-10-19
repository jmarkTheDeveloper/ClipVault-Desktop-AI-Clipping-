const { contextBridge, ipcRenderer } = require('electron');

let authToken = '';
ipcRenderer.invoke('get-auth-token').then((token) => {
  if (token) authToken = token;
}).catch(() => {});

// Intercept window.fetch to automatically attach X-App-Auth-Token for backend requests
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = async function (resource, config = {}) {
    let url = typeof resource === 'string' ? resource : (resource && resource.url) ? resource.url : '';
    if (!authToken) {
      try { authToken = await ipcRenderer.invoke('get-auth-token'); } catch (e) {}
    }
    const isBackendUrl = url.includes(':8000') || url.includes('127.0.0.1') || url.includes('localhost') || url.includes('/api/');
    if (isBackendUrl && authToken) {
      const headers = new Headers(config?.headers || {});
      if (!headers.has('X-App-Auth-Token')) {
        headers.set('X-App-Auth-Token', authToken);
      }
      config = { ...config, headers };
    }
    return originalFetch.call(this, resource, config);
  };
}

// We expose a secure API to the window object for React to use
contextBridge.exposeInMainWorld('electronAPI', {
  getAuthToken: () => ipcRenderer.invoke('get-auth-token'),
  getYoutubeInfo: (url) => ipcRenderer.invoke('get-youtube-info', url),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  selectDirectory: (defaultPath) => ipcRenderer.invoke('select-directory', defaultPath),
  openPath: (folderPath) => ipcRenderer.invoke('open-path', folderPath),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  setTitleBarOverlay: (options) => ipcRenderer.invoke('set-title-bar-overlay', options),
  showItemInFolder: (filePath) => ipcRenderer.invoke('show-item-in-folder', filePath),
  startDrag: (filePath) => ipcRenderer.send('start-drag', filePath),
  showNotification: (options) => ipcRenderer.invoke('show-notification', options),
  onCloseRequested: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('app-close-requested', handler);
    return () => ipcRenderer.removeListener('app-close-requested', handler);
  },
  confirmExit: () => {
    try {
      ipcRenderer.send('confirm-exit-app');
      ipcRenderer.invoke('confirm-exit-app');
    } catch {}
  },
  quitApp: () => {
    try {
      ipcRenderer.send('quit-app');
      ipcRenderer.invoke('quit-app');
    } catch {}
  },
  getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  restartAndInstallUpdate: () => ipcRenderer.invoke('restart-and-install-update'),
  onCheckingForUpdate: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('checking-for-update', handler);
    return () => ipcRenderer.removeListener('checking-for-update', handler);
  },
  onUpdateAvailable: (callback) => {
    const handler = (_e, info) => callback(info);
    ipcRenderer.on('update-available', handler);
    return () => ipcRenderer.removeListener('update-available', handler);
  },
  onUpdateNotAvailable: (callback) => {
    const handler = (_e, info) => callback(info);
    ipcRenderer.on('update-not-available', handler);
    return () => ipcRenderer.removeListener('update-not-available', handler);
  },
  onUpdateProgress: (callback) => {
    const handler = (_e, progress) => callback(progress);
    ipcRenderer.on('update-download-progress', handler);
    return () => ipcRenderer.removeListener('update-download-progress', handler);
  },
  onUpdateDownloaded: (callback) => {
    const handler = (_e, info) => callback(info);
    ipcRenderer.on('update-downloaded', handler);
    return () => ipcRenderer.removeListener('update-downloaded', handler);
  },
  onUpdateError: (callback) => {
    const handler = (_e, err) => callback(err);
    ipcRenderer.on('update-error', handler);
    return () => ipcRenderer.removeListener('update-error', handler);
  },
  getAppEdition: () => ipcRenderer.invoke('get-app-edition'),
  setAppEdition: (edition) => ipcRenderer.invoke('set-app-edition', edition),
  onAppEditionChanged: (callback) => {
    const handler = (_e, edition) => callback(edition);
    ipcRenderer.on('app-edition-changed', handler);
    return () => ipcRenderer.removeListener('app-edition-changed', handler);
  },
});
