import { App, PluginSettingTab, Setting } from "obsidian";
import type ClaudeCodePlugin from "./main";

export interface ClaudeCodeSettings {
  claudePath: string;
  shellPath: string;
  workingDir: string;
  fontSize: number;
  autoLaunch: boolean;
}

export const DEFAULT_SETTINGS: ClaudeCodeSettings = {
  claudePath: "claude",
  shellPath: "/bin/zsh",
  workingDir: "",
  fontSize: 13,
  autoLaunch: true,
};

export class ClaudeCodeSettingTab extends PluginSettingTab {
  plugin: ClaudeCodePlugin;

  constructor(app: App, plugin: ClaudeCodePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Claude CLI path")
      .setDesc(
        "Path to the claude binary. Use full path if not in Electron's PATH (e.g. ~/.local/bin/claude)."
      )
      .addText((text) =>
        text
          .setPlaceholder("claude")
          .setValue(this.plugin.settings.claudePath)
          .onChange((value) => {
            this.plugin.settings.claudePath = value || "claude";
            void this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Shell path")
      .setDesc("Shell to spawn for the terminal.")
      .addText((text) =>
        text
          .setPlaceholder("/bin/zsh")
          .setValue(this.plugin.settings.shellPath)
          .onChange((value) => {
            this.plugin.settings.shellPath = value || "/bin/zsh";
            void this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Working directory")
      .setDesc(
        "Initial working directory. Leave empty to use vault root."
      )
      .addText((text) =>
        text
          .setPlaceholder("(vault root)")
          .setValue(this.plugin.settings.workingDir)
          .onChange((value) => {
            this.plugin.settings.workingDir = value;
            void this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Font size")
      .setDesc("Terminal font size in pixels.")
      .addSlider((slider) =>
        slider
          .setLimits(10, 24, 1)
          .setValue(this.plugin.settings.fontSize)
          .setDynamicTooltip()
          .onChange((value) => {
            this.plugin.settings.fontSize = value;
            void this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Auto-launch Claude")
      .setDesc(
        "Automatically run the claude command when terminal opens."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoLaunch)
          .onChange((value) => {
            this.plugin.settings.autoLaunch = value;
            void this.plugin.saveSettings();
          })
      );
  }
}
