import { join } from "path";
import { FileSystemAdapter, Plugin } from "obsidian";
import { ClaudeCodeView, VIEW_TYPE_CLAUDE_CODE } from "./claude-view";
import {
  ClaudeCodeSettings,
  ClaudeCodeSettingTab,
  DEFAULT_SETTINGS,
} from "./settings";

export default class ClaudeCodePlugin extends Plugin {
  settings: ClaudeCodeSettings = DEFAULT_SETTINGS;

  onload(): void {
    void this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.loadSettings();

    this.registerView(VIEW_TYPE_CLAUDE_CODE, (leaf) => {
      const adapter = this.app.vault.adapter;
      const vaultPath = adapter instanceof FileSystemAdapter ? adapter.getBasePath() : "";
      const pluginDir = vaultPath && this.manifest.dir
        ? join(vaultPath, this.manifest.dir)
        : "";
      return new ClaudeCodeView(leaf, this.settings, vaultPath, pluginDir);
    });

    this.addRibbonIcon("terminal", "Open Claude Code", () => {
      void this.activateView();
    });

    this.addCommand({
      id: "open-claude-code",
      name: "Open terminal",
      callback: () => {
        void this.activateView();
      },
    });

    this.addCommand({
      id: "restart-claude-code",
      name: "Restart terminal",
      callback: () => {
        const view = this.getView();
        if (view) view.restart();
      },
    });

    this.addSettingTab(new ClaudeCodeSettingTab(this.app, this));

    this.registerEvent(
      this.app.workspace.on("css-change", () => {
        this.getView()?.refreshTheme();
      })
    );

    this.registerEvent(
      this.app.workspace.on("resize", () => {
        this.getView()?.refit();
      })
    );
  }

  onunload(): void {
    // Views are cleaned up automatically by Obsidian
  }

  private getView(): ClaudeCodeView | null {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_CLAUDE_CODE);
    if (leaves.length > 0 && leaves[0].view instanceof ClaudeCodeView) {
      return leaves[0].view;
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
    this.getView()?.updateSettings(this.settings);
  }
}
