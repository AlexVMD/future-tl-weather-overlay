import { computeWeather, formatCompactDuration, formatDuration, getDueNotifications } from "./weather-engine.js?v=20260608-8";

const $ = (selector) => document.querySelector(selector);

const nodes = {
  guildCallout: $("#guild-callout"),
  guildCalloutClose: $("#guild-callout-close"),
  guildDetails: $("#guild-details"),
  guildDetailsToggle: $("#guild-details-toggle"),
  guildDetailsCollapse: $("#guild-details-collapse"),
  visitorTz: $("#visitor-tz"),
  visitStats: $("#visit-stats"),
  settingsOpen: $("#settings-open"),
  settingsClose: $("#settings-close"),
  settingsBackdrop: $("#settings-backdrop"),
  settingsPanel: $("#settings-panel"),
  timezoneSelect: $("#timezone-select"),
  desktopToggle: $("#desktop-toggle"),
  soundToggle: $("#sound-toggle"),
  soundVolume: $("#sound-volume"),
  soundVolumeValue: $("#sound-volume-value"),
  currentIconWrap: $(".now-panel__icon"),
  currentIcon: $("#current-icon"),
  currentTitle: $("#current-title"),
  currentSubtitle: $("#current-subtitle"),
  rainCountdown: $("#rain-countdown"),
  rainCaption: $("#rain-caption"),
  phaseCountdown: $("#phase-countdown"),
  phaseCaption: $("#phase-caption"),
  visitorClock: $("#visitor-clock"),
  visitorCaption: $("#visitor-caption"),
  timeline: $("#timeline"),
  timelineAxis: $("#timeline-axis"),
  rainSlots: $("#rain-slots"),
  nightSlots: $("#night-slots"),
  rainCount: $("#rain-count"),
  nightCount: $("#night-count"),
};

function detectTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Moscow";
  } catch {
    return "Europe/Moscow";
  }
}

