import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_SETTINGS_SHORTCUT,
  formatShortcut,
  normalizeSettingsShortcut,
  shortcutFromKeyboardEvent,
} from "./shortcut-utils.js";

test("normalizes user shortcut settings", () => {
  assert.equal(normalizeSettingsShortcut("Shift+Ctrl+w"), "Ctrl+Shift+W");
  assert.equal(normalizeSettingsShortcut("alt+f8"), "Alt+F8");
  assert.equal(normalizeSettingsShortcut(""), DEFAULT_SETTINGS_SHORTCUT);
  assert.equal(normalizeSettingsShortcut("W"), DEFAULT_SETTINGS_SHORTCUT);
});

test("builds shortcut from keyboard event", () => {
  assert.equal(shortcutFromKeyboardEvent({ key: "w", ctrlKey: true, shiftKey: true }), "Ctrl+Shift+W");
  assert.equal(shortcutFromKeyboardEvent({ key: "F8", altKey: true }), "Alt+F8");
  assert.equal(shortcutFromKeyboardEvent({ key: "w" }), "");
});

test("formats shortcut for settings UI", () => {
  assert.equal(formatShortcut("ctrl+shift+w"), "Ctrl + Shift + W");
});
