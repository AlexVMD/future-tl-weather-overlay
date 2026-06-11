import { execFile } from "node:child_process";

export const GAME_PROCESS_NAMES = [
  "TL",
  "TLClient",
  "ThroneAndLiberty",
  "ThroneAndLibertyClient",
  "TLClient-Win64-Shipping",
  "ThroneAndLiberty-Win64-Shipping",
];

export const GAME_PROCESS_CHECK_INTERVAL_MS = 3000;

export function createGameProcessMonitor({
  checkGameRunning,
  onGameClosed,
  intervalMs = GAME_PROCESS_CHECK_INTERVAL_MS,
}) {
  let timer = null;
  let hasSeenGame = false;
  let isChecking = false;
  let stopped = false;

  async function tick() {
    if (stopped || isChecking) return;
    isChecking = true;

    try {
      const isRunning = await checkGameRunning();
      if (isRunning) {
        hasSeenGame = true;
      } else if (hasSeenGame) {
        stopped = true;
        onGameClosed();
      }
    } catch {
      // A failed process query should not close the overlay by mistake.
    } finally {
      isChecking = false;
    }
  }

  return {
    start() {
      if (timer) return;
      tick();
      timer = setInterval(tick, intervalMs);
      timer.unref?.();
    },
    stop() {
      stopped = true;
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
}

export function queryGameProcessRunning(processNames = GAME_PROCESS_NAMES) {
  if (process.platform !== "win32") {
    return Promise.resolve(false);
  }

  const quotedNames = processNames
    .map((name) => `'${name.replaceAll("'", "''")}'`)
    .join(",");
  const script = `
    $names = @(${quotedNames})
    $process = Get-Process -Name $names -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($process) { '1' } else { '0' }
  `;

  return new Promise((resolve, reject) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
      { timeout: 5000, windowsHide: true },
      (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout.trim() === "1");
      },
    );
  });
}
