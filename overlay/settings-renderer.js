import { DEFAULT_OVERLAY_SETTINGS, normalizeOverlaySettings } from "./overlay-model.js";

const nodes = {
  presetSelect: document.querySelector("#preset-select"),
  widthInput: document.querySelector("#width-input"),
  opacityInput: document.querySelector("#opacity-input"),
  scaleInput: document.querySelector("#scale-input"),
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

  document.querySelectorAll("[data-external-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      window.futureOverlay?.openExternal(link.href);
    });
  });
}

async function init() {
  const stored = await window.futureOverlay?.getSettings();
  settings = normalizeOverlaySettings(stored || DEFAULT_OVERLAY_SETTINGS);
  applySettingsToDom();
  bindControls();
  window.futureOverlay?.onSettingsChanged((nextSettings) => {
    settings = normalizeOverlaySettings(nextSettings || DEFAULT_OVERLAY_SETTINGS);
    applySettingsToDom();
  });
}

init();
