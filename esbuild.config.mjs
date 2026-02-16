import esbuild from "esbuild";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.argv[2] === "production";

const vaultPluginDir = path.join(
  process.env.HOME,
  "Obsidian",
  "simbro",
  ".obsidian",
  "plugins",
  "obsidian-claude-code"
);

// Ensure output directory exists
fs.mkdirSync(vaultPluginDir, { recursive: true });

// Copy manifest.json and styles.css to vault plugin dir
fs.copyFileSync(
  path.join(__dirname, "manifest.json"),
  path.join(vaultPluginDir, "manifest.json")
);
fs.copyFileSync(
  path.join(__dirname, "styles.css"),
  path.join(vaultPluginDir, "styles.css")
);

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
    "node-pty",
  ],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  sourcemap: isProduction ? false : "inline",
  treeShaking: true,
  outfile: path.join(vaultPluginDir, "main.js"),
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
