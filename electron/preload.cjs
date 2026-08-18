const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  print: (options) => ipcRenderer.invoke('print-window', options),
  printToPDF: (options) => ipcRenderer.invoke('print-to-pdf', options),
  savePDF: (defaultName) => ipcRenderer.invoke('save-pdf', defaultName),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  platform: process.platform,
});
