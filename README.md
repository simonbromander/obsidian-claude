# Claude Code Terminal

Obsidian plugin that embeds a [Claude Code](https://claude.ai/code) CLI terminal directly in the sidebar. Run Claude Code without leaving your vault.

## Requirements
- Obsidian desktop (macOS, Windows, Linux)
- [Claude Code CLI](https://claude.ai/code) installed (`claude` in PATH, or configure full path in settings)
- npm (for one-time dependency install on first open)

## Usage
1. Install from Obsidian → Settings → Community plugins
2. Click the terminal icon in the ribbon, or run **"Open Claude Code terminal"** from the command palette
3. On first open, the plugin installs its terminal dependency automatically (~5–10s)
4. Claude Code launches in the sidebar panel

The terminal opens in the current vault root by default. Use the **Restart** button or command palette to relaunch.

## Settings
| Setting | Default | Description |
|---|---|---|
| Claude CLI path | `claude` | Full path if `claude` is not in Electron's PATH (e.g. `~/.local/bin/claude`) |
| Shell | `/bin/zsh` | Shell to use for the terminal |
| Working directory | vault root | Override the initial working directory |
| Font size | 13px | Terminal font size |
| Auto-launch Claude | on | Run `claude` automatically when the terminal opens |

## Troubleshooting

**"Failed to install node-pty-prebuilt-multiarch"**
npm could not be found in Electron's PATH. Open a terminal and run:
```bash
cd "$(find ~/Library/Application\ Support/obsidian -name 'obsidian-claude-code' -type d 2>/dev/null | head -1)"
npm install node-pty-prebuilt-multiarch
```
Then restart the terminal panel in Obsidian.

**`claude` command not found**
Obsidian may not inherit your shell's PATH. Set the full path to the Claude binary in Settings → Claude Code Terminal → Claude CLI path (e.g. `/Users/you/.local/bin/claude`).

**Obsidian hotkeys (Cmd+P etc.) not working when terminal is focused**
xterm.js captures keyboard input. Click outside the terminal first, or use the command palette after moving focus.

## Development
```bash
# Point to your vault's plugin directory
export OBSIDIAN_PLUGIN_DIR="$HOME/path/to/vault/.obsidian/plugins/obsidian-claude-code"

bun install
bun run dev      # watch mode — builds directly to OBSIDIAN_PLUGIN_DIR
bun run build    # production build — outputs to dist/
bun run release  # production build + LICENSE → dist/ (GitHub release assets)
```

## License
MIT — see [LICENSE](LICENSE)