const notifiedEventIds = new Set();
const GUILD_DISMISS_KEY = "futureGuildAnnouncementDismissed";
const GUILD_DISMISS_MS = 24 * 60 * 60 * 1000;
const NOTIFICATION_PREF_KEY = "futureWeatherNotificationsWanted";
const SOUND_PREF_KEY = "futureWeatherSoundWanted";
const SOUND_VOLUME_KEY = "futureWeatherSoundVolume";
const TIME_ZONE_PREF_KEY = "futureWeatherTimeZone";
const VISITOR_ID_KEY = "futureWeatherVisitorId";
const AUTO_TIME_ZONE = detectTimeZone();
const STANDARD_TIME_ZONES = [
  ["Pacific/Honolulu", "Гонолулу"],
  ["America/Anchorage", "Анкоридж"],
  ["America/Juneau", "Джуно"],
  ["America/Vancouver", "Ванкувер"],
  ["America/Los_Angeles", "Лос-Анджелес"],
  ["America/Tijuana", "Тихуана"],
  ["America/Phoenix", "Финикс"],
  ["America/Hermosillo", "Эрмосильо"],
  ["America/Denver", "Денвер"],
  ["America/Mexico_City", "Мехико"],
  ["America/Edmonton", "Эдмонтон"],
  ["America/Chicago", "Чикаго"],
  ["America/Detroit", "Детройт"],
  ["America/Manaus", "Манаус"],
  ["America/New_York", "Нью-Йорк"],
  ["America/Santiago", "Сантьяго"],
  ["America/Toronto", "Торонто"],
  ["America/Bahia", "Байя"],
  ["America/Belem", "Белен"],
  ["America/Argentina/Buenos_Aires", "Буэнос-Айрес"],
  ["America/Halifax", "Галифакс"],
  ["America/Recife", "Ресифи"],
  ["America/Sao_Paulo", "Сан-Паулу"],
  ["America/St_Johns", "Сент-Джонс"],
  ["Atlantic/South_Georgia", "Норонья"],
  ["Africa/Algiers", "Алжир"],
  ["Europe/Dublin", "Дублин"],
  ["Atlantic/Canary", "Канарские о-ва"],
  ["Africa/Casablanca", "Касабланка"],
  ["Africa/Lagos", "Лагос"],
  ["Europe/London", "Лондон"],
  ["Africa/Tunis", "Тунис"],
  ["Europe/Amsterdam", "Амстердам"],
  ["Europe/Berlin", "Берлин"],
  ["Europe/Brussels", "Брюссель"],
  ["Europe/Budapest", "Будапешт"],
  ["Europe/Warsaw", "Варшава"],
  ["Africa/Johannesburg", "Йоханнесбург"],
  ["Europe/Kaliningrad", "Калининград"],
  ["Europe/Madrid", "Мадрид"],
  ["Europe/Paris", "Париж"],
  ["Europe/Prague", "Прага"],
  ["Europe/Rome", "Рим"],
  ["Europe/Stockholm", "Стокгольм"],
  ["Asia/Aden", "Аден"],
  ["Asia/Amman", "Амман"],
  ["Europe/Volgograd", "Волгоград"],
  ["Asia/Jerusalem", "Иерусалим"],
  ["Africa/Cairo", "Каир"],
  ["Africa/Kampala", "Кампала"],
  ["Europe/Moscow", "Москва"],
  ["Africa/Nairobi", "Найроби"],
  ["Asia/Riyadh", "Эр-Рияд"],
  ["Asia/Yekaterinburg", "Екатеринбург"],
  ["Asia/Kolkata", "Калькутта"],
  ["Asia/Omsk", "Омск"],
  ["Asia/Krasnoyarsk", "Красноярск"],
  ["Asia/Novosibirsk", "Новосибирск"],
  ["Asia/Hong_Kong", "Гонконг"],
  ["Asia/Irkutsk", "Иркутск"],
  ["Asia/Manila", "Манила"],
  ["Australia/Perth", "Перт"],
  ["Asia/Singapore", "Сингапур"],
  ["Asia/Taipei", "Тайбэй"],
  ["Australia/Eucla", "Юкла"],
  ["Asia/Seoul", "Сеул"],
  ["Asia/Tokyo", "Токио"],
  ["Asia/Yakutsk", "Якутск"],
  ["Australia/Adelaide", "Аделаида"],
  ["Australia/Darwin", "Дарвин"],
  ["Australia/Brisbane", "Брисбен"],
  ["Asia/Vladivostok", "Владивосток"],
  ["Australia/Melbourne", "Мельбурн"],
  ["Australia/Sydney", "Сидней"],
  ["Australia/Hobart", "Хобарт"],
  ["Asia/Sakhalin", "о-в Сахалин"],
  ["Pacific/Auckland", "Окленд"],
  ["Asia/Kamchatka", "Петропавловск-Камчатский"],
  ["Pacific/Chatham", "Чатем"],
];
const ALERT_SOUNDS = {
  day: "assets/sound-day.mp3",
  night: "assets/sound-night.mp3",
  rain: "assets/sound-rain.mp3",
};
const STATE_ICONS = {
  day: {
    clear: {
      src: "assets/icon-day-96.webp",
      srcset: "assets/icon-day-96.webp 96w, assets/icon-day-192.webp 192w",
      alt: "День",
    },
    rain: {
      src: "assets/icon-day-rain-96.webp",
      srcset: "assets/icon-day-rain-96.webp 96w, assets/icon-day-rain-192.webp 192w",
      alt: "День и дождь",
    },
  },
  night: {
    clear: {
      src: "assets/icon-night-96.webp",
      srcset: "assets/icon-night-96.webp 96w, assets/icon-night-192.webp 192w",
      alt: "Ночь",
    },
    rain: {
      src: "assets/icon-night-rain-96.webp",
      srcset: "assets/icon-night-rain-96.webp 96w, assets/icon-night-rain-192.webp 192w",
      alt: "Ночь и дождь",
    },
  },
};

