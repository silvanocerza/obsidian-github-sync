import { PluginSettingTab, App, Setting, TextComponent } from "obsidian";
import GitHubSyncPlugin from "src/main";

export default class GitHubSyncSettingsTab extends PluginSettingTab {
  plugin: GitHubSyncPlugin;

  constructor(app: App, plugin: GitHubSyncPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h1", { text: "GitHub Sync Settings" });

    containerEl.createEl("h2", { text: "Repository settings" });

    let tokenInput: TextComponent;
    new Setting(containerEl)
      .setName("GitHub Token")
      .setDesc(
        "A personal access token or a fine-grained token with read and write access to your repository",
      )
      .addButton((button) =>
        button.setIcon("eye-off").onClick((e) => {
          if (tokenInput.inputEl.type === "password") {
            tokenInput.inputEl.type = "text";
            button.setIcon("eye");
          } else {
            tokenInput.inputEl.type = "password";
            button.setIcon("eye-off");
          }
        }),
      )
      .addText((text) => {
        text
          .setPlaceholder("Token")
          .setValue(this.plugin.settings.githubToken)
          .onChange(async (value) => {
            this.plugin.settings.githubToken = value;
            await this.plugin.saveSettings();
          }).inputEl.type = "password";
        tokenInput = text;
      });

    new Setting(containerEl)
      .setName("Owner")
      .setDesc("Owner of the repository to sync")
      .addText((text) =>
        text
          .setPlaceholder("Owner")
          .setValue(this.plugin.settings.githubOwner)
          .onChange(async (value) => {
            this.plugin.settings.githubOwner = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Repository")
      .setDesc("Name of the repository to sync")
      .addText((text) =>
        text
          .setPlaceholder("Repository")
          .setValue(this.plugin.settings.githubRepo)
          .onChange(async (value) => {
            this.plugin.settings.githubRepo = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Repository branch")
      .setDesc("Branch to sync")
      .addText((text) =>
        text
          .setPlaceholder("Branch name")
          .setValue(this.plugin.settings.githubBranch)
          .onChange(async (value) => {
            this.plugin.settings.githubBranch = value;
            await this.plugin.saveSettings();
          }),
      );

    containerEl.createEl("h2", { text: "Sync settings" });

    new Setting(containerEl)
      .setName("Repository content path")
      .setDesc(
        `The path to sync, relative to the repository root.
        If not set the whole repository will be synced.`,
      )
      .addText((text) =>
        text
          .setPlaceholder("Exaple: blog/content")
          .setValue(this.plugin.settings.repoContentPath)
          .onChange(async (value) => {
            // TODO: Change the local path if already fetched
            this.plugin.settings.repoContentPath = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Local path")
      .setDesc(
        `The local path to sync, relative to the vault root.
        Defaults to the repository name if not set.`,
      )
      .addText((text) =>
        text
          .setPlaceholder("Exaple: folder/blog-posts")
          .setValue(this.plugin.settings.localPath)
          .onChange(async (value) => {
            // TODO: Move the folder if already fetched
            this.plugin.settings.localPath = value;
            await this.plugin.saveSettings();
          }),
      );

    const saveStrategies = {
      save: "On file save",
      manual: "Manually",
      interval: "On Interval",
    };
    const saveStrategySetting = new Setting(containerEl)
      .setName("Sync strategy")
      .setDesc("When to sync the local files with the remote repository");

    let syncInterval = "1";
    if (this.plugin.settings.syncInterval) {
      syncInterval = this.plugin.settings.syncInterval.toString();
    }
    const intervalSettings = new Setting(containerEl)
      .setName("Sync interval")
      .setDesc("Sync interval in minutes between automatic synchronizations")
      .addText((text) =>
        text
          .setPlaceholder("Interval in minutes")
          .setValue(syncInterval)
          .onChange(async (value) => {
            this.plugin.settings.syncInterval = parseInt(value) || 1;
            await this.plugin.saveSettings();
          }),
      );
    intervalSettings.setDisabled(
      this.plugin.settings.syncStrategy !== "interval",
    );

    saveStrategySetting.addDropdown((dropdown) =>
      dropdown
        .addOptions(saveStrategies)
        .setValue(this.plugin.settings.syncStrategy)
        .onChange(async (value: keyof typeof saveStrategies) => {
          intervalSettings.setDisabled(value !== "interval");
          this.plugin.settings.syncStrategy = value;
          await this.plugin.saveSettings();
        }),
    );
  }
}