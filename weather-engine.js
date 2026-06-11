export const RAIN_ANCHOR_MS = 1727685900000;

const RAIN_WEATHER = [
  [0, 1800000], [1800000, 2700000], [2700000, 3600000], [3600000, 4500000],
  [4500000, 7200000], [7200000, 8100000], [8100000, 10800000], [10800000, 11700000],
  [11700000, 16200000], [16200000, 17100000], [17100000, 21600000], [21600000, 22500000],
  [22500000, 23400000], [23400000, 24300000], [24300000, 25200000], [25200000, 26100000],
  [26100000, 30600000], [30600000, 31500000], [31500000, 34200000], [34200000, 35100000],
  [35100000, 36000000], [36000000, 36900000], [36900000, 39600000], [39600000, 40500000],
  [40500000, 41400000], [41400000, 42300000], [42300000, 46800000], [46800000, 47700000],
  [47700000, 48600000], [48600000, 49500000], [49500000, 52200000], [52200000, 53100000],
  [53100000, 55800000], [55800000, 56700000], [56700000, 57600000], [57600000, 58500000],
  [58500000, 59400000], [59400000, 60300000], [60300000, 66600000], [66600000, 67500000],
  [67500000, 70200000], [70200000, 71100000], [71100000, 77400000], [77400000, 78300000],
  [78300000, 81000000], [81000000, 81900000], [81900000, 82800000], [82800000, 83700000],
  [83700000, 90000000], [90000000, 90900000], [90900000, 95400000], [95400000, 96300000],
  [96300000, 99000000], [99000000, 99900000], [99900000, 102600000], [102600000, 103500000],
  [103500000, 111600000], [111600000, 112500000], [112500000, 113400000], [113400000, 114300000],
  [114300000, 115200000], [115200000, 116100000], [116100000, 131400000], [131400000, 132300000],
  [132300000, 135000000], [135000000, 135900000], [135900000, 136800000], [136800000, 137700000],
  [137700000, 142200000], [142200000, 143100000], [143100000, 156600000], [156600000, 157500000],
  [157500000, 158400000], [158400000, 159300000], [159300000, 167400000], [167400000, 168300000],
  [168300000, 169200000], [169200000, 170100000], [170100000, 172800000], [172800000, 173700000],
  [173700000, 180000000], [180000000, 180900000], [180900000, 181800000], [181800000, 182700000],
  [182700000, 185400000], [185400000, 186300000], [186300000, 198000000], [198000000, 198900000],
  [198900000, 199800000], [199800000, 200700000], [200700000, 210600000], [210600000, 211500000],
  [211500000, 217800000], [217800000, 218700000], [218700000, 221400000], [221400000, 222300000],
  [222300000, 223200000], [223200000, 224100000], [224100000, 228600000], [228600000, 229500000],
  [229500000, 230400000], [230400000, 231300000], [231300000, 232200000], [232200000, 233100000],
  [233100000, 235800000], [235800000, 236700000], [236700000, 239400000], [239400000, 240300000],
  [240300000, 241200000], [241200000, 242100000], [242100000, 244800000], [244800000, 245700000],
  [245700000, 250200000], [250200000, 251100000], [251100000, 255600000], [255600000, 256500000],
  [256500000, 261000000], [261000000, 261900000], [261900000, 266400000], [266400000, 267300000],
  [267300000, 270000000],
];

export const DAY_MS = 7200000;
export const NIGHT_MS = 1800000;
export const SERVER_TIME_ZONE = "Europe/Moscow";

const DN_OFFSET_MS = DAY_MS;
const CYCLE_DN_MS = DAY_MS + NIGHT_MS;
const RAIN_SEGMENTS = RAIN_WEATHER.map(([startMs, endMs], index) => ({
  isRaining: index % 2 === 1,
  startMs,
  endMs,
}));
const RAIN_CYCLE_MS = RAIN_WEATHER.at(-1)[1];

const RU_TIME_ZONES = [
  "Europe/Moscow",
  "Europe/Kaliningrad",
  "Europe/Samara",
  "Asia/Yekaterinburg",
  "Asia/Omsk",
  "Asia/Krasnoyarsk",
  "Asia/Irkutsk",
  "Asia/Yakutsk",
  "Asia/Vladivostok",
  "Asia/Magadan",
  "Asia/Kamchatka",
];