let displayTimeZone = AUTO_TIME_ZONE;
let desktopNotificationsEnabled = false;
let soundNotificationsEnabled = false;
let soundVolume = 0.7;
let alertAudio = {};
let lastNotificationCheckMs = Date.now();
let guildDismissTimer = null;
let timelineRenderKey = "";
let rainSlotsRenderKey = "";
let nightSlotsRenderKey = "";
let currentIconKey = "";

function setText(node, value) {
  if (node && node.textContent !== value) {
    node.textContent = value;
  }
}

function resetRenderCaches() {
  timelineRenderKey = "";
  rainSlotsRenderKey = "";
  nightSlotsRenderKey = "";
  currentIconKey = "";
}

function readGuildDismissState() {
  try {
    return JSON.parse(localStorage.getItem(GUILD_DISMISS_KEY) || "null");
  } catch {
    return null;
  }
}

function hideGuildCallout() {
  nodes.guildCallout?.classList.add("is-hidden");
}

function showGuildCallout() {
  nodes.guildCallout?.classList.remove("is-hidden");
}

function clearGuildDismissState() {
  try {
    localStorage.removeItem(GUILD_DISMISS_KEY);
  } catch {
    // Storage may be unavailable in private or restricted browser modes.
  }
}

function scheduleGuildReturn(delayMs) {
  if (guildDismissTimer) {
    clearTimeout(guildDismissTimer);
    guildDismissTimer = null;
  }

  if (delayMs <= 0) {
    clearGuildDismissState();
    showGuildCallout();
    return;
  }

  guildDismissTimer = setTimeout(() => {
    clearGuildDismissState();
    showGuildCallout();
  }, Math.min(delayMs, 2147483647));
}

function setGuildDetailsExpanded(isExpanded) {
  if (!nodes.guildCallout || !nodes.guildDetails || !nodes.guildDetailsToggle) return;

  nodes.guildCallout.classList.toggle("is-expanded", isExpanded);
  nodes.guildDetails.hidden = !isExpanded;
  nodes.guildDetailsToggle.hidden = isExpanded;
  nodes.guildDetailsToggle.setAttribute("aria-expanded", String(isExpanded));
}

