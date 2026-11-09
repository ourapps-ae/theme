// Renders a themes file to CSS variables, Swift constants and Kotlin constants.
// Usage: node build-tokens.ts [themes.json] [--css DIR] [--swift DIR] [--kotlin DIR]
// Defaults write beside this component's own sources (implementation/web, apple/Sources, android/...).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderCss, renderKotlin, renderSwift, validateTokens } from "./tokens.ts";
import type { ThemeFile } from "./tokens.ts";

export function buildAll(file: ThemeFile): { css: string; swift: string; kotlin: string } {
  const problems = file.themes.flatMap((t) => validateTokens(t).map((p) => `${t.name}: ${p}`));
  if (problems.length) throw new Error(problems.join("; "));
  return { css: renderCss(file), swift: renderSwift(file), kotlin: renderKotlin(file) };
}

if (import.meta.main) {
  const here = dirname(fileURLToPath(import.meta.url));
  const args = process.argv.slice(2);
  const option = (name: string, fallback: string) => {
    const i = args.indexOf(name);
    return i >= 0 ? resolve(args[i + 1]) : fallback;
  };
  const input = args[0] && !args[0].startsWith("--") ? resolve(args[0]) : join(here, "themes.json");
  const out = buildAll(JSON.parse(readFileSync(input, "utf8")));
  const targets: [string, string][] = [
    [join(option("--css", here), "theme.css"), out.css],
    [join(option("--swift", join(here, "../apple/Sources")), "ThemeTokens.swift"), out.swift],
    [join(option("--kotlin", join(here, "../android/src/main/java/ae/theme")), "ThemeTokens.kt"), out.kotlin],
  ];
  for (const [path, text] of targets) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
    console.log(`wrote ${path}`);
  }
}
