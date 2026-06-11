import assert from "node:assert/strict";
import test from "node:test";

import { computeOverlayWindowSize, computeSettingsWindowSize } from "./window-metrics.js";

test("normal mode window follows overlay width and scale", () => {
  assert.deepEqual(
    computeOverlayWindowSize({ width: 620, scale: 1 }, false),
    { width: 636, height: 190 },
  );
});

test("edit mode keeps overlay window size independent from settings", () => {
  assert.deepEqual(
    computeOverlayWindowSize({ width: 620, scale: 1 }, true),
    { width: 636, height: 190 },
  );
});

test("window size accounts for overlay scale", () => {
  assert.deepEqual(
    computeOverlayWindowSize({ width: 820, scale: 1.25 }, true),
    { width: 1045, height: 238 },
  );
});

test("focus preset reserves extra height for detailed content", () => {
  assert.deepEqual(
    computeOverlayWindowSize({ preset: "focus", width: 980, scale: 1.25 }, true),
    { width: 1245, height: 288 },
  );
});

test("rain preset uses a compact tall overlay window", () => {
  assert.deepEqual(
    computeOverlayWindowSize({ preset: "rain", width: 820, scale: 1 }, false),
    { width: 148, height: 168 },
  );
});

test("settings window has its own stable size", () => {
  assert.deepEqual(
    computeSettingsWindowSize(),
    { width: 430, height: 500 },
  );
});