function initGuildCallout() {
  if (!nodes.guildCallout || !nodes.guildCalloutClose) return;

  const announcementId = nodes.guildCallout.dataset.announcementId || "default";
  const dismissState = readGuildDismissState();
  const nowMs = Date.now();
  const isCurrentDismiss = dismissState?.id === announcementId
    && Number.isFinite(dismissState.expiresAt);

  if (isCurrentDismiss && dismissState.expiresAt > nowMs) {
    hideGuildCallout();
    scheduleGuildReturn(dismissState.expiresAt - nowMs);
  } else {
    clearGuildDismissState();
    showGuildCallout();
  }

  nodes.guildCalloutClose.addEventListener("click", () => {
    const expiresAt = Date.now() + GUILD_DISMISS_MS;

    try {
      localStorage.setItem(GUILD_DISMISS_KEY, JSON.stringify({
        id: announcementId,
        expiresAt,
      }));
    } catch {
      // Storage may be unavailable in private or restricted browser modes.
    }

    setGuildDetailsExpanded(false);
    hideGuildCallout();
    scheduleGuildReturn(expiresAt - Date.now());
  });

  nodes.guildDetailsToggle?.addEventListener("click", () => {
    setGuildDetailsExpanded(true);
  });

  nodes.guildDetailsCollapse?.addEventListener("click", () => {
    setGuildDetailsExpanded(false);
    nodes.guildDetailsToggle?.focus();
  });
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function initOrnateFrames() {
  const framedElements = document.querySelectorAll(".guild-callout, .now-panel, .metric, .timeline-card, .schedule");

  framedElements.forEach((element) => {
    const topLeft = randomBetween(27, 43);
    const topRight = randomBetween(24, 40);
    const bottomLeft = randomBetween(24, 41);
    const bottomRight = randomBetween(27, 43);
    const topNotch = randomBetween(32, 68);
    const bottomNotch = randomBetween(30, 70);

    element.style.setProperty("--frame-top-left", `${topLeft.toFixed(1)}%`);
    element.style.setProperty("--frame-top-right", `${topRight.toFixed(1)}%`);
    element.style.setProperty("--frame-bottom-left", `${bottomLeft.toFixed(1)}%`);
    element.style.setProperty("--frame-bottom-right", `${bottomRight.toFixed(1)}%`);
    element.style.setProperty("--frame-top-notch", `${topNotch.toFixed(1)}%`);
    element.style.setProperty("--frame-bottom-notch", `${bottomNotch.toFixed(1)}%`);
    element.style.setProperty("--frame-top-notch-size", `${Math.round(randomBetween(28, 58))}px`);
    element.style.setProperty("--frame-bottom-notch-size", `${Math.round(randomBetween(28, 58))}px`);
  });
}

function getVisitorId() {
  try {
    const existing = localStorage.getItem(VISITOR_ID_KEY);
    if (existing) return existing;

    const value = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

    localStorage.setItem(VISITOR_ID_KEY, value);
    return value;
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}

function formatCounter(value) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

async function updateVisitStats() {
  if (!nodes.visitStats) return;

  try {
    const params = new URLSearchParams({ visitor: getVisitorId() });
    const response = await fetch(`counter.php?${params.toString()}`, {
      cache: "no-store",
      credentials: "same-origin",
    });

    if (!response.ok) throw new Error("counter request failed");

    const stats = await response.json();
    nodes.visitStats.textContent = `уникальные: ${formatCounter(stats.totalUnique)} · сегодня: ${formatCounter(stats.todayVisits)}`;
    nodes.visitStats.title = `Уникальных посетителей всего: ${formatCounter(stats.totalUnique)}. Посещений сегодня: ${formatCounter(stats.todayVisits)}.`;
  } catch {
    nodes.visitStats.textContent = "визиты: недоступно";
    nodes.visitStats.title = "Статистика временно недоступна.";
  }
}

function scheduleVisitStatsUpdate() {
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(updateVisitStats, { timeout: 4000 });
    return;
  }

  setTimeout(updateVisitStats, 1500);
}

function readNotificationPreference() {
  try {
    return localStorage.getItem(NOTIFICATION_PREF_KEY) === "true";
  } catch {
    return false;
  }
}

function writeBooleanPreference(key, wanted) {
  try {
    localStorage.setItem(key, wanted ? "true" : "false");
  } catch {
    // Storage may be unavailable in private or restricted browser modes.
  }
}

function readBooleanPreference(key) {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function readTimeZonePreference() {
  try {
    return localStorage.getItem(TIME_ZONE_PREF_KEY) || "";
  } catch {
    return "";
  }
}

function writeTimeZonePreference(timeZone) {
  try {
    if (timeZone) {
      localStorage.setItem(TIME_ZONE_PREF_KEY, timeZone);
    } else {
      localStorage.removeItem(TIME_ZONE_PREF_KEY);
    }
  } catch {
    // Storage may be unavailable in private or restricted browser modes.
  }
}

function isValidTimeZone(timeZone) {
  if (!timeZone) return true;

  try {
    Intl.DateTimeFormat("ru-RU", { timeZone }).format(0);
    return true;
  } catch {
    return false;
  }
}

function readSoundVolume() {
  try {
    const value = Number(localStorage.getItem(SOUND_VOLUME_KEY));
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.7;
  } catch {
    return 0.7;
  }
}

function writeSoundVolume(value) {
  try {
    localStorage.setItem(SOUND_VOLUME_KEY, String(value));
  } catch {
    // Storage may be unavailable in private or restricted browser modes.
  }
}

function canUseNotifications() {
  return "Notification" in window;
}

function setSwitchState(button, active, disabled = false) {
  if (!button) return;
  button.classList.toggle("is-active", active);
  button.disabled = disabled;
  button.setAttribute("aria-checked", String(active));
}

function updateSettingsControls() {
  setSwitchState(nodes.desktopToggle, desktopNotificationsEnabled, !canUseNotifications());
  setSwitchState(nodes.soundToggle, soundNotificationsEnabled);

  if (nodes.soundVolume) {
    nodes.soundVolume.value = String(Math.round(soundVolume * 100));
    nodes.soundVolume.disabled = !soundNotificationsEnabled;
  }

  if (nodes.soundVolumeValue) {
    nodes.soundVolumeValue.textContent = `${Math.round(soundVolume * 100)}%`;
  }

  if (nodes.settingsOpen) {
    nodes.settingsOpen.classList.toggle("has-active-settings", desktopNotificationsEnabled || soundNotificationsEnabled);
  }
}

function getAlertAudio(soundKey) {
  if (!ALERT_SOUNDS[soundKey]) return null;
  alertAudio[soundKey] ||= new Audio(ALERT_SOUNDS[soundKey]);
  alertAudio[soundKey].preload = "auto";
  return alertAudio[soundKey];
}

async function primeAudio({ unlock = true } = {}) {
  Object.keys(ALERT_SOUNDS).forEach((soundKey) => {
    getAlertAudio(soundKey)?.load();
  });

  if (!unlock) return;

  const unlockAudio = getAlertAudio("day");
  if (!unlockAudio) return;

  const wasMuted = unlockAudio.muted;
  const previousVolume = unlockAudio.volume;

  try {
    unlockAudio.muted = true;
    unlockAudio.volume = 0;
    unlockAudio.currentTime = 0;
    await unlockAudio.play();
    unlockAudio.pause();
    unlockAudio.currentTime = 0;
  } catch {
    // Browsers may still require another direct click before allowing sound.
  } finally {
    unlockAudio.muted = wasMuted;
    unlockAudio.volume = previousVolume;
  }
}

function playAlertSound(soundKey) {
  if (!soundNotificationsEnabled || !soundKey) return;

  const audio = getAlertAudio(soundKey);
  if (!audio) return;

  audio.pause();
  audio.currentTime = 0;
  audio.volume = soundVolume;
  audio.play().catch(() => {
    // Some browsers block playback until the user interacts with the page again.
  });
}

async function toggleDesktopNotifications() {
  if (!canUseNotifications()) {
    desktopNotificationsEnabled = false;
    writeBooleanPreference(NOTIFICATION_PREF_KEY, false);
    updateSettingsControls();
    return;
  }

  if (desktopNotificationsEnabled) {
    desktopNotificationsEnabled = false;
    writeBooleanPreference(NOTIFICATION_PREF_KEY, false);
    updateSettingsControls();
    return;
  }

  const permission = Notification.permission === "default"
    ? await Notification.requestPermission()
    : Notification.permission;

  desktopNotificationsEnabled = permission === "granted";
  writeBooleanPreference(NOTIFICATION_PREF_KEY, desktopNotificationsEnabled);
  updateSettingsControls();
}

function toggleSoundNotifications() {
  soundNotificationsEnabled = !soundNotificationsEnabled;
  writeBooleanPreference(SOUND_PREF_KEY, soundNotificationsEnabled);
  if (soundNotificationsEnabled) primeAudio();
  updateSettingsControls();
}

function showEventAlert(event) {
  if (notifiedEventIds.has(event.id)) return;
  if (!desktopNotificationsEnabled && !(soundNotificationsEnabled && event.soundKey)) return;

  notifiedEventIds.add(event.id);
  playAlertSound(event.soundKey);

  if (desktopNotificationsEnabled) {
    new Notification(event.title, {
      body: event.body,
      tag: event.id,
      silent: true,
    });
  }
}

function preferredTimeZones() {
  const items = STANDARD_TIME_ZONES
    .filter(([timeZone]) => isValidTimeZone(timeZone))
    .map(([timeZone, city]) => ({ timeZone, city, isLocal: false }));

  if (isValidTimeZone(AUTO_TIME_ZONE) && !items.some((item) => item.timeZone === AUTO_TIME_ZONE)) {
    items.unshift({ timeZone: AUTO_TIME_ZONE, city: "Местное время", isLocal: true });
  }

  return items.sort((a, b) => {
    if (a.isLocal) return -1;
    if (b.isLocal) return 1;

    const offsetDelta = timeZoneOffsetMinutes(a.timeZone) - timeZoneOffsetMinutes(b.timeZone);
    return offsetDelta || a.city.localeCompare(b.city, "ru");
  });
}

function timeZoneOffsetMinutes(timeZone) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(new Date());
    const offset = parts.find((part) => part.type === "timeZoneName")?.value || "GMT";
    const match = offset.match(/^GMT(?:(?<sign>[+-])(?<hours>\d{1,2})(?::(?<minutes>\d{2}))?)?$/);
    if (!match) return 0;

    const sign = match.groups.sign === "-" ? -1 : 1;
    const hours = Number(match.groups.hours || 0);
    const minutes = Number(match.groups.minutes || 0);
    return sign * (hours * 60 + minutes);
  } catch {
    return 0;
  }
}

