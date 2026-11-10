import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { COLOUR_NAMES, accentColour, colourTable, cssVariables, parseColour, parseColourSetting, renderCss, renderKotlin, renderSwift, resolveTheme, shellPalette, themeNames, validateTokens } from "../implementation/web/tokens.ts";
import type { ThemeFile } from "../implementation/web/tokens.ts";
import { buildAll } from "../implementation/web/build-tokens.ts";
import { figureBox, flicker, glyphFrame, makeParticles, makeSpecks, speckFrame } from "../implementation/web/background.ts";
import { build as buildFixtures } from "./make-fixtures.ts";
import { styleFor } from "../examples/consumer.ts";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const file: ThemeFile = JSON.parse(read("../implementation/web/themes.json"));
const night = file.themes[0];

test("the shipped themes match the token schema", () => {
  for (const t of file.themes) assert.deepEqual(validateTokens(t), [], t.name);
  const schema = JSON.parse(read("../implementation/web/tokens.schema.json"));
  assert.deepEqual(Object.keys(schema.properties.colour.properties).sort(), [...COLOUR_NAMES].sort());
  assert.deepEqual(schema.required, ["name", "colour", "spacing", "radii", "type", "background"]);
  assert.deepEqual(Object.keys(schema.properties.background.properties).sort(), Object.keys(night.background).sort());
  assert.deepEqual(Object.keys(schema.properties.type.properties).sort(), Object.keys(night.type).sort());
});

test("the OpenRPC interface describes the token shape and the exported operations", async () => {
  const doc = JSON.parse(read("../interfaces/theme.json"));
  assert.equal(doc.openrpc, "1.3.2");
  assert.deepEqual([doc.info.title, doc.info.version], ["ae/theme", "1.0.0"]);
  const { Tokens, BackgroundStyle, Colour } = doc.components.schemas;
  const schema = JSON.parse(read("../implementation/web/tokens.schema.json"));
  assert.deepEqual(Tokens.required, schema.required);
  assert.deepEqual(Tokens.properties.colour.required, [...COLOUR_NAMES]);
  assert.deepEqual(Object.keys(Tokens.properties.type.properties), Object.keys(schema.properties.type.properties));
  assert.deepEqual(BackgroundStyle.required, schema.properties.background.required);
  assert.equal(BackgroundStyle.properties.specks.type, "integer");
  assert.equal(Colour.pattern, schema.$defs.colour.pattern);
  const modules = { ...(await import("../implementation/web/tokens.ts")), ...(await import("../implementation/web/background.ts")), ...(await import("../implementation/web/build-tokens.ts")) };
  for (const method of doc.methods) assert.equal(typeof modules[method.name.split(".")[0]], "function", method.name);
});

test("invalid tokens are reported one by one", () => {
  const bad = JSON.parse(JSON.stringify(night));
  bad.colour.primary = "gold";
  bad.spacing.md = -1;
  bad.background.specks = 500;
  bad.background.glyphs = "";
  bad.name = "Night";
  assert.equal(validateTokens(bad).length, 5);
  assert.deepEqual(validateTokens(null), ["tokens must be an object"]);
});

test("colours parse with and without alpha", () => {
  assert.deepEqual(parseColour("#e0b35a"), { r: 224, g: 179, b: 90, a: 1 });
  assert.equal(parseColour("#26241f59").a, 0x59 / 255);
  assert.throws(() => parseColour("#12345"));
});

test("settings choose the theme and override the primary and table colours", () => {
  assert.deepEqual(themeNames(file), ["night", "lounge"]);
  assert.equal(resolveTheme(file, {}).name, "night");
  assert.equal(resolveTheme(file, { themeName: "lounge" }).colour.table, "#3b4e2e");
  assert.equal(resolveTheme(file, { themeName: "missing" }).name, "night");
  const custom = resolveTheme(file, { themeName: "night", primaryColour: "#112233", tableColour: "#445566" });
  assert.equal(custom.colour.primary, "#112233");
  assert.equal(custom.colour.table, "#445566");
  assert.equal(file.themes[0].colour.primary, "#e0b35a", "the source theme is not changed");
  assert.equal(resolveTheme(file, { primaryColour: "" }).colour.primary, "#e0b35a");
  assert.equal(resolveTheme(file, { primaryColour: "hex 1D4D3A", tableColour: "hex 112233aa" }).colour.primary, "#1d4d3a", "the installer form starts with a letter and has no #");
  assert.equal(resolveTheme(file, { tableColour: "hex 112233aa" }).colour.table, "#112233aa");
  assert.equal(parseColourSetting("  #AABBCC "), "#aabbcc");
  assert.equal(parseColourSetting("aabbcc"), "#aabbcc");
  for (const bad of ["gold", "hex 12345", "hex", "#12345g", "hex #", "hex aabbccd"]) assert.throws(() => parseColourSetting(bad), /not a colour/, bad);
  assert.throws(() => resolveTheme(file, { primaryColour: "gold" }), /primaryColour is not a colour/);
});

