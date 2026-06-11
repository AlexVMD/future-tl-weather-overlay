import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_OVERLAY_SETTINGS,
  buildOverlayViewModel,
  normalizeOverlaySettings,
} from "./overlay-model.js";

const sampleWeather = {
  generatedClock: "18:22:10",
  displayTimeZone: "Europe/Moscow",
  displayTimeZoneLabel: "МСК",
  current: {
    phase: "day",
    phaseLabel: "день",
    phaseRemainingMs: 47 * 60 * 1000,
    nextPhaseLabel: "ночь",
    nextPhaseAtLabel: "19:09",
    isRaining: false,
    rainRemainingMs: 12 * 60 * 1000 + 44 * 1000,
    rainCountdownLabel: "12:44",
    weatherLabel: "ясно",
  },
  timeline: [
    {
      startMs: 1000,
      endMs: 2500,
      durationMs: 1500,
      phase: "day",
      isRaining: false,
      startLabel: "17:22",
      endLabel: "17:55",
    },
    {
      startMs: 2500,
      endMs: 3900,
      durationMs: 1400,
      phase: "night",
      isRaining: false,
      startLabel: "17:55",
      endLabel: "18:25",
    },
    {
      startMs: 3900,
      endMs: 4300,
      durationMs: 400,
      phase: "day",
      isRaining: false,
      startLabel: "18:25",
      endLabel: "18:35",
    },
    {
      startMs: 4300,
      endMs: 4500,
      durationMs: 200,
      phase: "day",
      isRaining: true,
      startLabel: "18:35",
      endLabel: "18:50",
    },
    {
      startMs: 4500,
      endMs: 8200,
      durationMs: 3700,
      phase: "day",
      isRaining: false,
      startLabel: "18:50",
      endLabel: "20:22",
    },
  ],
  rainSlots: [
    {
      startMs: 4300,
      endMs: 4500,
      status: "next",
      label: "18:35 - 18:50",
    },
  ],
  nightSlots: [
    {
      startMs: 2500,
      endMs: 3900,
      status: "live",
      label: "17:55 - 18:25",
    },
  ],
};

test("normalizes overlay settings with readable bounds", () => {
  const settings = normalizeOverlaySettings({
    preset: "unknown",
    width: 300,
    opacity: 2,
    scale: 0.4,
    displayTimeZone: "Europe/Moscow",
  });

  assert.equal(settings.preset, DEFAULT_OVERLAY_SETTINGS.preset);
  assert.equal(settings.width, 520);
  assert.equal(settings.opacity, 1);
  assert.equal(settings.scale, 0.8);
  assert.equal(settings.displayTimeZone, "Europe/Moscow");
  assert.equal(settings.settingsShortcut, "Ctrl+Shift+W");
});

test("normalizes settings shortcut", () => {
  assert.equal(normalizeOverlaySettings({ settingsShortcut: "Alt+F8" }).settingsShortcut, "Alt+F8");
  assert.equal(normalizeOverlaySettings({ settingsShortcut: "W" }).settingsShortcut, "Ctrl+Shift+W");
});

test("wide preset keeps icons above readable time labels", () => {
  const model = buildOverlayViewModel(sampleWeather, {
    preset: "wide",
    width: 820,
  });

  assert.equal(model.preset, "wide");
  assert.equal(model.layout.iconPlacement, "above-label");
  assert.equal(model.segments[0].labelPlacement, "inside");
  assert.equal(model.segments[0].timeLabel, "17:22-17:55");
});

test("rain segments keep day and night phase context", () => {
  const model = buildOverlayViewModel({
    ...sampleWeather,
    timeline: [
      {
        startMs: 1000,
        endMs: 2000,
        durationMs: 1000,
        phase: "day",
        isRaining: true,
        startLabel: "18:00",
        endLabel: "18:15",
      },
      {
        startMs: 2000,
        endMs: 3000,
        durationMs: 1000,
        phase: "night",
        isRaining: true,
        startLabel: "18:15",
        endLabel: "18:30",
      },
    ],
  }, {
    preset: "compact",
    width: 620,
  });

  assert.equal(model.segments[0].kind, "rain-day");
  assert.equal(model.segments[1].kind, "rain-night");
});


test("wide preset moves labels from narrow segments into the event row", () => {
  const model = buildOverlayViewModel(sampleWeather, {
    preset: "wide",
    width: 620,
  });
  const rainSegment = model.segments.find((segment) => segment.isRaining);

  assert.equal(rainSegment.labelPlacement, "event-row");
  assert.equal(rainSegment.timeLabel, "");
  assert.ok(model.eventRows.some((event) => event.label === "Дождь 18:35-18:50"));
});

test("compact preset renders phase start markers with labels to the right", () => {
  const model = buildOverlayViewModel(sampleWeather, {
    preset: "compact",
    width: 980,
  });

  assert.equal(model.layout.showSegmentLabels, false);
  assert.deepEqual(model.boundaryLabels.map((tick) => tick.label), ["17:55", "18:25", "18:35", "18:50"]);
  assert.ok(model.boundaryLabels.every((tick) => Number.isFinite(tick.positionPercent)));
  assert.ok(model.boundaryLabels.every((tick) => tick.labelPlacement === "after-marker"));
});

