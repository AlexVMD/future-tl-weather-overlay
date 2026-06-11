import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("futureOverlay", {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setSettings: (settings) => ipcRenderer.invoke("settings:set", settings),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  getEditMode: () => ipcRenderer.invoke("edit-mode:get"),
  onEditModeChanged: (callback) => {
    ipcRenderer.on("edit-mode-changed", (_event, value) => callback(Boolean(value)));
  },
  onSettingsChanged: (callback) => {
    ipcRenderer.on("settings-changed", (_event, settings) => callback(settings));
  },
});