function gmtLabel(timeZone) {
  const offsetMinutes = timeZoneOffsetMinutes(timeZone);
  const sign = offsetMinutes < 0 ? "-" : "+";
  const absMinutes = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absMinutes / 60)).padStart(2, "0");
  const minutes = String(absMinutes % 60).padStart(2, "0");

  return `GMT${sign}${hours}:${minutes}`;
}

function initTimeZoneSelect() {
  if (!nodes.timezoneSelect) return;

  nodes.timezoneSelect.options[0].textContent = `(${gmtLabel(AUTO_TIME_ZONE)}) Местное время`;

  preferredTimeZones().forEach(({ timeZone, city }) => {
    const option = document.createElement("option");
    option.value = timeZone;
    option.textContent = `(${gmtLabel(timeZone)}) ${city}`;
    nodes.timezoneSelect.appendChild(option);
  });

  const storedTimeZone = readTimeZonePreference();
  displayTimeZone = isValidTimeZone(storedTimeZone) && storedTimeZone ? storedTimeZone : AUTO_TIME_ZONE;
  nodes.timezoneSelect.value = storedTimeZone && isValidTimeZone(storedTimeZone) ? storedTimeZone : "";

  nodes.timezoneSelect.addEventListener("change", () => {
    const nextTimeZone = nodes.timezoneSelect.value;
    displayTimeZone = nextTimeZone || AUTO_TIME_ZONE;
    writeTimeZonePreference(nextTimeZone);
    resetRenderCaches();
    render();
  });
}

