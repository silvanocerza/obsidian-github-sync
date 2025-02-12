import { EventRef, Plugin, Platform } from "obsidian";
import { GitHubSyncSettings, DEFAULT_SETTINGS } from "./settings/settings";
import GitHubSyncSettingsTab from "./settings/tab";
import SyncManager from "./sync-manager";
import { FileMetadata } from "./metadata-store";
import { OnboardingDialog } from "./views/onboarding/view";
import Logger from "./logger";

export default class GitHubSyncPlugin extends Plugin {
  settings: GitHubSyncSettings;
  syncManager: SyncManager;
  logger: Logger;

  statusBarItem: HTMLElement | null = null;
  uploadModifiedFilesRibbonIcon: HTMLElement | null = null;

  activeLeafChangeListener: EventRef | null = null;
  vaultCreateListener: EventRef | null = null;
  vaultModifyListener: EventRef | null = null;

  async onUserEnable() {
    if (Platform.isMobile) {
      // TODO: Implement onboarding for mobile
      this.settings.firstStart = false;
      this.saveSettings();
      return;
    }
    if (this.settings.firstStart) {
      new OnboardingDialog(this).open();
    }
  }

  async onload() {
    await this.loadSettings();

    this.logger = new Logger(this.app.vault, this.settings.enableLogging);

    this.addSettingTab(new GitHubSyncSettingsTab(this.app, this));

    this.syncManager = new SyncManager(
      this.app.vault,
      this.settings,
      this.onConflicts.bind(this),
      this.logger,
    );
    await this.syncManager.loadMetadata();

    if (this.settings.syncStrategy == "interval") {
      this.restartSyncInterval();
    }

    this.app.workspace.onLayoutReady(async () => {
      // Create the events handling only after tha layout is ready to avoid
      // getting spammed with create events.
      // See the official Obsidian docs:
      // https://docs.obsidian.md/Reference/TypeScript+API/Vault/on('create')
      await this.syncManager.startEventsListener();

      // Load the ribbons after layout is ready so they're shown after the core
      // buttons
      if (this.settings.showStatusBarItem) {
        this.showStatusBarItem();
      }

      if (this.settings.showSyncRibbonButton) {
        this.showSyncRibbonIcon();
      }
    });

    this.addCommand({
      id: "sync-files",
      name: "Sync with GitHub",
      repeatable: false,
      icon: "refresh-cw",
      callback: async () => {
        await this.syncManager.sync();
        this.updateStatusBarItem();
      },
    });
  }

  async onunload() {
    this.stopSyncInterval();
  }

  showStatusBarItem() {
    if (this.statusBarItem) {
      return;
    }
    this.statusBarItem = this.addStatusBarItem();

    if (!this.activeLeafChangeListener) {
      this.activeLeafChangeListener = this.app.workspace.on(
        "active-leaf-change",
        () => this.updateStatusBarItem(),
      );
    }
    if (!this.vaultCreateListener) {
      this.vaultCreateListener = this.app.vault.on("create", () => {
        this.updateStatusBarItem();
      });
    }
    if (!this.vaultModifyListener) {
      this.vaultModifyListener = this.app.vault.on("modify", () => {
        this.updateStatusBarItem();
      });
    }
  }

  hideStatusBarItem() {
    this.statusBarItem?.remove();
    this.statusBarItem = null;
  }

  updateStatusBarItem() {
    if (!this.statusBarItem) {
      return;
    }
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      return;
    }

    let state = "Unknown";
    const fileData = this.syncManager.getFileMetadata(activeFile.path);
    if (!fileData) {
      state = "Untracked";
    } else if (fileData.dirty) {
      state = "Outdated";
    } else if (!fileData.dirty) {
      state = "Up to date";
    }

    this.statusBarItem.setText(`GitHub: ${state}`);
  }

  showSyncRibbonIcon() {
    if (this.uploadModifiedFilesRibbonIcon) {
      return;
    }
    this.uploadModifiedFilesRibbonIcon = this.addRibbonIcon(
      "refresh-cw",
      "Sync with GitHub",
      async () => {
        await this.syncManager.sync();
        this.updateStatusBarItem();
      },
    );
  }

  hideUploadModifiedFilesRibbonIcon() {
    this.uploadModifiedFilesRibbonIcon?.remove();
    this.uploadModifiedFilesRibbonIcon = null;
  }

  async onConflicts(
    conflicts: { remoteFile: FileMetadata; localFile: FileMetadata }[],
  ): Promise<boolean[]> {
    return await Promise.all(
      conflicts.map(
        async ({
          remoteFile,
          localFile,
        }: {
          remoteFile: FileMetadata;
          localFile: FileMetadata;
        }) => {
          // TODO: Add a proper conflict resolution view
          // This way remote files are always preferred
          return true;
        },
      ),
    );
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  // Proxy methods from sync manager to ease handling the interval
  // when settings are changed
  startSyncInterval() {
    const intervalID = this.syncManager.startSyncInterval(
      this.settings.syncInterval,
    );
    this.registerInterval(intervalID);
  }

  stopSyncInterval() {
    this.syncManager.stopSyncInterval();
  }

  restartSyncInterval() {
    this.syncManager.stopSyncInterval();
    this.syncManager.startSyncInterval(this.settings.syncInterval);
  }
}
