import { join } from "path";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { buildTheme } from "./theme";
import type { ClaudeCodeSettings } from "./settings";

type TerminalStatus = "running" | "stopped" | "error";

const PTY_PACKAGE = "node-pty-prebuilt-multiarch";

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
  private _status: TerminalStatus = "stopped";
  private pluginDir: string;

  onStatusChange: ((status: TerminalStatus) => void) | null = null;

  constructor(pluginDir: string) {
    this.pluginDir = pluginDir;
  }

  get isRunning(): boolean {
    return this._status === "running";
  }

  private setStatus(status: TerminalStatus): void {
    this._status = status;
    this.onStatusChange?.(status);
  }

  private get electronRequire(): NodeJS.Require {
    const w = window as Window & { require?: NodeJS.Require };
    const req = w.require;
    if (!req) throw new Error("This plugin requires Obsidian desktop.");
    return req;
  }

  private get extendedEnv(): Record<string, string> {
    const extraPaths = [
      `${process.env.HOME}/.local/bin`,
      "/opt/homebrew/bin",
      "/usr/local/bin",
      "/usr/bin",
    ];
    const base = { ...(process.env as Record<string, string>) };
    const currentPath = base.PATH ?? "";
    const prefixes = extraPaths.filter((p) => !currentPath.includes(p)).join(":");
    base.PATH = prefixes ? `${prefixes}:${currentPath}` : currentPath;
    return base;
  }

  private async ensureNodePty(): Promise<NodePtyModule> {
    if (this.ptyModule) return this.ptyModule;

    const req = this.electronRequire;

    if (this.pluginDir) {
      const packagePath = join(this.pluginDir, "node_modules", PTY_PACKAGE);
      const fs = req("fs") as typeof import("fs");

      if (!fs.existsSync(packagePath)) {
        this.terminal?.write(
          `\x1b[33mInstalling ${PTY_PACKAGE} (first time only)...\x1b[0m\r\n`
        );
        await this.npmInstall();
        this.terminal?.write(`\x1b[32mDone.\x1b[0m\r\n\r\n`);
      }

      this.ptyModule = req(packagePath) as NodePtyModule;
    } else {
      // Fallback if pluginDir couldn't be resolved
      this.ptyModule = req(PTY_PACKAGE) as NodePtyModule;
    }

    return this.ptyModule;
  }

  private npmInstall(): Promise<void> {
    return new Promise((resolve, reject) => {
      const { exec } = this.electronRequire(
        "child_process"
      ) as typeof import("child_process");

      exec(
        `npm install ${PTY_PACKAGE}`,
        { cwd: this.pluginDir, env: this.extendedEnv },
        (err, _stdout, stderr) => {
          if (err) {
            reject(
              new Error(
                `Failed to install ${PTY_PACKAGE}:\n${stderr || err.message}\n\n` +
                  "Ensure npm is installed and in your PATH, then restart the terminal."
              )
            );
          } else {
            resolve();
          }
        }
      );
    });
  }

  open(container: HTMLElement, settings: ClaudeCodeSettings, vaultPath: string): void {
    this.containerEl = container;

    this.terminal = new Terminal({
      theme: buildTheme(),
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

    requestAnimationFrame(() => this.fit());

    this.resizeObserver = new ResizeObserver(() => this.fit());
    this.resizeObserver.observe(container);

    this.doSpawn(settings, vaultPath);
  }

  private doSpawn(settings: ClaudeCodeSettings, vaultPath: string): void {
    this.spawnAsync(settings, vaultPath).catch((err: Error) => {
      this.setStatus("error");
      const errorEl = document.createElement("div");
      errorEl.className = "claude-code-error";
      errorEl.textContent = err.message;
      this.containerEl?.appendChild(errorEl);
    });
  }

  private async spawnAsync(settings: ClaudeCodeSettings, vaultPath: string): Promise<void> {
    if (!this.terminal || !this.fitAddon) return;

    const ptyMod = await this.ensureNodePty();
    const cwd = settings.workingDir || vaultPath;

    this.pty = ptyMod.spawn(settings.shellPath, [], {
      name: "xterm-256color",
      cols: this.terminal.cols,
      rows: this.terminal.rows,
      cwd,
      env: {
        ...this.extendedEnv,
        TERM: "xterm-256color",
        COLORTERM: "truecolor",
      },
    });

    this.setStatus("running");

    const dataDisp = this.pty.onData((data) => this.terminal?.write(data));
    this.disposables.push(dataDisp);

    const inputDisp = this.terminal.onData((data) => this.pty?.write(data));
    this.disposables.push(inputDisp);

    const exitDisp = this.pty.onExit(({ exitCode }) => {
      this.setStatus("stopped");
      this.terminal?.write(
        `\r\n\x1b[90m[Process exited with code ${exitCode}. Press any key to restart.]\x1b[0m\r\n`
      );
      const restartDisp = this.terminal!.onKey(() => {
        restartDisp.dispose();
        this.doSpawn(settings, vaultPath);
      });
      this.disposables.push(restartDisp);
    });
    this.disposables.push(exitDisp);

    if (settings.autoLaunch) {
      setTimeout(() => {
        const claudeCmd = settings.claudePath || "claude";
        this.pty?.write(`${claudeCmd}\r`);
      }, 300);
    }
  }

  restart(settings: ClaudeCodeSettings, vaultPath: string): void {
    this.killPty();
    this.terminal?.clear();
    this.doSpawn(settings, vaultPath);
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
    this.setStatus("stopped");
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
