export const DEFAULT_SETTINGS_SHORTCUT = "Ctrl+Shift+W";
export const HIDE_OVERLAY_SHORTCUT = "Ctrl+Shift+H";

const MODIFIER_ORDER = ["Ctrl", "Shift", "Alt", "Command"];
const MODIFIER_ALIASES = new Map([
  ["control", "Ctrl"],
  ["ctrl", "Ctrl"],
  ["shift", "Shift"],
  ["alt", "Alt"],
  ["option", "Alt"],
  ["meta", "Command"],
  ["cmd", "Command"],
  ["command", "Command"],
  ["super", "Command"],
  ["commandorcontrol", "Ctrl"],
]);
const NAMED_KEYS = new Map([
  [" ", "Space"],
  ["spacebar", "Space"],
  ["esc", "Escape"],
  ["escape", "Escape"],
  ["del", "Delete"],
  ["delete", "Delete"],
  ["ins", "Insert"],
  ["insert", "Insert"],
  ["home", "Home"],
  ["end", "End"],
  ["pageup", "PageUp"],
  ["pagedown", "PageDown"],
  ["tab", "Tab"],
  ["backspace", "Backspace"],
  ["enter", "Enter"],
  ["return", "Enter"],
  ["arrowup", "Up"],
  ["arrowdown", "Down"],
  ["arrowleft", "Left"],
  ["arrowright", "Right"],
  ["up", "Up"],
  ["down", "Down"],
  ["left", "Left"],
  ["right", "Right"],
]);

function normalizeKey(key) {
  const raw = String(key || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (NAMED_KEYS.has(lower)) return NAMED_KEYS.get(lower);
  if (/^f([1-9]|1[0-9]|2[0-4])$/iu.test(raw)) return raw.toUpperCase();
  if (/^[a-zа-яё0-9]$/iu.test(raw)) return raw.toUpperCase();
  return "";
}

export function normalizeSettingsShortcut(value) {
  const parts = String(value || "")
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);
  const modifiers = new Set();
  let key = "";

  for (const part of parts) {
    const normalizedModifier = MODIFIER_ALIASES.get(part.toLowerCase());
    if (normalizedModifier) {
      modifiers.add(normalizedModifier);
    } else {
      key = normalizeKey(part);
    }
  }

  if (!key || modifiers.size === 0) return DEFAULT_SETTINGS_SHORTCUT;
  return [...MODIFIER_ORDER.filter((modifier) => modifiers.has(modifier)), key].join("+");
}

export function shortcutFromKeyboardEvent(event) {
  const key = normalizeKey(event.key);
  if (!key) return "";

  const modifiers = [];
  if (event.ctrlKey) modifiers.push("Ctrl");
  if (event.shiftKey) modifiers.push("Shift");
  if (event.altKey) modifiers.push("Alt");
  if (event.metaKey) modifiers.push("Command");
  if (!modifiers.length) return "";

  return [...modifiers, key].join("+");
}

export function formatShortcut(shortcut) {
  return normalizeSettingsShortcut(shortcut).replaceAll("+", " + ");
}
