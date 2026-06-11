const WINDOW_CHROME_PADDING = 16;
const NORMAL_HEIGHT = 190;
const FOCUS_HEIGHT = 230;
const RAIN_WINDOW_WIDTH = 148;
const RAIN_WINDOW_HEIGHT = 168;
const SETTINGS_WIDTH = 430;
const SETTINGS_HEIGHT = 570;

export function computeOverlayWindowSize(settings = {}, editMode = false) {
  const width = Number.isFinite(Number(settings.width)) ? Number(settings.width) : 820;
  const scale = Number.isFinite(Number(settings.scale)) ? Number(settings.scale) : 1;
  if (settings.preset === "rain") {
    return {
      width: Math.ceil(RAIN_WINDOW_WIDTH * scale),
      height: Math.ceil(RAIN_WINDOW_HEIGHT * scale),
    };
  }
  const height = settings.preset === "focus" ? FOCUS_HEIGHT : NORMAL_HEIGHT;

  return {
    width: Math.ceil((width + WINDOW_CHROME_PADDING) * scale),
    height: Math.ceil(height * scale),
  };
}

export function computeSettingsWindowSize() {
  return {
    width: SETTINGS_WIDTH,
    height: SETTINGS_HEIGHT,
  };
}