function setSettingsOpen(isOpen) {
  if (!nodes.settingsPanel || !nodes.settingsBackdrop || !nodes.settingsOpen) return;

  nodes.settingsPanel.classList.toggle("is-open", isOpen);
  nodes.settingsPanel.setAttribute("aria-hidden", String(!isOpen));
  nodes.settingsBackdrop.hidden = !isOpen;
  nodes.settingsBackdrop.classList.toggle("is-open", isOpen);
  nodes.settingsOpen.setAttribute("aria-expanded", String(isOpen));

  if (isOpen) {
    nodes.settingsPanel.querySelector("select, button, input")?.focus();
  } else {
    nodes.settingsOpen.focus();
  }
}

function initSettingsPanel() {
  soundNotificationsEnabled = readBooleanPreference(SOUND_PREF_KEY);
  soundVolume = readSoundVolume();
  if (soundNotificationsEnabled) primeAudio({ unlock: false });

  const notificationsWanted = readNotificationPreference();
  desktopNotificationsEnabled = canUseNotifications()
    && Notification.permission === "granted"
    && notificationsWanted;

  if (canUseNotifications() && Notification.permission === "denied") {
    desktopNotificationsEnabled = false;
    writeBooleanPreference(NOTIFICATION_PREF_KEY, false);
  }

  initTimeZoneSelect();
  updateSettingsControls();

  nodes.settingsOpen?.addEventListener("click", () => setSettingsOpen(true));
  nodes.settingsClose?.addEventListener("click", () => setSettingsOpen(false));
  nodes.settingsBackdrop?.addEventListener("click", () => setSettingsOpen(false));
  nodes.desktopToggle?.addEventListener("click", toggleDesktopNotifications);
  nodes.soundToggle?.addEventListener("click", toggleSoundNotifications);
  nodes.soundVolume?.addEventListener("input", () => {
    soundVolume = Number(nodes.soundVolume.value) / 100;
    writeSoundVolume(soundVolume);
    updateSettingsControls();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nodes.settingsPanel?.classList.contains("is-open")) {
      setSettingsOpen(false);
    }
  });
}

