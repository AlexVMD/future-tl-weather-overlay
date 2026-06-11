import { app, BrowserWindow, Menu, globalShortcut, ipcMain, screen, shell } from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGameProcessMonitor, queryGameProcessRunning } from "./game-process-monitor.js";
import { DEFAULT_OVERLAY_SETTINGS, normalizeOverlaySettings } from "./overlay-model.js";
import { computeOverlayWindowSize, computeSettingsWindowSize } from "./window-metrics.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ICON_PATH = path.join(__dirname, "..", "favicon.ico");
const SETTINGS_FILE = "overlay-settings.json";

let overlayWindow = null;
let settingsWindow = null;
let editMode = false;
let isHidden = false;
let currentSettings = DEFAULT_OVERLAY_SETTINGS;
let gameProcessMonitor = null;

function settingsPath() {
  return path.join(app.getPath("userData"), SETTINGS_FILE);
}

function readSettings() {
  try {
    const raw = fs.readFileSync(settingsPath(), "utf8");
    return normalizeOverlaySettings(JSON.parse(raw));
  } catch {
    return DEFAULT_OVERLAY_SETTINGS;
  }
}

function writeSettings(settings) {
  currentSettings = normalizeOverlaySettings(settings);
  fs.mkdirSync(app.getPath("userData"), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(currentSettings, null, 2));
}

function resizeOverlayWindow() {
  if (!overlayWindow) return;
  const size = computeOverlayWindowSize(currentSettings, editMode);
  overlayWindow.setSize(size.width, size.height, false);
}

function broadcast(channel, value) {
  for (const window of [overlayWindow, settingsWindow]) {
    if (window && !window.isDestroyed()) {
      window.webContents.send(channel, value);
    }
  }
}

function applyMouseMode() {
  if (!overlayWindow) return;
  resizeOverlayWindow();
  overlayWindow.setIgnoreMouseEvents(!editMode, { forward: true });
  broadcast("edit-mode-changed", editMode);
}

function toggleEditMode() {
  editMode = !editMode;
  if (editMode) {
    showSettingsWindow();
  } else if (settingsWindow) {
    settingsWindow.hide();
  }
  applyMouseMode();
}

function toggleHidden() {
  if (!overlayWindow) return;
  isHidden = !isHidden;
  if (isHidden) {
    overlayWindow.hide();
  } else {
    overlayWindow.showInactive();
    overlayWindow.setAlwaysOnTop(true, "screen-saver");
  }
}

function createOverlayWindow() {
  const display = screen.getPrimaryDisplay();
  const workArea = display.workArea;
  currentSettings = readSettings();
  const size = computeOverlayWindowSize(currentSettings, editMode);

  overlayWindow = new BrowserWindow({
    width: size.width,
    height: size.height,
    x: workArea.x + 24,
    y: workArea.y + 24,
    frame: false,
    transparent: true,
    resizable: true,
    movable: true,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    title: "Future TL Overlay",
    icon: APP_ICON_PATH,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  overlayWindow.setAlwaysOnTop(true, "screen-saver");
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.loadFile(path.join(__dirname, "index.html"));
  applyMouseMode();
}

function createSettingsWindow() {
  const display = screen.getPrimaryDisplay();
  const workArea = display.workArea;
  const size = computeSettingsWindowSize();

  settingsWindow = new BrowserWindow({
    width: size.width,
    height: size.height,
    x: workArea.x + 48,
    y: workArea.y + 240,
    frame: true,
    transparent: false,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    skipTaskbar: false,
    title: "Future TL Overlay Settings",
    icon: APP_ICON_PATH,
    backgroundColor: "#08070c",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  settingsWindow.setMenuBarVisibility(false);
  settingsWindow.setAlwaysOnTop(true, "screen-saver");
  settingsWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  settingsWindow.loadFile(path.join(__dirname, "settings.html"));
  settingsWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      editMode = false;
      settingsWindow.hide();
      applyMouseMode();
    }
  });
  settingsWindow.hide();
}

function showSettingsWindow() {
  if (!settingsWindow || settingsWindow.isDestroyed()) createSettingsWindow();
  settingsWindow.setAlwaysOnTop(true, "screen-saver");
  settingsWindow.show();
  settingsWindow.focus();
  settingsWindow.webContents.send("settings-changed", currentSettings);
}

function startGameProcessMonitor() {
  gameProcessMonitor = createGameProcessMonitor({
    checkGameRunning: queryGameProcessRunning,
    onGameClosed: () => {
      app.isQuitting = true;
      app.quit();
    },
  });
  gameProcessMonitor.start();
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);

  ipcMain.handle("settings:get", () => readSettings());
  ipcMain.handle("settings:set", (_event, settings) => {
    writeSettings(settings);
    resizeOverlayWindow();
    broadcast("settings-changed", currentSettings);
    return true;
  });
  ipcMain.handle("open-external", (_event, url) => {
    if (typeof url === "string" && url.startsWith("https://futuretl.ru/")) {
      shell.openExternal(url);
    }
  });
  ipcMain.handle("edit-mode:get", () => editMode);

  createOverlayWindow();
  createSettingsWindow();

  globalShortcut.register("CommandOrControl+Shift+W", toggleEditMode);
  globalShortcut.register("CommandOrControl+Shift+H", toggleHidden);
  startGameProcessMonitor();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createOverlayWindow();
      createSettingsWindow();
    }
  });
});

app.on("will-quit", () => {
  app.isQuitting = true;
  gameProcessMonitor?.stop();
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
