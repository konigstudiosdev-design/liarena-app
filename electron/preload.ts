import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other apts you need here.
  // ...
  update: {
    checkForUpdates: () => ipcRenderer.send('check-for-updates'),
    startDownload: () => ipcRenderer.send('start-download'),
    quitAndInstall: () => ipcRenderer.send('quit-and-install'),
    setProcedureActive: (active: boolean) => ipcRenderer.send('set-procedure-active', active),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    onStatusChange: (callback: (status: any) => void) => {
      const listener = (_: any, data: any) => callback(data)
      ipcRenderer.on('update-status', listener)
      return () => ipcRenderer.off('update-status', listener)
    }
  }
})
