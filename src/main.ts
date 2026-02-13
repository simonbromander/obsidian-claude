import { Plugin, WorkspaceLeaf } from "obsidian";
import { ClaudeCodeView, VIEW_TYPE_CLAUDE_CODE } from "./claude-view";
import {
  ClaudeCodeSettings,
  ClaudeCodeSettingTab,
  DEFAULT_SETTINGS,
} from "./settings";

export default class ClaudeCodePlugin extends Plugin {
  settings: ClaudeCodeSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

    // Register view
    this.registerView(VIEW_TYPE_CLAUDE_CODE, (leaf) => {
      const vaultPath = (this.app.vault.adapter as any).basePath || "";
      return new ClaudeCodeView(leaf, this.settings, vaultPath);
    });

    // Ribbon icon
    this.addRibbonIcon("terminal", "Open Claude Code", () => {
      this.activateView();
    });

    // Commands
    this.addCommand({
      id: "open-claude-code",
      name: "Open Claude Code terminal",
      callback: () => this.activateView(),
    });

    this.addCommand({
      id: "restart-claude-code",
      name: "Restart Claude Code terminal",
      callback: () => {
        const view = this.getView();
        if (view) {
          const vaultPath = (this.app.vault.adapter as any).basePath || "";
          (view as any).terminalManager.restart(this.settings, vaultPath);
        }
      },
    });

    // Settings tab
    this.addSettingTab(new ClaudeCodeSettingTab(this.app, this));

    // Theme change listener
    this.registerEvent(
      this.app.workspace.on("css-change", () => {
        const view = this.getView();
        if (view) {
          view.refreshTheme();
        }
      })
    );

    // Refit terminal on layout change
    this.registerEvent(
      this.app.workspace.on("resize", () => {
        const view = this.getView();
        if (view) {
          view.refit();
        }
      })
    );
  }

  async onunload(): Promise<void> {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_CLAUDE_CODE);
  }

  private getView(): ClaudeCodeView | null {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_CLAUDE_CODE);
    if (leaves.length > 0) {
      return leaves[0].view as ClaudeCodeView;
    }
    return null;
  }

  private async activateView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_CLAUDE_CODE);

    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }

    const leaf = this.app.workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({
        type: VIEW_TYPE_CLAUDE_CODE,
        active: true,
      });
      this.app.workspace.revealLeaf(leaf);
    }
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    // Update existing view with new settings
    const view = this.getView();
    if (view) {
      view.updateSettings(this.settings);
    }
  }
}
