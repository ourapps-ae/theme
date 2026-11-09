// A consumer that needs no game: pick the theme from the installer's settings and apply it to a page root.
import { readFileSync } from "node:fs";
import { applyTheme, resolveTheme } from "../implementation/web/tokens.ts";
import type { ThemeFile, ThemeSettings } from "../implementation/web/tokens.ts";

export function styleFor(settings: ThemeSettings): Record<string, string> {
  const file: ThemeFile = JSON.parse(readFileSync(new URL("../implementation/web/themes.json", import.meta.url), "utf8"));
  const applied: Record<string, string> = {};
  applyTheme(resolveTheme(file, settings), { style: { setProperty: (name, value) => { applied[name] = value; } } });
  return applied;
}
