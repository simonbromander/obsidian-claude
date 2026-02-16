import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { buildTheme } from "./theme";
import type { ClaudeCodeSettings } from "./settings";

// node-pty types
interface IPty {
  onData: (callback: (data: string) => void) => { dispose: () => void };
  onExit: (callback: (e: { exitCode: number; signal?: number }) => void) => { dispose: () => void };
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  kill: (signal?: string) => void;
  pid: number;
}

interface NodePtyModule {
  spawn: (
    file: string,
    args: string[],
    options: {
      name?: string;
      cols?: number;
      rows?: number;
      cwd?: string;
      env?: Record<string, string>;
    }
  ) => IPty;
}

export class TerminalManager {
  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private pty: IPty | null = null;
  private ptyModule: NodePtyModule | null = null;
  private disposables: { dispose: () => void }[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private containerEl: HTMLElement | null = null;
  private _isRunning = false;

  onStatusChange: ((running: boolean) => void) | null = null;

  get isRunning(): boolean {
    return this._isRunning;
  }

  private setRunning(value: boolean): void {
    this._isRunning = value;
    this.onStatusChange?.(value);
  }

  private loadNodePty(): NodePtyModule {
    if (this.ptyModule) return this.ptyModule;

    // In Obsidian (Electron), require native modules via electronRequire
    // node-pty must be installed in the plugin directory
    const electronRequire = (window as any).require;
    if (!electronRequire) {
      throw new Error("electronRequire not available. This plugin requires Obsidian desktop.");
    }

    // Try loading from the plugin's own directory first
    const path = electronRequire("path") as typeof import("path");
    const pluginDir = path.join(
      (this as any)._pluginDir ||
        path.join(
          process.env.HOME || "",
          "Obsidian",
          "simbro",
          ".obsidian",
          "plugins",
          "obsidian-claude-code"
        ),
      "node_modules",
      "node-pty"
    );

    try {
      this.ptyModule = electronRequire(pluginDir) as NodePtyModule;
    } catch {
      // Fallback: try global require
      try {
        this.ptyModule = electronRequire("node-pty") as NodePtyModule;
      } catch {
        throw new Error(
          "node-pty not found. Install it in the plugin directory:\n\n" +
            "cd \"$VAULT/.obsidian/plugins/obsidian-claude-code\"\n" +
            "npm init -y && npm install node-pty\n" +
            "npx @electron/rebuild -f -w node-pty -v <ELECTRON_VERSION>\n\n" +
            "Find Electron version: Obsidian DevTools (Cmd+Opt+I) → process.versions.electron"
        );
      }
    }

    return this.ptyModule!;
  }

  open(container: HTMLElement, settings: ClaudeCodeSettings, vaultPath: string): void {
    this.containerEl = container;

    const theme = buildTheme();

    this.terminal = new Terminal({
      theme,
      fontSize: settings.fontSize,
      fontFamily: "Menlo, Monaco, 'Courier New', monospace",
      cursorBlink: true,
      cursorStyle: "block",
      scrollback: 10000,
      macOptionIsMeta: true,
      allowProposedApi: true,
      drawBoldTextInBrightColors: true,
    });

    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.open(container);

    // Initial fit
    requestAnimationFrame(() => {
      this.fit();
    });

    // Watch for container resize
    this.resizeObserver = new ResizeObserver(() => {
      this.fit();
    });
    this.resizeObserver.observe(container);

    // Spawn PTY
    this.spawn(settings, vaultPath);
  }

  private spawn(settings: ClaudeCodeSettings, vaultPath: string): void {
    if (!this.terminal || !this.fitAddon) return;

    try {
      const ptyMod = this.loadNodePty();
      const cwd = settings.workingDir || vaultPath;

      // Build environment with PATH from shell profile
      const env: Record<string, string> = {
        ...process.env as Record<string, string>,
        TERM: "xterm-256color",
        COLORTERM: "truecolor",
      };

      // Ensure common paths are in PATH
      const extraPaths = [
        `${process.env.HOME}/.local/bin`,
        "/opt/homebrew/bin",
        "/usr/local/bin",
      ];
      const currentPath = env.PATH || "";
      for (const p of extraPaths) {
        if (!currentPath.includes(p)) {
          env.PATH = `${p}:${env.PATH}`;
        }
      }

      this.pty = ptyMod.spawn(settings.shellPath, [], {
        name: "xterm-256color",
        cols: this.terminal.cols,
        rows: this.terminal.rows,
        cwd,
        env,
      });

      this.setRunning(true);

      // Wire PTY output → terminal
      const dataDisp = this.pty.onData((data) => {
        this.terminal?.write(data);
      });
      this.disposables.push(dataDisp);

      // Wire terminal input → PTY
      const inputDisp = this.terminal.onData((data) => {
        this.pty?.write(data);
      });
      this.disposables.push(inputDisp);

      // Handle exit
      const exitDisp = this.pty.onExit(({ exitCode }) => {
        this.setRunning(false);
        this.terminal?.write(
          `\r\n\x1b[90m[Process exited with code ${exitCode}. Press any key to restart.]\x1b[0m\r\n`
        );
        // Wait for keypress to restart
        const restartDisp = this.terminal!.onKey(() => {
          restartDisp.dispose();
          this.restart(settings, vaultPath);
        });
        this.disposables.push(restartDisp);
      });
      this.disposables.push(exitDisp);

      // Auto-launch claude
      if (settings.autoLaunch) {
        setTimeout(() => {
          const claudeCmd = settings.claudePath || "claude";
          this.pty?.write(`${claudeCmd}\r`);
        }, 300);
      }
    } catch (err: any) {
      this.setRunning(false);
      const errorEl = this.containerEl?.createEl("div", {
        cls: "claude-code-error",
        text: err.message || String(err),
      });
      if (errorEl) {
        this.containerEl?.appendChild(errorEl);
      }
    }
  }

  restart(settings: ClaudeCodeSettings, vaultPath: string): void {
    this.killPty();
    this.terminal?.clear();
    this.spawn(settings, vaultPath);
  }

  clear(): void {
    this.terminal?.clear();
  }

  fit(): void {
    try {
      this.fitAddon?.fit();
      if (this.pty && this.terminal) {
        this.pty.resize(this.terminal.cols, this.terminal.rows);
      }
    } catch {
      // Fit can throw if element is not visible
    }
  }

  refreshTheme(): void {
    if (this.terminal) {
      this.terminal.options.theme = buildTheme();
    }
  }

  private killPty(): void {
    if (this.pty) {
      try {
        this.pty.kill();
      } catch {
        // Already dead
      }
      this.pty = null;
    }
    this.setRunning(false);
  }

  dispose(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];

    this.killPty();

    this.terminal?.dispose();
    this.terminal = null;
    this.fitAddon = null;
    this.containerEl = null;
  }
}
