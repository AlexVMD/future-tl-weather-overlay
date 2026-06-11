import { computeWeather } from "../weather-engine.js";
import { DEFAULT_OVERLAY_SETTINGS, buildOverlayViewModel, normalizeOverlaySettings } from "./overlay-model.js";

const nodes = {
  root: document.querySelector("#overlay-root"),
  weatherCard: document.querySelector("#weather-card"),
  modeLabel: document.querySelector("#mode-label"),
  clockLabel: document.querySelector("#clock-label"),
  wideTimeline: document.querySelector("#wide-timeline"),
  wideEvents: document.querySelector("#wide-events"),
  wideRain: document.querySelector("#wide-rain"),
  widePhase: document.querySelector("#wide-phase"),
  wideCurrent: document.querySelector("#wide-current"),
  compactTimeline: document.querySelector("#compact-timeline"),
  compactBoundaries: document.querySelector("#compact-boundaries"),
  focusTimeline: document.querySelector("#focus-timeline"),
  focusTicks: document.querySelector("#focus-ticks"),
  focusEvent: document.querySelector("#focus-event"),
  focusCaption: document.querySelector("#focus-caption"),
  focusDetails: document.querySelector("#focus-details"),
  rainCard: document.querySelector("#rain-card"),
};

let settings = normalizeOverlaySettings(DEFAULT_OVERLAY_SETTINGS);
let editMode = false;

function iconText(icon) {
  if (icon === "rain") return "🌧";
  if (icon === "night") return "☾";
  return "☀";
}

function segmentClass(segment) {
  if (segment.kind === "rain-day") return "segment segment--rain segment--rain-day";
  if (segment.kind === "rain-night") return "segment segment--rain segment--rain-night";
  if (segment.kind === "night") return "segment segment--night";
  return "segment segment--day";
}

function renderSegments(container, model, { labels = true } = {}) {
  container.innerHTML = "";
  for (const segment of model.segments) {
    const item = document.createElement("div");
    item.className = segmentClass(segment);
    item.style.flexGrow = String(segment.grow);
    item.style.flexBasis = "0";
    item.style.setProperty("--segment-min", `${model.layout.minSegmentWidth}px`);
    item.title = `${segment.title} ${segment.fullTimeLabel}`;

    const stack = document.createElement("div");
    stack.className = "segment__stack";

    const icon = document.createElement("span");
    icon.className = "segment__icon";
    icon.textContent = iconText(segment.icon);
    stack.append(icon);

    if (labels && segment.timeLabel) {
      const time = document.createElement("strong");
      time.className = "segment__time";
      time.textContent = segment.timeLabel;
      stack.append(time);
    }

    item.append(stack);
    container.append(item);
  }
}

function renderEvents(container, events, limit = 4) {
  container.innerHTML = "";
  for (const event of events.slice(0, limit)) {
    const item = document.createElement("span");
    item.className = `event-pill event-pill--${event.kind}`;
    item.textContent = event.label;
    item.title = event.label;
    container.append(item);
  }
}

function renderTicks(container, ticks) {
  container.innerHTML = "";
  for (const tick of ticks) {
    const item = document.createElement("span");
    item.textContent = tick.label;
    container.append(item);
  }
}

function renderBoundaryLabels(container, labels) {
  container.innerHTML = "";
  for (const label of labels) {
    const item = document.createElement("span");
    item.className = "boundary-marker";
    item.style.left = `${label.positionPercent}%`;
    if (label.positionPercent >= 99) item.classList.add("is-end");

    const line = document.createElement("i");
    const text = document.createElement("b");
    text.textContent = label.label;
    text.hidden = !label.showLabel;

    item.append(line, text);
    container.append(item);
  }
}

