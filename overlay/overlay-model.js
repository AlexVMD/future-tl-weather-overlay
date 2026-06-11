const PRESETS = new Set(["wide", "compact", "focus", "rain"]);
const MIN_WIDTH = 520;
const MAX_WIDTH = 980;
const MIN_SCALE = 0.8;
const MAX_SCALE = 1.25;
const MIN_OPACITY = 0.35;
const MAX_OPACITY = 1;
const MIN_INSIDE_LABEL_WIDTH = 86;
const MIN_BOUNDARY_LABEL_GAP_PX = 90;
const BOUNDARY_LABEL_WIDTH_PX = 36;
const DETAIL_EVENT_MIN_COUNT = 3;

export const DEFAULT_OVERLAY_SETTINGS = {
  preset: "wide",
  width: 820,
  opacity: 0.92,
  scale: 1,
  displayTimeZone: "",
};

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function compactWindowLabel(label) {
  return String(label || "").replace(/\s*[–-]\s*/u, "-");
}

function segmentKind(segment) {
  if (segment.isRaining) return segment.phase === "night" ? "rain-night" : "rain-day";
  return segment.phase === "night" ? "night" : "day";
}

function segmentTitle(segment) {
  const kind = segmentKind(segment);
  if (kind === "rain-day" || kind === "rain-night") return "Дождь";
  if (kind === "night") return "Ночь";
  return "День";
}

function segmentIcon(segment) {
  const kind = segmentKind(segment);
  if (kind === "rain-day" || kind === "rain-night") return "rain";
  if (kind === "night") return "night";
  return "day";
}

function normalizeNumber(value, fallback, min, max) {
  const number = Number(value);
  return clamp(Number.isFinite(number) ? number : fallback, min, max);
}

export function normalizeOverlaySettings(settings = {}) {
  const preset = PRESETS.has(settings.preset) ? settings.preset : DEFAULT_OVERLAY_SETTINGS.preset;

  return {
    preset,
    width: normalizeNumber(settings.width, DEFAULT_OVERLAY_SETTINGS.width, MIN_WIDTH, MAX_WIDTH),
    opacity: normalizeNumber(settings.opacity, DEFAULT_OVERLAY_SETTINGS.opacity, MIN_OPACITY, MAX_OPACITY),
    scale: normalizeNumber(settings.scale, DEFAULT_OVERLAY_SETTINGS.scale, MIN_SCALE, MAX_SCALE),
    displayTimeZone: typeof settings.displayTimeZone === "string" ? settings.displayTimeZone : "",
  };
}

function buildSegments(weather, settings, layout) {
  const totalDuration = weather.timeline.reduce((sum, segment) => sum + segment.durationMs, 0) || 1;
  const availableWidth = settings.width - layout.horizontalPadding;

  return weather.timeline.map((segment) => {
    const widthPx = Math.max(layout.minSegmentWidth, Math.round((segment.durationMs / totalDuration) * availableWidth));
    const canShowInside = layout.showSegmentLabels && widthPx >= MIN_INSIDE_LABEL_WIDTH;
    const timeLabel = compactWindowLabel(`${segment.startLabel}-${segment.endLabel}`);

    return {
      key: `${segment.startMs}-${segment.endMs}-${segment.phase}-${segment.isRaining ? "rain" : "clear"}`,
      kind: segmentKind(segment),
      title: segmentTitle(segment),
      icon: segmentIcon(segment),
      phase: segment.phase,
      isRaining: segment.isRaining,
      startLabel: segment.startLabel,
      endLabel: segment.endLabel,
      widthPx,
      grow: segment.durationMs,
      timeLabel: canShowInside ? timeLabel : "",
      fullTimeLabel: timeLabel,
      labelPlacement: canShowInside ? "inside" : "event-row",
    };
  });
}

function eventLabelFromSlot(kind, slot) {
  const title = kind === "rain" ? "Дождь" : "Ночь";
  return `${title} ${compactWindowLabel(slot.label)}`;
}

