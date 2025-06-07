const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  pickFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  pickFile: (filters) => ipcRenderer.invoke('dialog:openFile', filters),
  createFolders: (basePath) => ipcRenderer.invoke('create-folders', basePath),
  extractArchive: (args) => ipcRenderer.invoke('extract-archive', args),
  downloadFirmware: (args) => ipcRenderer.invoke('firmware-download', args),
  downloadKeys: (args) => ipcRenderer.invoke('download-keys', args),
  downloadExtractedKeys: (folderPath) => ipcRenderer.invoke('download-extracted-keys', folderPath),
  downloadDynamic: (args) => ipcRenderer.invoke('download-dynamic', args),
  downloadEmulator: (args) => ipcRenderer.invoke('download-emulator', args),
});