function renderFocusEvent(model) {
  renderRainCardInto(nodes.focusEvent, model.rainSummary);
  nodes.focusCaption.innerHTML = "";
  const events = model.detailEvents.length ? model.detailEvents : [{ kind: "phase", label: model.current.phaseCaption }];
  for (const event of events) {
    const item = document.createElement("span");
    item.className = `focus-caption__event focus-caption__event--${event.kind}`;
    item.textContent = event.label;
    item.title = event.label;
    nodes.focusCaption.append(item);
  }

  nodes.focusDetails.innerHTML = "";
  for (const row of model.detailRows) {
    const item = document.createElement("div");
    const label = document.createElement("span");
    label.textContent = row.label;
    const value = document.createElement("strong");
    value.textContent = row.value;
    item.append(label, value);
    nodes.focusDetails.append(item);
  }
}

function renderRainCard(model) {
  renderRainCardInto(nodes.rainCard, model.rainSummary);
}

function renderRainCardInto(container, summary) {
  container.innerHTML = "";
  const icon = document.createElement("div");
  icon.className = `rain-card__icon rain-card__icon--${summary.icon}`;
  icon.textContent = summary.icon === "rain-night" ? "☾" : "☀";

  const heading = document.createElement("div");
  heading.className = "rain-card__heading";
  const title = document.createElement("strong");
  title.textContent = summary.title;
  const phase = document.createElement("span");
  phase.textContent = summary.phaseLabel;
  heading.append(title, phase);

  const time = document.createElement("code");
  time.textContent = summary.timeLabel;

  const countdown = document.createElement("div");
  countdown.className = "rain-card__countdown";
  const action = document.createElement("span");
  action.textContent = summary.countdownAction;
  const value = document.createElement("b");
  value.textContent = summary.countdownValue;
  countdown.append(action, value);

  container.append(icon, heading, time, countdown);
}

function applySettingsToDom() {
  nodes.root.className = `overlay overlay--${settings.preset}`;
  nodes.root.style.setProperty("--overlay-width", `${settings.width}px`);
  nodes.root.style.setProperty("--overlay-opacity", String(settings.opacity));
  nodes.root.style.setProperty("--overlay-scale", String(settings.scale));
}

function render() {
  const weather = computeWeather({
    displayTimeZone: settings.displayTimeZone,
    horizonHours: 24,
    timelineHours: 3,
  });
  const model = buildOverlayViewModel(weather, settings);

  nodes.modeLabel.textContent = editMode ? "режим настройки" : `Future TL · ${model.current.displayTimeZoneLabel}`;
  nodes.clockLabel.textContent = model.current.clock;

  renderSegments(nodes.wideTimeline, model, { labels: true });
  renderEvents(nodes.wideEvents, model.eventRows, 4);
  nodes.wideRain.textContent = `${model.current.rainCaption} ${model.current.rainCountdown}`;
  nodes.widePhase.textContent = model.current.phaseCaption;
  nodes.wideCurrent.textContent = model.current.title;

  renderSegments(nodes.compactTimeline, model, { labels: false });
  renderBoundaryLabels(nodes.compactBoundaries, model.boundaryLabels);

  renderSegments(nodes.focusTimeline, model, { labels: false });
  renderTicks(nodes.focusTicks, model.tickLabels.filter((tick) => tick.position !== "middle"));
  renderFocusEvent(model);
  renderRainCard(model);
}

function setEditMode(value) {
  editMode = Boolean(value);
  document.body.classList.toggle("is-editing", editMode);
  render();
}

function setSettings(nextSettings) {
  settings = normalizeOverlaySettings(nextSettings || DEFAULT_OVERLAY_SETTINGS);
  applySettingsToDom();
  render();
}

async function init() {
  const stored = await window.futureOverlay?.getSettings();
  settings = normalizeOverlaySettings(stored || DEFAULT_OVERLAY_SETTINGS);
  applySettingsToDom();

  window.futureOverlay?.onEditModeChanged(setEditMode);
  window.futureOverlay?.onSettingsChanged(setSettings);
  const initialEditMode = await window.futureOverlay?.getEditMode();
  setEditMode(Boolean(initialEditMode));

  render();
  setInterval(render, 1000);
}

init();