function buildEventRows(weather, segments, preset) {
  const rows = [
    ...weather.nightSlots.slice(0, 2).map((slot) => ({
      kind: "night",
      row: "events",
      label: eventLabelFromSlot("night", slot),
      status: slot.status,
      startMs: slot.startMs,
      endMs: slot.endMs,
    })),
    ...weather.rainSlots.slice(0, 3).map((slot) => ({
      kind: "rain",
      row: "events",
      label: eventLabelFromSlot("rain", slot),
      status: slot.status,
      startMs: slot.startMs,
      endMs: slot.endMs,
    })),
  ];

  if (preset !== "wide") return rows;

  const overflowSegments = segments
    .filter((segment) => segment.labelPlacement === "event-row" && segment.kind !== "day")
    .map((segment) => ({
      kind: segment.kind,
      row: "events",
      label: `${segment.title} ${segment.fullTimeLabel}`,
      status: "timeline",
      startMs: 0,
      endMs: 0,
    }));

  const seen = new Set();
  return [...overflowSegments, ...rows].filter((event) => {
    const key = `${event.kind}-${event.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildTickLabels(weather) {
  const first = weather.timeline[0];
  const last = weather.timeline.at(-1);
  const middleLabel = first && last ? midpointClockLabel(first.startLabel, last.endLabel) : "";

  return [
    first && { label: first.startLabel, position: "start" },
    middleLabel && { label: middleLabel, position: "middle" },
    last && { label: last.endLabel, position: "end" },
  ].filter(Boolean);
}

function buildBoundaryLabels(weather, settings) {
  const first = weather.timeline[0];
  const last = weather.timeline.at(-1);
  if (!first || !last) return [];

  const totalDuration = weather.timeline.reduce((sum, segment) => sum + segment.durationMs, 0) || 1;
  const labelGapPercent = (MIN_BOUNDARY_LABEL_GAP_PX / settings.width) * 100;
  const rightEdgeLabelPercent = (BOUNDARY_LABEL_WIDTH_PX / settings.width) * 100;
  let lastVisibleLabelPercent = -Infinity;
  let elapsed = 0;

  return weather.timeline.flatMap((segment, index) => {
    const currentElapsed = elapsed;
    elapsed += segment.durationMs;
    if (index === 0) return [];

    const positionPercent = (currentElapsed / totalDuration) * 100;
    const hasRoomAfterMarker = positionPercent <= 100 - rightEdgeLabelPercent;
    const hasGapFromPreviousLabel = positionPercent - lastVisibleLabelPercent >= labelGapPercent;
    const showLabel = hasRoomAfterMarker && hasGapFromPreviousLabel;
    if (showLabel) lastVisibleLabelPercent = positionPercent;

    return [{
      label: segment.startLabel,
      positionPercent,
      labelPlacement: "after-marker",
      showLabel,
      showMarker: true,
    }];
  });
}

function midpointClockLabel(startLabel, endLabel) {
  const start = minutesFromClock(startLabel);
  let end = minutesFromClock(endLabel);
  if (start === null || end === null) return "";
  if (end < start) end += 24 * 60;

  const middle = Math.round((start + end) / 2) % (24 * 60);
  const hours = String(Math.floor(middle / 60)).padStart(2, "0");
  const minutes = String(middle % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function minutesFromClock(label) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(label || ""));
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function buildFocusEvent(weather) {
  const events = [
    ...weather.rainSlots.map((slot) => ({
      kind: "rain",
      title: "Дождь",
      timeLabel: compactWindowLabel(slot.label),
      countdownLabel: weather.current.isRaining ? `закончится через ${weather.current.rainCountdownLabel}` : `через ${weather.current.rainCountdownLabel}`,
      status: slot.status,
      startMs: slot.startMs,
    })),
    ...weather.nightSlots.map((slot) => ({
      kind: "night",
      title: "Ночь",
      timeLabel: compactWindowLabel(slot.label),
      countdownLabel: weather.current.phase === "night" ? `закончится через ${weather.current.phaseRemainingMs}` : `${weather.current.nextPhaseLabel} в ${weather.current.nextPhaseAtLabel}`,
      status: slot.status,
      startMs: slot.startMs,
    })),
  ].sort((a, b) => {
    const rank = (event) => event.status === "next" ? 0 : event.status === "live" ? 1 : 2;
    return rank(a) - rank(b) || a.startMs - b.startMs;
  });

  return events[0] || {
    kind: weather.current.isRaining ? "rain" : weather.current.phase,
    title: weather.current.isRaining ? "Дождь" : weather.current.phaseLabel,
    timeLabel: weather.generatedClock,
    countdownLabel: weather.current.isRaining ? `закончится через ${weather.current.rainCountdownLabel}` : `${weather.current.nextPhaseLabel} в ${weather.current.nextPhaseAtLabel}`,
    status: "current",
  };
}

function buildDetailRows(weather) {
  return [
    {
      label: "Сейчас",
      value: `${weather.current.phaseLabel} · ${weather.current.weatherLabel}`,
    },
    {
      label: "Дождь",
      value: `${weather.current.isRaining ? "закончится через" : "начнётся через"} ${weather.current.rainCountdownLabel}`,
    },
    {
      label: "Фаза",
      value: `${weather.current.nextPhaseLabel} в ${weather.current.nextPhaseAtLabel}`,
    },
  ];
}

function rainPhaseLabel(segment) {
  return segment?.phase === "night" ? "ночью" : "днём";
}

function rainIcon(segment) {
  return segment?.phase === "night" ? "rain-night" : "rain-day";
}

function buildRainSummary(weather) {
  const rainSegment = weather.timeline.find((segment) => segment.isRaining);
  if (!rainSegment) {
    return {
      title: "Дождь",
      phaseLabel: "ожидается",
      icon: "rain-day",
      timeLabel: "нет в окне",
      countdownAction: "Начало через",
      countdownValue: weather.current.rainCountdownLabel,
    };
  }

  return {
    title: "Дождь",
    phaseLabel: rainPhaseLabel(rainSegment),
    icon: rainIcon(rainSegment),
    timeLabel: compactWindowLabel(`${rainSegment.startLabel}-${rainSegment.endLabel}`),
    countdownAction: weather.current.isRaining ? "Закончится через" : "Начало через",
    countdownValue: weather.current.rainCountdownLabel,
  };
}

function buildTimelineDetailEvents(weather, settings) {
  const maxCount = settings.width < 620
    ? 3
    : settings.width < 780
      ? 4
      : settings.width < 900
        ? 5
        : 6;

  return weather.timeline
    .slice(1)
    .slice(0, Math.max(DETAIL_EVENT_MIN_COUNT, maxCount))
    .map((segment) => {
      const title = segmentTitle(segment);
      return {
        kind: segmentKind(segment),
        label: `${title} ${compactWindowLabel(`${segment.startLabel}-${segment.endLabel}`)}`,
        visible: true,
      };
    });
}

function layoutForPreset(preset) {
  if (preset === "compact") {
    return {
      iconPlacement: "center",
      showSegmentLabels: false,
      minSegmentWidth: 28,
      horizontalPadding: 24,
    };
  }

  if (preset === "focus") {
    return {
      iconPlacement: "center",
      showSegmentLabels: false,
      minSegmentWidth: 30,
      horizontalPadding: 230,
    };
  }

  return {
    iconPlacement: "above-label",
    showSegmentLabels: true,
    minSegmentWidth: 42,
    horizontalPadding: 24,
  };
}

export function buildOverlayViewModel(weather, rawSettings = {}) {
  const settings = normalizeOverlaySettings(rawSettings);
  const layout = layoutForPreset(settings.preset);
  const segments = buildSegments(weather, settings, layout);
  const eventRows = buildEventRows(weather, segments, settings.preset);

  return {
    preset: settings.preset,
    settings,
    layout,
    current: {
      title: `${weather.current.phaseLabel} · ${weather.current.weatherLabel}`,
      clock: weather.generatedClock,
      rainCaption: weather.current.isRaining ? "дождь закончится через" : "дождь начнётся через",
      rainCountdown: weather.current.rainCountdownLabel,
      phaseCaption: `${weather.current.nextPhaseLabel} в ${weather.current.nextPhaseAtLabel}`,
      phaseCountdownMs: weather.current.phaseRemainingMs,
      displayTimeZoneLabel: weather.displayTimeZoneLabel,
    },
    segments,
    tickLabels: buildTickLabels(weather),
    boundaryLabels: buildBoundaryLabels(weather, settings),
    eventRows,
    focusEvent: buildFocusEvent(weather),
    detailRows: buildDetailRows(weather),
    detailEvents: buildTimelineDetailEvents(weather, settings),
    rainSummary: buildRainSummary(weather),
  };
}
