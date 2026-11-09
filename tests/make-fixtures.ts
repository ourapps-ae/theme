// Writes tests/fixtures/background.json: expected frames from the TypeScript maths, for the native checks.
import { readFileSync, writeFileSync } from "node:fs";
import { glyphFrame, speckFrame } from "../implementation/web/background.ts";
import type { Particle, Speck } from "../implementation/web/background.ts";
import type { ThemeFile } from "../implementation/web/tokens.ts";

export function build() {
  const file: ThemeFile = JSON.parse(readFileSync(new URL("../implementation/web/themes.json", import.meta.url), "utf8"));
  const particles: Particle[] = [
    { x: 0.31, y: -0.22, period: 18, phase: 0.1, spin: 9, sway: 1.2, sprite: 2 },
    { x: -0.6, y: 0.4, period: 22, phase: 0.55, spin: -12, sway: 4.0, sprite: 0 },
    { x: 0.05, y: 0.05, period: 14, phase: 0.9, spin: 3, sway: 0.4, sprite: 1 },
  ];
  const specks: Speck[] = [{ x: 0.3, phase: 0.2, period: 20, size: 2, wobble: 1 }, { x: 0.8, phase: 0.7, period: 30, size: 3, wobble: 5 }];
  const times = [0, 3.5, 11, 47.25];
  const out = { glyphCases: [] as unknown[], speckCases: [] as unknown[] };
  for (const theme of file.themes) {
    const style = theme.background;
    for (const t of times) for (const p of particles) {
      const light = style.glowFromTop ? 0.75 + 0.1 * Math.sin(t * 0.7) : 0.6 + 0.2 * Math.sin(t * 1.3) * Math.sin(t * 0.7);
      out.glyphCases.push({ theme: theme.name, particle: p, t, light, width: 390, height: 844, expected: glyphFrame(p, style, t * style.speed, light, 390, 844, 390) });
    }
    for (const t of times) for (const s of specks) out.speckCases.push({ theme: theme.name, speck: s, t, width: 390, height: 844, expected: speckFrame(s, style, t, 390, 844) });
  }
  return JSON.stringify(out, null, 1) + "\n";
}

if (import.meta.main) writeFileSync(new URL("fixtures/background.json", import.meta.url), build());
