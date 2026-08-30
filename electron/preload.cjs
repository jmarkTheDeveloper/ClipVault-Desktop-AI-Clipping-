const { contextBridge, ipcRenderer } = require('electron');

// We expose a secure API to the window object for React to use
contextBridge.exposeInMainWorld('electronAPI', {
  getYoutubeInfo: (url) => ipcRenderer.invoke('get-youtube-info', url),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  selectDirectory: (defaultPath) => ipcRenderer.invoke('select-directory', defaultPath),
  openPath: (folderPath) => ipcRenderer.invoke('open-path', folderPath),
  showItemInFolder: (filePath) => ipcRenderer.invoke('show-item-in-folder', filePath),
  startDrag: (filePath) => ipcRenderer.send('start-drag', filePath),
  showNotification: (options) => ipcRenderer.invoke('show-notification', options),
});