const TIME_ZONE_LABELS = {
  "Europe/Moscow": "МСК",
  "Europe/Kaliningrad": "Калининград",
  "Europe/Samara": "Самара",
  "Asia/Yekaterinburg": "Екатеринбург",
  "Asia/Omsk": "Омск",
  "Asia/Krasnoyarsk": "Красноярск",
  "Asia/Irkutsk": "Иркутск",
  "Asia/Yakutsk": "Якутск",
  "Asia/Vladivostok": "Владивосток",
  "Asia/Magadan": "Магадан",
  "Asia/Kamchatka": "Камчатка",
};

function modMs(value, modulo) {
  return ((value % modulo) + modulo) % modulo;
}

function clock(ms, timeZone) {
  return new Date(ms).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
}

function clockWithSeconds(ms, timeZone) {
  return new Date(ms).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone,
  });
}

function windowLabel(startMs, endMs, timeZone) {
  const start = clock(startMs, timeZone);
  const end = clock(endMs, timeZone);
  return `${start} – ${end}`;
}

function statusForSlot(startMs, endMs, nowMs, hasNext) {
  if (startMs <= nowMs && endMs > nowMs) return "live";
  if (!hasNext && startMs > nowMs) return "next";
  return "future";
}

export function resolveDisplayTimeZone(candidate) {
  if (candidate && RU_TIME_ZONES.includes(candidate)) return candidate;
  if (candidate) {
    try {
      Intl.DateTimeFormat("ru-RU", { timeZone: candidate }).format(0);
      return candidate;
    } catch {
      // Fall back to the server zone when the browser returns an invalid value.
    }
  }
  return SERVER_TIME_ZONE;
}

export function getRainState(nowMs) {
  const positionMs = modMs(nowMs - RAIN_ANCHOR_MS, RAIN_CYCLE_MS);
  const current = RAIN_SEGMENTS.find((segment) => positionMs >= segment.startMs && positionMs < segment.endMs);

  if (!current) {
    return { isRaining: false, remainingMs: 0, nextRainInMs: 0 };
  }

  if (current.isRaining) {
    return {
      isRaining: true,
      remainingMs: current.endMs - positionMs,
      nextRainInMs: 0,
    };
  }

  const nextRainInMs = RAIN_SEGMENTS
    .filter((segment) => segment.isRaining)
    .reduce((best, segment) => {
      const distance = segment.startMs > positionMs
        ? segment.startMs - positionMs
        : RAIN_CYCLE_MS - positionMs + segment.startMs;
      return Math.min(best, distance);
    }, Infinity);

  return {
    isRaining: false,
    remainingMs: nextRainInMs,
    nextRainInMs,
  };
}

export function getDayNightState(nowMs) {
  const positionMs = modMs(nowMs + DN_OFFSET_MS, CYCLE_DN_MS);
  const isDay = positionMs < DAY_MS;
  const remainingMs = isDay ? DAY_MS - positionMs : CYCLE_DN_MS - positionMs;

  return {
    phase: isDay ? "day" : "night",
    phaseLabel: isDay ? "день" : "ночь",
    nextPhase: isDay ? "night" : "day",
    nextPhaseLabel: isDay ? "ночь" : "день",
    remainingMs,
    nextPhaseAtMs: nowMs + remainingMs,
  };
}

function buildTimeline(nowMs, horizonMs) {
  const endMs = nowMs + horizonMs;
  const segments = [];
  let cursorMs = nowMs;

  while (cursorMs < endMs) {
    const rain = getRainState(cursorMs);
    const dayNight = getDayNightState(cursorMs);
    const nextMs = Math.min(cursorMs + rain.remainingMs, dayNight.nextPhaseAtMs, endMs);

    segments.push({
      startMs: cursorMs,
      endMs: nextMs,
      durationMs: nextMs - cursorMs,
      phase: dayNight.phase,
      isRaining: rain.isRaining,
    });

    cursorMs = nextMs;
  }

  return segments;
}

