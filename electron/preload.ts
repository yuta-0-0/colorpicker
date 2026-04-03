import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  startScreenPicker: () => ipcRenderer.invoke('screen-picker:start'),
  platform: process.platform,
})
