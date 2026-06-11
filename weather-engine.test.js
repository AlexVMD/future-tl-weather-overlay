import test from "node:test";
import assert from "node:assert/strict";

import {
  computeWeather,
  DAY_MS,
  NIGHT_MS,
  RAIN_ANCHOR_MS,
  formatCompactDuration,
  formatDuration,
  getDueNotifications,
} from "./weather-engine.js";

test("computes day and night phases from the Moscow server cycle", () => {
  const day = computeWeather({
    nowMs: NIGHT_MS,
    displayTimeZone: "Europe/Moscow",
  });
  const night = computeWeather({
    nowMs: 0,
    displayTimeZone: "Europe/Moscow",
  });

  assert.equal(day.current.phase, "day");
  assert.equal(day.current.nextPhase, "night");
  assert.equal(night.current.phase, "night");
  assert.equal(night.current.nextPhase, "day");
  assert.equal(night.current.phaseRemainingMs, NIGHT_MS);
});

test("marks rain during a rain segment and reports the next clear/rain change", () => {
  const raining = computeWeather({
    nowMs: RAIN_ANCHOR_MS + 30 * 60 * 1000 + 1,
    displayTimeZone: "Europe/Moscow",
  });
  const clear = computeWeather({
    nowMs: RAIN_ANCHOR_MS + 45 * 60 * 1000 + 1,
    displayTimeZone: "Europe/Moscow",
  });

  assert.equal(raining.current.isRaining, true);
  assert.equal(raining.current.weatherLabel, "дождь");
  assert.equal(clear.current.isRaining, false);
  assert.equal(clear.current.weatherLabel, "ясно");
  assert.ok(clear.current.rainRemainingMs > 0);
});

test("returns only current and future rain slots for the selected horizon", () => {
  const data = computeWeather({
    nowMs: RAIN_ANCHOR_MS + 45 * 60 * 1000 + 1,
    displayTimeZone: "Europe/Moscow",
    horizonHours: 2,
  });

  assert.ok(data.rainSlots.length > 0);
  assert.ok(data.rainSlots.every((slot) => slot.endMs > data.nowMs));
  assert.ok(data.rainSlots.every((slot) => slot.startMs < data.nowMs + 2 * 60 * 60 * 1000));
  assert.equal(data.rainSlots[0].status, "next");
});

test("formats schedule labels in the visitor time zone", () => {
  const data = computeWeather({
    nowMs: Date.UTC(2026, 5, 6, 20, 0, 0),
    displayTimeZone: "Asia/Vladivostok",
    horizonHours: 4,
  });

  assert.equal(data.displayTimeZone, "Asia/Vladivostok");
  assert.equal(data.displayTimeZoneLabel, "Владивосток");
  assert.match(data.generatedClock, /^\d{2}:\d{2}:\d{2}$/);
  assert.ok(data.nightSlots.every((slot) => slot.label.includes("–")));
});

test("accepts non-Russian visitor time zones", () => {
  const data = computeWeather({
    nowMs: Date.UTC(2026, 5, 6, 20, 0, 0),
    displayTimeZone: "Europe/Paris",
    horizonHours: 2,
  });

  const fallback = computeWeather({
    nowMs: Date.UTC(2026, 5, 6, 20, 0, 0),
    displayTimeZone: "bad/time-zone",
    horizonHours: 2,
  });

  assert.equal(data.displayTimeZone, "Europe/Paris");
  assert.equal(data.displayTimeZoneLabel, "Europe/Paris");
  assert.equal(data.generatedClock, "22:00:00");
  assert.equal(fallback.displayTimeZone, "Europe/Moscow");
});

test("formats durations with seconds for live timers", () => {
  assert.equal(formatDuration(90 * 1000 + 12 * 1000), "1 мин 42 сек");
  assert.equal(formatDuration(2 * 60 * 60 * 1000 + 5 * 60 * 1000 + 9 * 1000), "2 ч 5 мин 9 сек");
});