function segmentText(segment) {
  if (segment.isRaining) return "дождь";
  return segment.phase === "day" ? "день" : "ночь";
}

function segmentIcon(segment) {
  return STATE_ICONS[segment.phase][segment.isRaining ? "rain" : "clear"];
}

function statusLabel(status) {
  if (status === "live") return "идёт сейчас";
  if (status === "next") return "следующий";
  return "ожидается";
}

function renderTimeline(data) {
  const nextKey = data.timeline
    .map((segment) => [
      Math.floor(segment.startMs / 60000),
      Math.floor(segment.endMs / 60000),
      segment.phase,
      segment.isRaining ? 1 : 0,
      segment.startLabel,
      segment.endLabel,
    ].join(":"))
    .join("|");

  if (nextKey === timelineRenderKey) return;
  timelineRenderKey = nextKey;

  const total = data.timeline.reduce((sum, segment) => sum + segment.durationMs, 0);
  nodes.timeline.innerHTML = "";

  data.timeline.forEach((segment) => {
    const item = document.createElement("div");
    item.className = [
      "timeline__segment",
      segment.phase === "day" ? "is-day" : "is-night",
      segment.isRaining ? "is-rain" : "",
    ].filter(Boolean).join(" ");
    item.style.flexGrow = String(segment.durationMs);
    item.style.flexBasis = "0";
    item.title = `${segmentText(segment)} · ${segment.startLabel} – ${segment.endLabel}`;
    item.setAttribute("role", "listitem");
    item.setAttribute("aria-label", item.title);

    if (segment.durationMs / total > 0.08) {
      const icon = segmentIcon(segment);
      const img = document.createElement("img");
      img.className = "timeline__icon";
      img.src = icon.src;
      img.srcset = icon.srcset;
      img.sizes = "42px";
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      item.appendChild(img);
    }

    nodes.timeline.appendChild(item);
  });

  nodes.timelineAxis.innerHTML = "";
  data.timeline.forEach((segment, index) => {
    if (index === 0) {
      nodes.timelineAxis.appendChild(axisTick(segment.startLabel));
    }
  });
  const last = data.timeline.at(-1);
  const middle = data.timeline[Math.floor(data.timeline.length / 2)];
  if (middle) nodes.timelineAxis.appendChild(axisTick(middle.startLabel));
  if (last) nodes.timelineAxis.appendChild(axisTick(last.endLabel));
}

function axisTick(label) {
  const tick = document.createElement("span");
  tick.textContent = label;
  return tick;
}

