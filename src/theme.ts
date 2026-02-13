import type { ITheme } from "xterm";

function getCssVar(name: string): string {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}

function isDarkTheme(): boolean {
  return document.body.classList.contains("theme-dark");
}

// One Dark palette for dark mode
const DARK_ANSI: Partial<ITheme> = {
  black: "#282c34",
  red: "#e06c75",
  green: "#98c379",
  yellow: "#e5c07b",
  blue: "#61afef",
  magenta: "#c678dd",
  cyan: "#56b6c2",
  white: "#abb2bf",
  brightBlack: "#5c6370",
  brightRed: "#e06c75",
  brightGreen: "#98c379",
  brightYellow: "#e5c07b",
  brightBlue: "#61afef",
  brightMagenta: "#c678dd",
  brightCyan: "#56b6c2",
  brightWhite: "#ffffff",
};

// One Light palette for light mode
const LIGHT_ANSI: Partial<ITheme> = {
  black: "#383a42",
  red: "#e45649",
  green: "#50a14f",
  yellow: "#c18401",
  blue: "#4078f2",
  magenta: "#a626a4",
  cyan: "#0184bc",
  white: "#a0a1a7",
  brightBlack: "#696c77",
  brightRed: "#e45649",
  brightGreen: "#50a14f",
  brightYellow: "#c18401",
  brightBlue: "#4078f2",
  brightMagenta: "#a626a4",
  brightCyan: "#0184bc",
  brightWhite: "#fafafa",
};

export function buildTheme(): ITheme {
  const dark = isDarkTheme();
  const ansi = dark ? DARK_ANSI : LIGHT_ANSI;

  const bg = getCssVar("--background-primary") || (dark ? "#1e1e1e" : "#ffffff");
  const fg = getCssVar("--text-normal") || (dark ? "#dcddde" : "#383a42");
  const cursor = getCssVar("--text-accent") || (dark ? "#61afef" : "#4078f2");
  const selectionBg = getCssVar("--text-selection") || (dark ? "rgba(97,175,239,0.3)" : "rgba(64,120,242,0.3)");

  return {
    background: bg,
    foreground: fg,
    cursor: cursor,
    cursorAccent: bg,
    selectionBackground: selectionBg,
    selectionForeground: undefined,
    ...ansi,
  };
}
