import { ItemView, WorkspaceLeaf } from "obsidian";
import { TerminalManager } from "./terminal-manager";
import type { ClaudeCodeSettings } from "./settings";

export const VIEW_TYPE_CLAUDE_CODE = "claude-code-terminal";

export class ClaudeCodeView extends ItemView {
  private terminalManager: TerminalManager;
  private statusEl: HTMLElement | null = null;
  private settings: ClaudeCodeSettings;
  private vaultPath: string;

  constructor(
    leaf: WorkspaceLeaf,
    settings: ClaudeCodeSettings,
    vaultPath: string,
    pluginDir: string
  ) {
    super(leaf);
    this.settings = settings;
    this.vaultPath = vaultPath;
    this.terminalManager = new TerminalManager(pluginDir);
  }

  getViewType(): string {
    return VIEW_TYPE_CLAUDE_CODE;
  }

  getDisplayText(): string {
    return "Claude Code";
  }

  getIcon(): string {
    return "terminal";
  }

  async onOpen(): Promise<void> {
    const container = this.contentEl;
    container.empty();
    container.addClass("claude-code-container");

    // Toolbar
    const toolbar = container.createDiv({ cls: "claude-code-toolbar" });

    this.statusEl = toolbar.createDiv({ cls: "claude-code-status" });

    toolbar.createDiv({ cls: "claude-code-toolbar-spacer" });

    const clearBtn = toolbar.createEl("button", { attr: { "aria-label": "Clear terminal" } });
    clearBtn.textContent = "Clear";
    clearBtn.addEventListener("click", () => this.terminalManager.clear());

    const restartBtn = toolbar.createEl("button", { attr: { "aria-label": "Restart terminal" } });
    restartBtn.textContent = "Restart";
    restartBtn.addEventListener("click", () => this.restart());

    // Terminal container
    const terminalEl = container.createDiv({ cls: "claude-code-terminal" });

    this.terminalManager.onStatusChange = (status) => {
      if (this.statusEl) {
        this.statusEl.removeClass("running", "error");
        if (status === "running") this.statusEl.addClass("running");
        else if (status === "error") this.statusEl.addClass("error");
      }
    };

    this.terminalManager.open(terminalEl, this.settings, this.vaultPath);
  }

  async onClose(): Promise<void> {
    this.terminalManager.dispose();
  }

  restart(): void {
    this.terminalManager.restart(this.settings, this.vaultPath);
  }

  refreshTheme(): void {
    this.terminalManager.refreshTheme();
  }

  updateSettings(settings: ClaudeCodeSettings): void {
    this.settings = settings;
  }

  refit(): void {
    this.terminalManager.fit();
  }
}