test("compact preset hides dense future boundary text while keeping start markers", () => {
  const denseWeather = {
    ...sampleWeather,
    timeline: [
      { startMs: 0, endMs: 100, durationMs: 100, phase: "day", isRaining: false, startLabel: "21:30", endLabel: "21:35" },
      { startMs: 100, endMs: 200, durationMs: 100, phase: "day", isRaining: true, startLabel: "21:35", endLabel: "21:40" },
      { startMs: 200, endMs: 300, durationMs: 100, phase: "day", isRaining: false, startLabel: "21:40", endLabel: "21:45" },
      { startMs: 300, endMs: 400, durationMs: 100, phase: "day", isRaining: true, startLabel: "21:45", endLabel: "21:50" },
      { startMs: 400, endMs: 500, durationMs: 100, phase: "day", isRaining: false, startLabel: "21:50", endLabel: "21:55" },
      { startMs: 500, endMs: 600, durationMs: 100, phase: "day", isRaining: true, startLabel: "21:55", endLabel: "22:00" },
    ],
  };

  const model = buildOverlayViewModel(denseWeather, {
    preset: "compact",
    width: 520,
  });

  assert.equal(model.boundaryLabels.length, 5);
  assert.ok(model.boundaryLabels.some((tick) => !tick.showLabel));
  assert.ok(model.boundaryLabels.every((tick) => tick.showMarker));
});

test("compact preset hides the farthest label until there is room to the right", () => {
  const model = buildOverlayViewModel(sampleWeather, {
    preset: "compact",
    width: 520,
  });
  const farthest = model.boundaryLabels.at(-1);

  assert.equal(farthest.label, "18:50");
  assert.equal(farthest.showMarker, true);
  assert.equal(farthest.showLabel, false);
});

test("focus preset promotes the nearest future event", () => {
  const model = buildOverlayViewModel(sampleWeather, {
    preset: "focus",
    width: 640,
  });

  assert.equal(model.focusEvent.kind, "rain");
  assert.equal(model.focusEvent.title, "Дождь");
  assert.equal(model.focusEvent.timeLabel, "18:35-18:50");
  assert.equal(model.focusEvent.countdownLabel, "через 12:44");
  assert.deepEqual(model.detailRows.map((row) => row.label), ["Сейчас", "Дождь", "Фаза"]);
  assert.ok(model.detailRows.some((row) => row.value.includes("день")));
  assert.deepEqual(model.detailEvents.map((event) => event.label), [
    "Ночь 17:55-18:25",
    "День 18:25-18:35",
    "Дождь 18:35-18:50",
    "День 18:50-20:22",
  ]);
});

test("focus preset shows full nearest detail events on one line and adds more when wider", () => {
  const weather = {
    ...sampleWeather,
    timeline: [
      { startMs: 1000, endMs: 2000, durationMs: 1000, phase: "day", isRaining: false, startLabel: "20:00", endLabel: "20:15" },
      { startMs: 2000, endMs: 3000, durationMs: 1000, phase: "day", isRaining: true, startLabel: "20:15", endLabel: "20:30" },
      { startMs: 3000, endMs: 4000, durationMs: 1000, phase: "night", isRaining: false, startLabel: "20:30", endLabel: "21:00" },
      { startMs: 4000, endMs: 5000, durationMs: 1000, phase: "day", isRaining: false, startLabel: "21:00", endLabel: "21:15" },
      { startMs: 5000, endMs: 6000, durationMs: 1000, phase: "day", isRaining: true, startLabel: "21:15", endLabel: "21:30" },
      { startMs: 6000, endMs: 7000, durationMs: 1000, phase: "day", isRaining: false, startLabel: "21:30", endLabel: "21:45" },
    ],
  };

  const narrow = buildOverlayViewModel(weather, {
    preset: "focus",
    width: 520,
  });
  const wide = buildOverlayViewModel(weather, {
    preset: "focus",
    width: 980,
  });

  assert.equal(narrow.detailEvents.length, 3);
  assert.ok(wide.detailEvents.length > narrow.detailEvents.length);
  assert.equal(new Set(narrow.detailEvents.map((event) => event.row)).size, 1);
  assert.deepEqual(narrow.detailEvents.map((event) => event.label), [
    "Дождь 20:15-20:30",
    "Ночь 20:30-21:00",
    "День 21:00-21:15",
  ]);
  assert.ok(narrow.detailEvents.every((event) => !event.compactLabel));
});

test("rain preset summarizes the nearest future rain", () => {
  const model = buildOverlayViewModel(sampleWeather, {
    preset: "rain",
    width: 520,
  });

  assert.equal(model.preset, "rain");
  assert.deepEqual(model.rainSummary, {
    title: "Дождь",
    phaseLabel: "днём",
    icon: "rain-day",
    timeLabel: "18:35-18:50",
    countdownAction: "Начало через",
    countdownValue: "12:44",
  });
});

test("rain preset summarizes the active rain ending", () => {
  const model = buildOverlayViewModel({
    ...sampleWeather,
    current: {
      ...sampleWeather.current,
      phase: "night",
      phaseLabel: "ночь",
      isRaining: true,
      rainRemainingMs: 9 * 60 * 1000 + 15 * 1000,
      rainCountdownLabel: "09:15",
    },
    timeline: [
      {
        startMs: 1000,
        endMs: 2000,
        durationMs: 1000,
        phase: "night",
        isRaining: true,
        startLabel: "20:30",
        endLabel: "20:40",
      },
    ],
  }, {
    preset: "rain",
    width: 520,
  });

  assert.deepEqual(model.rainSummary, {
    title: "Дождь",
    phaseLabel: "ночью",
    icon: "rain-night",
    timeLabel: "20:30-20:40",
    countdownAction: "Закончится через",
    countdownValue: "09:15",
  });
});
