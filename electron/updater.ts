import { createRequire } from 'node:module';
import { BrowserWindow, ipcMain, app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configure logging
autoUpdater.logger = log;
(autoUpdater.logger as any).transports.file.level = 'info';

export class LiarenaUpdater {
  private mainWindow: BrowserWindow | null = null;
  private isProcedureActive: boolean = false;
  private updateCheckInterval: NodeJS.Timeout | null = null;

  constructor(window: BrowserWindow) {
    this.mainWindow = window;
    this.setupListeners();
    this.setupIPC();
  }

  private setupListeners() {
    autoUpdater.on('checking-for-update', () => {
      this.sendStatusToWindow('CHECKING');
    });

    autoUpdater.on('update-available', (info) => {
      // Check if it's a mandatory update via release notes or extra metadata if available
      // For now, we assume updates are optional unless we find a specific flag
      const isMandatory = info.releaseNotes?.toString().includes('[MANDATORY]') || false;
      this.sendStatusToWindow('UPDATE_AVAILABLE', { version: info.version, isMandatory });
    });

    autoUpdater.on('update-not-available', () => {
      this.sendStatusToWindow('UP_TO_DATE');
    });

    autoUpdater.on('error', (err) => {
      log.error('Update error:', err);
      this.sendStatusToWindow('ERROR', err.message);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      this.sendStatusToWindow('DOWNLOADING', {
        percent: Math.round(progressObj.percent),
        bytesPerSecond: progressObj.bytesPerSecond,
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      this.sendStatusToWindow('DOWNLOADED', { version: info.version });

      // If a procedure is active, we don't prompt for restart yet
      if (!this.isProcedureActive) {
        this.logUpdateEvent(info.version, 'SUCCESS');
      }
    });
  }

  private logUpdateEvent(newVersion: string, result: string) {
    try {
      const logPath = path.join(app.getPath('userData'), 'update-history.log');
      const entry = `${new Date().toISOString()} | FROM: ${app.getVersion()} | TO: ${newVersion} | RESULT: ${result}\n`;
      fs.appendFileSync(logPath, entry);
    } catch (e) {
      console.error('Failed to log update event', e);
    }
  }

  private setupIPC() {
    ipcMain.on('check-for-updates', () => {
      autoUpdater.checkForUpdatesAndNotify();
    });

    ipcMain.on('start-download', () => {
      autoUpdater.downloadUpdate();
    });

    ipcMain.on('quit-and-install', () => {
      if (this.isProcedureActive) {
        log.warn('Attempted to update during active procedure. Blocked.');
        return;
      }
      autoUpdater.quitAndInstall();
    });

    ipcMain.on('set-procedure-active', (_, active: boolean) => {
      this.isProcedureActive = active;
      log.info(`Procedure state changed: ${active ? 'ACTIVE' : 'INACTIVE'}`);
    });

    ipcMain.handle('get-app-version', () => app.getVersion());
  }

  private sendStatusToWindow(status: string, data?: any) {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('update-status', { status, data, timestamp: new Date().toLocaleTimeString() });
    }
  }

  public init() {
    // Initial check on startup
    autoUpdater.checkForUpdatesAndNotify();

    // Check for updates every 4 hours
    this.updateCheckInterval = setInterval(() => {
      autoUpdater.checkForUpdates();
    }, 4 * 60 * 60 * 1000);
  }

  public stop() {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
    }
  }
}