function slotsRenderKey(slots) {
  return slots.map((slot) => `${slot.startMs}:${slot.endMs}:${slot.status}:${slot.label}`).join("|");
}

function renderSlots(container, slots, cacheName) {
  const nextKey = slotsRenderKey(slots);

  if (cacheName === "rain" && nextKey === rainSlotsRenderKey) return;
  if (cacheName === "night" && nextKey === nightSlotsRenderKey) return;

  if (cacheName === "rain") rainSlotsRenderKey = nextKey;
  if (cacheName === "night") nightSlotsRenderKey = nextKey;

  container.innerHTML = "";

  if (!slots.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "В выбранном горизонте интервалов нет.";
    container.appendChild(empty);
    return;
  }

  slots.forEach((slot) => {
    const chip = document.createElement("article");
    chip.className = [
      "chip",
      slot.status === "live" ? "is-live" : "",
      slot.status === "next" ? "is-next" : "",
    ].filter(Boolean).join(" ");

    const time = document.createElement("strong");
    time.textContent = slot.label;

    const status = document.createElement("span");
    status.textContent = statusLabel(slot.status);

    chip.append(time, status);
    container.appendChild(chip);
  });
}

function render() {
  const data = computeWeather({
    nowMs: Date.now(),
    displayTimeZone,
    horizonHours: 24,
    timelineHours: 3,
  });

  const currentTitle = `${data.current.phaseLabel} · ${data.current.weatherLabel}`;
  const rainPrefix = data.current.isRaining ? "дождь закончится через" : "дождь начнётся через";

  setText(nodes.visitorTz, `ваш пояс: ${data.displayTimeZoneLabel}`);
  setText(nodes.currentTitle, currentTitle);
  setText(nodes.currentSubtitle, `${rainPrefix} ${data.current.rainCountdownLabel}; ${data.current.nextPhaseLabel} в ${data.current.nextPhaseAtLabel}`);
  const icon = STATE_ICONS[data.current.phase][data.current.isRaining ? "rain" : "clear"];
  nodes.currentIconWrap.classList.toggle("is-night", data.current.phase === "night");
  nodes.currentIconWrap.classList.toggle("is-rain", data.current.isRaining);
  const nextIconKey = `${icon.src}|${icon.srcset}|${icon.alt}`;
  if (nextIconKey !== currentIconKey) {
    currentIconKey = nextIconKey;
    nodes.currentIcon.src = icon.src;
    nodes.currentIcon.srcset = icon.srcset;
    nodes.currentIcon.sizes = "74px";
    nodes.currentIcon.alt = icon.alt;
    nodes.currentIcon.title = icon.alt;
  }
  setText(nodes.rainCountdown, formatCompactDuration(data.current.rainRemainingMs));
  setText(nodes.rainCaption, rainPrefix);
  setText(nodes.phaseCountdown, formatCompactDuration(data.current.phaseRemainingMs));
  setText(nodes.phaseCaption, `${data.current.nextPhaseLabel} в ${data.current.nextPhaseAtLabel}`);
  setText(nodes.visitorClock, data.generatedClock);
  setText(nodes.visitorCaption, data.displayTimeZone);
  setText(nodes.rainCount, String(data.rainSlots.length));
  setText(nodes.nightCount, String(data.nightSlots.length));

  renderTimeline(data);
  renderSlots(nodes.rainSlots, data.rainSlots, "rain");
  renderSlots(nodes.nightSlots, data.nightSlots, "night");

  const dueNotifications = getDueNotifications({
    nowMs: data.nowMs,
    checkedFromMs: lastNotificationCheckMs,
    rainSlots: data.rainSlots,
    nightSlots: data.nightSlots,
    toleranceMs: 1500,
  });
  dueNotifications.forEach(showEventAlert);
  lastNotificationCheckMs = data.nowMs;
}

initOrnateFrames();
initSettingsPanel();
initGuildCallout();
scheduleVisitStatsUpdate();
render();
setInterval(render, 1000);