test("formats compact durations for large timer cards", () => {
  assert.equal(formatCompactDuration(90 * 1000 + 12 * 1000), "01:42");
  assert.equal(formatCompactDuration(2 * 60 * 60 * 1000 + 5 * 60 * 1000 + 9 * 1000), "2:05:09");
});

test("uses compact duration in current weather subtitle", () => {
  const data = computeWeather({
    nowMs: RAIN_ANCHOR_MS + 45 * 60 * 1000 + 1,
    displayTimeZone: "Europe/Moscow",
  });

  assert.match(data.current.rainCountdownLabel, /^\d+:\d{2}:\d{2}$|^\d{2}:\d{2}$/);
  assert.doesNotMatch(data.current.rainCountdownLabel, /ч|мин|сек/);
});

test("detects upcoming start and end notifications five minutes before event", () => {
  const eventStartMs = Date.UTC(2026, 5, 6, 20, 45, 0);
  const eventEndMs = eventStartMs + 15 * 60 * 1000;
  const due = getDueNotifications({
    nowMs: eventStartMs - 5 * 60 * 1000,
    rainSlots: [{ startMs: eventStartMs, endMs: eventEndMs, label: "23:45 – 00:00" }],
    nightSlots: [],
  });
  const dueEnd = getDueNotifications({
    nowMs: eventEndMs - 5 * 60 * 1000,
    rainSlots: [{ startMs: eventStartMs, endMs: eventEndMs, label: "23:45 – 00:00" }],
    nightSlots: [],
  });

  assert.equal(due.length, 1);
  assert.equal(due[0].type, "rain");
  assert.equal(due[0].kind, "start");
  assert.equal(due[0].soundKey, "rain");
  assert.equal(due[0].title, "Скоро начнётся дождь");
  assert.equal(due[0].id, `rain-start-${eventStartMs}`);
  assert.equal(dueEnd.length, 1);
  assert.equal(dueEnd[0].kind, "end");
  assert.equal(dueEnd[0].soundKey, null);
  assert.equal(dueEnd[0].title, "Скоро закончится дождь");
  assert.equal(dueEnd[0].id, `rain-end-${eventEndMs}`);
});

test("detects night start and end notifications", () => {
  const eventStartMs = Date.UTC(2026, 5, 6, 22, 30, 0);
  const eventEndMs = eventStartMs + 30 * 60 * 1000;
  const dueStart = getDueNotifications({
    nowMs: eventStartMs - 5 * 60 * 1000,
    rainSlots: [],
    nightSlots: [{ startMs: eventStartMs, endMs: eventEndMs, label: "01:30 – 02:00" }],
  });
  const dueEnd = getDueNotifications({
    nowMs: eventEndMs - 5 * 60 * 1000,
    rainSlots: [],
    nightSlots: [{ startMs: eventStartMs, endMs: eventEndMs, label: "01:30 – 02:00" }],
  });

  assert.equal(dueStart[0].title, "Скоро начнётся ночь");
  assert.equal(dueStart[0].soundKey, "night");
  assert.equal(dueStart[0].body, "Ночь начнётся через 5 минут: 01:30 – 02:00");
  assert.equal(dueEnd[0].title, "Скоро закончится ночь");
  assert.equal(dueEnd[0].soundKey, "day");
  assert.equal(dueEnd[0].body, "Ночь закончится через 5 минут: 01:30 – 02:00");
});

test("does not report notifications outside the lead window", () => {
  const eventStartMs = Date.UTC(2026, 5, 6, 20, 45, 0);
  const tooEarly = getDueNotifications({
    nowMs: eventStartMs - 6 * 60 * 1000,
    rainSlots: [{ startMs: eventStartMs, endMs: eventStartMs + 15 * 60 * 1000, label: "23:45 – 00:00" }],
    nightSlots: [],
  });
  const tooLate = getDueNotifications({
    nowMs: eventStartMs - 4 * 60 * 1000,
    rainSlots: [{ startMs: eventStartMs, endMs: eventStartMs + 15 * 60 * 1000, label: "23:45 – 00:00" }],
    nightSlots: [],
  });

  assert.equal(tooEarly.length, 0);
  assert.equal(tooLate.length, 0);
});