function buildSlots(nowMs, horizonMs, type, timeZone) {
  const endMs = nowMs + horizonMs;
  const stepMs = type === "night" ? 30 * 60 * 1000 : 15 * 60 * 1000;
  const slots = [];
  let hasNext = false;
  let cursorMs = Math.floor(nowMs / stepMs) * stepMs;

  while (cursorMs < endMs) {
    const slotEndMs = cursorMs + stepMs;
    const midMs = cursorMs + stepMs / 2;
    const include = type === "rain" ? getRainState(midMs).isRaining : getDayNightState(midMs).phase === "night";

    if (include && slotEndMs > nowMs) {
      const status = statusForSlot(cursorMs, slotEndMs, nowMs, hasNext);
      if (status === "next") hasNext = true;

      slots.push({
        startMs: cursorMs,
        endMs: slotEndMs,
        status,
        label: windowLabel(cursorMs, slotEndMs, timeZone),
      });
    }

    cursorMs = slotEndMs;
  }

  return slots;
}

export function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours} ч ${minutes} мин ${seconds} сек`;
  return `${minutes} мин ${seconds} сек`;
}

export function formatCompactDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  if (hours > 0) return `${hours}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

function notificationForSlot(slot, type, kind) {
  const labels = {
    rain: "Дождь",
    night: "Ночь",
  };
  const action = kind === "start" ? "начнётся" : "закончится";
  const eventAtMs = kind === "start" ? slot.startMs : slot.endMs;
  const soundKey = type === "rain" && kind === "start"
    ? "rain"
    : type === "night" && kind === "start"
      ? "night"
      : type === "night" && kind === "end"
        ? "day"
        : null;

  return {
    id: `${type}-${kind}-${eventAtMs}`,
    type,
    kind,
    soundKey,
    eventAtMs,
    label: slot.label,
    title: `Скоро ${action} ${labels[type].toLowerCase()}`,
    body: `${labels[type]} ${action} через 5 минут: ${slot.label}`,
  };
}

export function getDueNotifications({
  nowMs = Date.now(),
  checkedFromMs = nowMs,
  rainSlots = [],
  nightSlots = [],
  leadMs = 5 * 60 * 1000,
  toleranceMs = 1000,
} = {}) {
  return [
    ...rainSlots.flatMap((slot) => [
      notificationForSlot(slot, "rain", "start"),
      notificationForSlot(slot, "rain", "end"),
    ]),
    ...nightSlots.flatMap((slot) => [
      notificationForSlot(slot, "night", "start"),
      notificationForSlot(slot, "night", "end"),
    ]),
  ].filter((event) => {
    const notifyAtMs = event.eventAtMs - leadMs;
    return notifyAtMs >= checkedFromMs && notifyAtMs <= nowMs + toleranceMs;
  });
}

export function computeWeather({
  nowMs = Date.now(),
  displayTimeZone,
  horizonHours = 24,
  timelineHours = 3,
} = {}) {
  const timeZone = resolveDisplayTimeZone(displayTimeZone);
  const horizonMs = horizonHours * 60 * 60 * 1000;
  const timelineMs = timelineHours * 60 * 60 * 1000;
  const rain = getRainState(nowMs);
  const dayNight = getDayNightState(nowMs);

  return {
    nowMs,
    serverTimeZone: SERVER_TIME_ZONE,
    displayTimeZone: timeZone,
    displayTimeZoneLabel: TIME_ZONE_LABELS[timeZone] || timeZone,
    generatedClock: clockWithSeconds(nowMs, timeZone),
    current: {
      phase: dayNight.phase,
      phaseLabel: dayNight.phaseLabel,
      phaseRemainingMs: dayNight.remainingMs,
      nextPhase: dayNight.nextPhase,
      nextPhaseLabel: dayNight.nextPhaseLabel,
      nextPhaseAtLabel: clock(dayNight.nextPhaseAtMs, timeZone),
      isRaining: rain.isRaining,
      rainRemainingMs: rain.remainingMs,
      rainCountdownLabel: formatCompactDuration(rain.remainingMs),
      weatherLabel: rain.isRaining ? "дождь" : "ясно",
    },
    timeline: buildTimeline(nowMs, timelineMs).map((segment) => ({
      ...segment,
      startLabel: clock(segment.startMs, timeZone),
      endLabel: clock(segment.endMs, timeZone),
    })),
    rainSlots: buildSlots(nowMs, horizonMs, "rain", timeZone),
    nightSlots: buildSlots(nowMs, horizonMs, "night", timeZone),
  };
}
