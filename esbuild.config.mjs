import esbuild from "esbuild";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.argv[2] === "production";

// For dev: set OBSIDIAN_PLUGIN_DIR to your vault's plugin directory
// e.g. export OBSIDIAN_PLUGIN_DIR="$HOME/path/to/vault/.obsidian/plugins/obsidian-claude-code"
// For production: builds to dist/
const outDir = process.env.OBSIDIAN_PLUGIN_DIR || path.join(__dirname, "dist");

fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(path.join(__dirname, "manifest.json"), path.join(outDir, "manifest.json"));
fs.copyFileSync(path.join(__dirname, "styles.css"), path.join(outDir, "styles.css"));

const context = await esbuild.context({
  entryPoints: [path.join(__dirname, "src", "main.ts")],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    "node-pty-prebuilt-multiarch",
  ],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  sourcemap: isProduction ? false : "inline",
  treeShaking: true,
  outfile: path.join(outDir, "main.js"),
  platform: "node",
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      isProduction ? "production" : "development"
    ),
  },
});

if (isProduction) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
  console.log("Watching for changes...");
}
