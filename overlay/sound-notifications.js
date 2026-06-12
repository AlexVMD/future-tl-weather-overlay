import { getDueNotifications } from "../weather-engine.js";

const MAX_REMEMBERED_EVENTS = 64;

export function createSoundNotificationTracker({
  initialCheckedAtMs = Date.now(),
  toleranceMs = 1500,
} = {}) {
  let checkedFromMs = initialCheckedAtMs;
  const notifiedEventIds = new Set();

  return {
    collect(weather) {
      const nowMs = Number(weather?.nowMs);
      if (!Number.isFinite(nowMs)) return [];

      const due = getDueNotifications({
        nowMs,
        checkedFromMs,
        rainSlots: weather.rainSlots || [],
        nightSlots: weather.nightSlots || [],
        toleranceMs,
      });
      checkedFromMs = nowMs;

      const audible = due.filter((event) => {
        if (!event.soundKey || notifiedEventIds.has(event.id)) return false;
        notifiedEventIds.add(event.id);
        return true;
      });

      while (notifiedEventIds.size > MAX_REMEMBERED_EVENTS) {
        notifiedEventIds.delete(notifiedEventIds.values().next().value);
      }

      return audible;
    },
  };
}