test("CSS variables cover every token and the first theme is the root", () => {
  const vars = cssVariables(night);
  assert.equal(vars["--primary"], "#e0b35a");
  assert.equal(vars["--table-edge"], "#4a2d1c");
  assert.equal(vars["--space-lg"], "16px");
  assert.equal(vars["--radius-pill"], "999px");
  assert.equal(Object.keys(vars).length, COLOUR_NAMES.length + 5 + 4 + 1 + 6 + 2);
  const css = renderCss(file);
  assert.ok(css.indexOf(":root {") < css.indexOf('[data-theme="lounge"] {'));
  assert.equal(css.split("--primary:").length - 1, 2);
});

test("generated CSS, Swift and Kotlin files are what the renderers produce", () => {
  const out = buildAll(file);
  assert.equal(read("../implementation/web/theme.css"), out.css);
  assert.equal(read("../implementation/apple/Sources/ThemeTokens.swift"), out.swift);
  assert.equal(read("../implementation/android/src/main/java/ae/theme/ThemeTokens.kt"), out.kotlin);
  assert.match(renderSwift(file), /ThemeColour\(rgba: 0xE0B35AFF\)/);
  assert.match(renderKotlin(file), /primary = 0xFFE0B35AL/);
  assert.throws(() => buildAll({ ...file, themes: [{ ...night, colour: { ...night.colour, text: "x" } }] }), /text/);
});

test("glyph frames drift toward the viewer, fade in and out, and hide when off screen", () => {
  const p = { x: 0.31, y: -0.22, period: 18, phase: 0.1, spin: 9, sway: 1.2, sprite: 2 };
  const style = night.background;
  let seen = 0, hidden = 0, lastSize = 0;
  for (let t = 0; t < 36; t += 0.25) {
    const f = glyphFrame(p, style, t, flicker(style, t), 390, 844);
    if (!f) { hidden++; continue; }
    seen++;
    assert.ok(f.alpha > 0.01 && f.alpha <= style.suitAlpha, `alpha ${f.alpha}`);
    assert.ok(f.x > -f.size && f.x < 390 + f.size && f.y > -f.size && f.y < 844 + f.size);
    lastSize = f.size;
  }
  assert.ok(seen > 40 && hidden > 5 && lastSize > 0);
  const early = glyphFrame({ ...p, phase: 0 }, style, 18 * 0.2, 0.6, 390, 844, 600);
  const late = glyphFrame({ ...p, phase: 0 }, style, 18 * 0.5, 0.6, 390, 844, 600);
  assert.ok(early && late && late.size > early.size, "a glyph grows as it comes closer");
});

test("seeded particles and specks are stable and in range", () => {
  const a = makeParticles(), b = makeParticles();
  assert.deepEqual(a, b);
  assert.equal(a.length, 14);
  for (const p of a) assert.ok(p.sprite >= 0 && p.sprite < 4 && p.period >= 14 && p.period <= 26);
  assert.equal(makeSpecks().length, 120);
  const s = speckFrame(makeSpecks()[0], night.background, 5, 390, 844);
  assert.ok(s.x >= 0 && s.y >= 0 && s.y <= 844 && s.alpha >= 0);
  assert.ok(flicker(file.themes[1].background, 1) > 0.6 && flicker(night.background, 0) === 0.6);
});

test("a front figure sits in its corner and keeps its proportions", () => {
  const box = figureBox({ at: "br", h: 0.68, maxW: 1 }, 800, 1200, 390, 844);
  assert.equal(Math.round(box.h), Math.round(0.68 * 844));
  assert.ok(Math.abs(box.w / box.h - 800 / 1200) < 1e-9);
  assert.equal(box.x + box.w, 390);
  assert.equal(box.y + box.h, 844);
  assert.equal(figureBox({ at: "tl", h: 0.3, maxW: 1 }, 100, 100, 400, 800).y, 0);
});

test("the native fixtures are the TypeScript frames", () => {
  assert.equal(read("fixtures/background.json"), buildFixtures());
});

test("a consumer applies the installer settings without a game", () => {
  const vars = styleFor({ themeName: "lounge", primaryColour: "#aabbcc" });
  assert.equal(vars["--primary"], "#aabbcc");
  assert.equal(vars["--background"], "#17110b");
  assert.equal(styleFor({})["--table"], "#1d4d3a");
});

test("host views: colour table, accent colour and shell palette follow the resolved theme", () => {
  const tokens = resolveTheme(file, { themeName: "night", primaryColour: "hex e0b35a80" });
  const table = colourTable(tokens);
  assert.deepEqual(Object.keys(table).sort(), [...COLOUR_NAMES].sort());
  for (const value of Object.values(table)) assert.match(value, /^#[0-9a-f]{6}$/);
  assert.equal(accentColour(tokens), "#e0b35a");
  assert.equal(table.primary, "#e0b35a");
  const palette = shellPalette(tokens);
  assert.equal(palette.primary, 0x80e0b35a);
  const c = parseColour(tokens.colour.table);
  assert.equal(palette.secondary, ((Math.round(c.a * 255) << 24) | (c.r << 16) | (c.g << 8) | c.b) >>> 0);
  assert.deepEqual(Object.keys(palette), ["primary", "secondary", "background", "surface", "onPrimary"]);
});
