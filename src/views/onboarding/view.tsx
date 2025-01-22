import { Modal } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import GitHubSyncPlugin from "src/main";
import { PluginContext } from "src/views/hooks";
import OnboardingDialogComponent from "./component";

export class OnboardingDialog extends Modal {
  root: Root | null = null;

  constructor(private plugin: GitHubSyncPlugin) {
    super(plugin.app);
  }

  onOpen() {
    this.root = createRoot(this.modalEl);
    // Make the dialog look like the settings modal
    this.modalEl.addClass("mod-settings");
    this.modalEl.addClass("mod-sidebar-layout");

    this.root.render(
      <PluginContext.Provider value={this.plugin}>
        <OnboardingDialogComponent
          onClose={async () => {
            this.plugin.settings.firstStart = false;
            await this.plugin.saveSettings();
            this.close();
          }}
        />
      </PluginContext.Provider>,
    );
  }

  async onClose() {
    const { contentEl } = this;
    this.root?.unmount();
    contentEl.empty();
  }
}
