import { DEFAULT_OVERLAY_SETTINGS, normalizeOverlaySettings } from "./overlay-model.js";

const nodes = {
  presetSelect: document.querySelector("#preset-select"),
  widthInput: document.querySelector("#width-input"),
  opacityInput: document.querySelector("#opacity-input"),
  scaleInput: document.querySelector("#scale-input"),
  updateVersion: document.querySelector("#update-version"),
  updateStatus: document.querySelector("#update-status"),
  updateCheckButton: document.querySelector("#update-check-button"),
  updateInstallButton: document.querySelector("#update-install-button"),
};

let settings = normalizeOverlaySettings(DEFAULT_OVERLAY_SETTINGS);

function applySettingsToDom() {
  nodes.presetSelect.value = settings.preset;
  nodes.widthInput.value = String(settings.width);
  nodes.opacityInput.value = String(Math.round(settings.opacity * 100));
  nodes.scaleInput.value = String(Math.round(settings.scale * 100));
}

async function saveSettings(nextSettings) {
  settings = normalizeOverlaySettings({ ...settings, ...nextSettings });
  applySettingsToDom();
  await window.futureOverlay?.setSettings(settings);
}

function bindControls() {
  nodes.presetSelect.addEventListener("change", () => saveSettings({ preset: nodes.presetSelect.value }));
  nodes.widthInput.addEventListener("input", () => saveSettings({ width: Number(nodes.widthInput.value) }));
  nodes.opacityInput.addEventListener("input", () => saveSettings({ opacity: Number(nodes.opacityInput.value) / 100 }));
  nodes.scaleInput.addEventListener("input", () => saveSettings({ scale: Number(nodes.scaleInput.value) / 100 }));
  nodes.updateCheckButton.addEventListener("click", () => window.futureOverlay?.checkForUpdates());
  nodes.updateInstallButton.addEventListener("click", () => window.futureOverlay?.installUpdate());

  document.querySelectorAll("[data-external-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      window.futureOverlay?.openExternal(link.href);
    });
  });
}

function renderUpdateStatus(status) {
  if (!status) return;
  const current = status.currentVersion ? `v${status.currentVersion}` : "v--";
  const latest = status.latestVersion ? `v${status.latestVersion}` : current;
  nodes.updateVersion.textContent = status.type === "available" ? `${current} → ${latest}` : current;
  nodes.updateInstallButton.hidden = status.type !== "available";
  nodes.updateCheckButton.disabled = status.type === "checking" || status.type === "downloading" || status.type === "installing";
  nodes.updateInstallButton.disabled = status.type === "downloading" || status.type === "installing";

  const messages = {
    idle: "Обновления будут проверены автоматически.",
    checking: "Проверяем GitHub Releases...",
    available: status.message || `Доступна новая версия ${latest}`,
    current: "Установлена последняя версия.",
    downloading: `Скачиваем обновление${status.percent ? `: ${status.percent}%` : "..."}`,
    installing: status.message || "Устанавливаем обновление и перезапускаем overlay...",
    error: status.message || "Не удалось проверить обновление.",
    "dev-disabled": status.message || "Автообновление доступно в установленной версии.",
  };
  nodes.updateStatus.textContent = messages[status.type] || status.message || "Состояние обновления неизвестно.";
}

async function init() {
  const stored = await window.futureOverlay?.getSettings();
  settings = normalizeOverlaySettings(stored || DEFAULT_OVERLAY_SETTINGS);
  applySettingsToDom();
  bindControls();
  renderUpdateStatus(await window.futureOverlay?.getUpdateStatus());
  window.futureOverlay?.checkForUpdates();
  window.futureOverlay?.onSettingsChanged((nextSettings) => {
    settings = normalizeOverlaySettings(nextSettings || DEFAULT_OVERLAY_SETTINGS);
    applySettingsToDom();
  });
  window.futureOverlay?.onUpdateStatusChanged(renderUpdateStatus);
}

init();
