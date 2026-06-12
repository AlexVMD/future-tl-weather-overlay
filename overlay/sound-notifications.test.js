import assert from "node:assert/strict";
import test from "node:test";

import { createSoundNotificationTracker } from "./sound-notifications.js";

const MINUTE = 60 * 1000;

function weatherAt(nowMs) {
  const rainStartMs = 10 * MINUTE;
  const rainEndMs = 25 * MINUTE;
  const nightStartMs = 40 * MINUTE;
  const nightEndMs = 70 * MINUTE;

  return {
    nowMs,
    rainSlots: [{
      startMs: rainStartMs,
      endMs: rainEndMs,
      label: "20:10 - 20:25",
    }],
    nightSlots: [{
      startMs: nightStartMs,
      endMs: nightEndMs,
      label: "20:40 - 21:10",
    }],
  };
}

test("returns the same audible events as the website notification logic", () => {
  const tracker = createSoundNotificationTracker({ initialCheckedAtMs: 0 });

  assert.deepEqual(
    tracker.collect(weatherAt(5 * MINUTE)).map((event) => event.soundKey),
    ["rain"],
  );
  assert.deepEqual(
    tracker.collect(weatherAt(20 * MINUTE)).map((event) => event.soundKey),
    [],
  );
  assert.deepEqual(
    tracker.collect(weatherAt(35 * MINUTE)).map((event) => event.soundKey),
    ["night"],
  );
  assert.deepEqual(
    tracker.collect(weatherAt(65 * MINUTE)).map((event) => event.soundKey),
    ["day"],
  );
});

test("does not return the same notification twice", () => {
  const tracker = createSoundNotificationTracker({ initialCheckedAtMs: 0 });
  const weather = weatherAt(5 * MINUTE);

  assert.equal(tracker.collect(weather).length, 1);
  assert.equal(tracker.collect(weather).length, 0);
});

test("advancing while muted prevents catch-up playback after enabling sound", () => {
  const tracker = createSoundNotificationTracker({ initialCheckedAtMs: 0 });

  tracker.collect(weatherAt(5 * MINUTE));

  assert.equal(tracker.collect(weatherAt(6 * MINUTE)).length, 0);
});
