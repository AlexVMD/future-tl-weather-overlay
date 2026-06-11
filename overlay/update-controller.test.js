import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";

import { createUpdateController, UPDATE_STATUS } from "./update-controller.js";

function createMockUpdater() {
  const emitter = new EventEmitter();
  return Object.assign(emitter, {
    autoDownload: true,
    autoInstallOnAppQuit: true,
    checkForUpdatesCalled: 0,
    downloadUpdateCalled: 0,
    quitAndInstallArgs: null,
    async checkForUpdates() {
      this.checkForUpdatesCalled += 1;
    },
    async downloadUpdate() {
      this.downloadUpdateCalled += 1;
    },
    quitAndInstall(...args) {
      this.quitAndInstallArgs = args;
    },
  });
}

test("disables updater actions in development mode", async () => {
  const updater = createMockUpdater();
  const statuses = [];
  const controller = createUpdateController({
    updater,
    currentVersion: "0.1.2",
    isPackaged: false,
    onStatus: (status) => statuses.push(status),
  });

  const status = await controller.checkForUpdates();

  assert.equal(status.type, UPDATE_STATUS.DEV_DISABLED);
  assert.equal(updater.checkForUpdatesCalled, 0);
  assert.equal(statuses.at(-1).message, "Проверка обновлений доступна в установленной версии");
});

test("reports available update without auto-downloading it", async () => {
  const updater = createMockUpdater();
  const statuses = [];
  const controller = createUpdateController({
    updater,
    currentVersion: "0.1.1",
    isPackaged: true,
    onStatus: (status) => statuses.push(status),
  });

  await controller.checkForUpdates();
  updater.emit("update-available", { version: "0.1.2" });

  assert.equal(updater.autoDownload, false);
  assert.equal(updater.downloadUpdateCalled, 0);
  assert.equal(controller.getStatus().type, UPDATE_STATUS.AVAILABLE);
  assert.equal(controller.getStatus().latestVersion, "0.1.2");
});

test("one update click downloads and silently installs downloaded update", async () => {
  const updater = createMockUpdater();
  let preparedToQuit = false;
  const controller = createUpdateController({
    updater,
    currentVersion: "0.1.1",
    isPackaged: true,
    onStatus: () => {},
    onBeforeInstall: () => {
      preparedToQuit = true;
    },
  });

  updater.emit("update-available", { version: "0.1.2" });
  await controller.installUpdate();
  updater.emit("update-downloaded", { version: "0.1.2" });

  assert.equal(updater.downloadUpdateCalled, 1);
  assert.equal(preparedToQuit, true);
  assert.deepEqual(updater.quitAndInstallArgs, [true, true]);
});
