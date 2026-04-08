import { contextBridge, ipcRenderer } from 'electron';

const UPDATE_STATUS_CHANNEL = 'updater:status';

contextBridge.exposeInMainWorld('synchoDesktop', {
  isDesktop: true,
  versions: {
    chrome: process.versions.chrome,
    node: process.versions.node,
    electron: process.versions.electron
  },
  ping: () => 'pong',
  updates: {
    checkNow: () => ipcRenderer.send('updater:check-now'),
    installNow: () => ipcRenderer.send('updater:install-now'),
    onStatus: (listener) => {
      const handler = (_event, data) => listener(data);
      ipcRenderer.on(UPDATE_STATUS_CHANNEL, handler);
      return () => ipcRenderer.removeListener(UPDATE_STATUS_CHANNEL, handler);
    }
  },
  ipc: {
    send: (channel, payload) => ipcRenderer.send(channel, payload),
    on: (channel, listener) => {
      const handler = (_event, data) => listener(data);
      ipcRenderer.on(channel, handler);
      return () => ipcRenderer.removeListener(channel, handler);
    }
  }
});
