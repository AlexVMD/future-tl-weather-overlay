export const UPDATE_STATUS = {
  IDLE: "idle",
  CHECKING: "checking",
  AVAILABLE: "available",
  CURRENT: "current",
  DOWNLOADING: "downloading",
  INSTALLING: "installing",
  ERROR: "error",
  DEV_DISABLED: "dev-disabled",
};

function createStatus(type, patch = {}) {
  return {
    type,
    currentVersion: patch.currentVersion || "",
    latestVersion: patch.latestVersion || "",
    percent: Number.isFinite(Number(patch.percent)) ? Math.round(Number(patch.percent)) : 0,
    message: patch.message || "",
  };
}

export function createUpdateController({
  updater,
  currentVersion,
  isPackaged,
  onStatus,
  onBeforeInstall = () => {},
}) {
  let latestInfo = null;
  let downloaded = false;
  let installRequested = false;
  let status = createStatus(UPDATE_STATUS.IDLE, { currentVersion });

  function publish(type, patch = {}) {
    status = createStatus(type, {
      currentVersion,
      latestVersion: latestInfo?.version,
      ...patch,
    });
    onStatus(status);
    return status;
  }

  function installDownloadedUpdate() {
    onBeforeInstall();
    publish(UPDATE_STATUS.INSTALLING, {
      latestVersion: latestInfo?.version,
      message: "Установка обновления и перезапуск...",
    });
    updater.quitAndInstall(true, true);
  }

  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = false;

  updater.on("checking-for-update", () => {
    publish(UPDATE_STATUS.CHECKING, { message: "Проверяем обновления..." });
  });
  updater.on("update-available", (info) => {
    latestInfo = info;
    downloaded = false;
    publish(UPDATE_STATUS.AVAILABLE, {
      latestVersion: info.version,
      message: `Доступна версия ${info.version}`,
    });
  });
  updater.on("update-not-available", (info) => {
    latestInfo = info;
    downloaded = false;
    installRequested = false;
    publish(UPDATE_STATUS.CURRENT, {
      latestVersion: info.version || currentVersion,
      message: "Установлена последняя версия",
    });
  });
  updater.on("download-progress", (progress) => {
    publish(UPDATE_STATUS.DOWNLOADING, {
      latestVersion: latestInfo?.version,
      percent: progress.percent,
      message: "Скачиваем обновление...",
    });
  });
  updater.on("update-downloaded", (info) => {
    latestInfo = info;
    downloaded = true;
    publish(UPDATE_STATUS.INSTALLING, {
      latestVersion: info.version,
      percent: 100,
      message: "Обновление скачано",
    });
    if (installRequested) installDownloadedUpdate();
  });
  updater.on("error", (error) => {
    installRequested = false;
    publish(UPDATE_STATUS.ERROR, {
      message: error?.message || "Не удалось проверить или установить обновление",
    });
  });

  return {
    getStatus() {
      return status;
    },
    async checkForUpdates() {
      if (!isPackaged) {
        return publish(UPDATE_STATUS.DEV_DISABLED, {
          message: "Проверка обновлений доступна в установленной версии",
        });
      }
      if (status.type === UPDATE_STATUS.CHECKING || status.type === UPDATE_STATUS.DOWNLOADING) {
        return status;
      }
      try {
        publish(UPDATE_STATUS.CHECKING, { message: "Проверяем обновления..." });
        await updater.checkForUpdates();
      } catch (error) {
        publish(UPDATE_STATUS.ERROR, {
          message: error?.message || "Не удалось проверить обновления",
        });
      }
      return status;
    },
    async installUpdate() {
      if (!isPackaged) {
        return publish(UPDATE_STATUS.DEV_DISABLED, {
          message: "Установка обновлений доступна в установленной версии",
        });
      }
      installRequested = true;
      if (downloaded) {
        installDownloadedUpdate();
        return status;
      }
      if (!latestInfo) {
        await this.checkForUpdates();
        if (!latestInfo) return status;
      }
      try {
        publish(UPDATE_STATUS.DOWNLOADING, {
          latestVersion: latestInfo.version,
          message: "Скачиваем обновление...",
        });
        await updater.downloadUpdate();
      } catch (error) {
        installRequested = false;
        publish(UPDATE_STATUS.ERROR, {
          message: error?.message || "Не удалось скачать обновление",
        });
      }
      return status;
    },
  };
}
