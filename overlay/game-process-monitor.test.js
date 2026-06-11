import assert from "node:assert/strict";
import { test } from "node:test";
import { createGameProcessMonitor, GAME_PROCESS_NAMES } from "./game-process-monitor.js";

test("tracks the TL process name from the real Windows process list", () => {
  assert.ok(GAME_PROCESS_NAMES.includes("TL"));
});

test("does not close before the game process was seen", async () => {
  let closed = false;
  const monitor = createGameProcessMonitor({
    checkGameRunning: async () => false,
    onGameClosed: () => {
      closed = true;
    },
    intervalMs: 10,
  });

  monitor.start();
  await new Promise((resolve) => setTimeout(resolve, 30));
  monitor.stop();

  assert.equal(closed, false);
});

test("closes after the previously seen game process disappears", async () => {
  const states = [true, false];
  let closed = false;
  const monitor = createGameProcessMonitor({
    checkGameRunning: async () => states.shift() ?? false,
    onGameClosed: () => {
      closed = true;
    },
    intervalMs: 10,
  });

  monitor.start();
  await new Promise((resolve) => setTimeout(resolve, 40));
  monitor.stop();

  assert.equal(closed, true);
});
