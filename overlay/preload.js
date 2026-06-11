import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("futureOverlay", {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setSettings: (settings) => ipcRenderer.invoke("settings:set", settings),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  quitOverlay: () => ipcRenderer.invoke("overlay:quit"),
  getEditMode: () => ipcRenderer.invoke("edit-mode:get"),
  getUpdateStatus: () => ipcRenderer.invoke("update:get-status"),
  checkForUpdates: () => ipcRenderer.invoke("update:check"),
  installUpdate: () => ipcRenderer.invoke("update:install"),
  onEditModeChanged: (callback) => {
    ipcRenderer.on("edit-mode-changed", (_event, value) => callback(Boolean(value)));
  },
  onSettingsChanged: (callback) => {
    ipcRenderer.on("settings-changed", (_event, settings) => callback(settings));
  },
  onUpdateStatusChanged: (callback) => {
    ipcRenderer.on("update-status-changed", (_event, status) => callback(status));
  },
});
