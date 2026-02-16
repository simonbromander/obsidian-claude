# obsidian-claude
Obsidian plugin that embeds a Claude Code CLI terminal in the right sidebar. Uses xterm.js for rendering and node-pty for pseudo-terminal spawning. Desktop only (macOS).

## Architecture
```
Obsidian Right Sidebar
  └─ ClaudeCodeView (ItemView)
       ├─ Toolbar: status dot + clear/restart buttons
       └─ Terminal area: xterm.js canvas
              │ stdin/stdout
              └─ node-pty → spawns shell → auto-runs `claude`
```

## Setup
### Build
```bash
bun install
bun run build
```
Build outputs directly to the vault plugin directory at `~/Obsidian/simbro/.obsidian/plugins/obsidian-claude-code/`.

### node-pty
node-pty must be compiled against Obsidian's Electron version. Find the version in Obsidian DevTools (`Cmd+Opt+I` → `process.versions.electron`), then:
```bash
cd ~/Obsidian/simbro/.obsidian/plugins/obsidian-claude-code
npm init -y && npm install node-pty
npx @electron/rebuild -f -w node-pty -v <ELECTRON_VERSION>
```

### Enable
1. Obsidian Settings → Community plugins → Reload plugins
2. Toggle on "Claude Code Terminal"
3. Click the terminal ribbon icon to open the sidebar

## Settings
| Setting | Default | Description |
|---------|---------|-------------|
| Claude CLI path | `claude` | Full path to claude binary if not in PATH |
| Shell path | `/bin/zsh` | Shell to spawn |
| Working directory | vault root | Initial working directory |
| Font size | 13 | Terminal font size in pixels |
| Auto-launch | on | Automatically run `claude` when terminal opens |

## Theme
Obsidian CSS variables (`--background-primary`, `--text-normal`, `--text-accent`) map to xterm.js theme. ANSI palette uses One Dark (dark mode) and One Light (light mode). Theme refreshes automatically on Obsidian theme change.

## Known Issues
- **Electron version mismatch**: Obsidian updates may break node-pty. Rebuild with the new Electron version.
- **PATH in Electron**: Apps launched from Finder may not inherit shell PATH. Set explicit claude path in settings.
- **Keyboard conflicts**: xterm.js captures input aggressively. `macOptionIsMeta` is enabled. Obsidian hotkeys (Cmd+P, Cmd+E) may need pass-through.
