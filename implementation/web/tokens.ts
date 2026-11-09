// Design tokens: one JSON shape (tokens.schema.json) rendered to CSS variables, Swift and Kotlin constants.
export type Colour = string;
export type Tokens = {
  name: string;
  colour: Record<ColourName, Colour>;
  spacing: Record<"xs" | "sm" | "md" | "lg" | "xl", number>;
  radii: Record<"sm" | "md" | "lg" | "pill", number>;
  type: { family: string; caption: number; small: number; body: number; subtitle: number; title: number; display: number };
  background: BackgroundStyle;
};
export type BackgroundStyle = {
  tint: Colour; glow: Colour; glowFromTop: boolean; speed: number; suitAlpha: number; specks: number; speckUp: boolean; speckColour: Colour; glyphs: string;
};
export type ThemeSettings = { themeName?: string; primaryColour?: string; tableColour?: string };
export type ThemeFile = { format: 1; default: string; themes: Tokens[] };

export const COLOUR_NAMES = ["background", "surface", "edge", "primary", "onPrimary", "table", "tableEdge", "text", "muted", "danger", "good", "warning", "paper", "paperAccent"] as const;
export type ColourName = (typeof COLOUR_NAMES)[number];
const SPACING = ["xs", "sm", "md", "lg", "xl"] as const;
const RADII = ["sm", "md", "lg", "pill"] as const;
const TYPE_SIZES = ["caption", "small", "body", "subtitle", "title", "display"] as const;
const HEX = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

export function isColour(value: unknown): value is Colour {
  return typeof value === "string" && HEX.test(value);
}

// Returns the list of problems; empty means the tokens match tokens.schema.json.
export function validateTokens(tokens: unknown): string[] {
  const problems: string[] = [];
  const t = tokens as Tokens;
  if (typeof t !== "object" || t === null) return ["tokens must be an object"];
  if (typeof t.name !== "string" || !/^[a-z][a-z0-9-]*$/.test(t.name)) problems.push("name must be lower-case letters, digits and hyphens");
  for (const key of COLOUR_NAMES) if (!isColour(t.colour?.[key])) problems.push(`colour.${key} must be #rrggbb or #rrggbbaa`);
  for (const key of SPACING) if (!(t.spacing?.[key] >= 0)) problems.push(`spacing.${key} must be a number of at least 0`);
  for (const key of RADII) if (!(t.radii?.[key] >= 0)) problems.push(`radii.${key} must be a number of at least 0`);
  for (const key of TYPE_SIZES) if (!(t.type?.[key] >= 0)) problems.push(`type.${key} must be a number of at least 0`);
  if (typeof t.type?.family !== "string" || !t.type.family) problems.push("type.family must be text");
  const b = t.background;
  if (!isColour(b?.tint)) problems.push("background.tint must be a colour");
  if (!isColour(b?.glow)) problems.push("background.glow must be a colour");
  if (!isColour(b?.speckColour)) problems.push("background.speckColour must be a colour");
  if (typeof b?.glowFromTop !== "boolean") problems.push("background.glowFromTop must be true or false");
  if (typeof b?.speckUp !== "boolean") problems.push("background.speckUp must be true or false");
  if (!(b?.speed > 0)) problems.push("background.speed must be above 0");
  if (!(b?.suitAlpha >= 0 && b.suitAlpha <= 1)) problems.push("background.suitAlpha must be between 0 and 1");
  if (!(Number.isInteger(b?.specks) && b.specks >= 0 && b.specks <= 120)) problems.push("background.specks must be a whole number from 0 to 120");
  if (typeof b?.glyphs !== "string" || b.glyphs.length < 1 || [...b.glyphs].length > 8) problems.push("background.glyphs must be 1 to 8 characters");
  return problems;
}

// 0 to 255 channels and 0 to 1 alpha.
export function parseColour(hex: Colour): { r: number; g: number; b: number; a: number } {
  if (!isColour(hex)) throw new Error(`not a colour: ${hex}`);
  const n = (i: number) => parseInt(hex.slice(i, i + 2), 16);
  return { r: n(1), g: n(3), b: n(5), a: hex.length === 9 ? n(7) / 255 : 1 };
}

// An installer colour: an aepm string setting cannot hold "#" and must start with a letter, so a
// colour is written "hex e0b35a" (or "hex e0b35a80" with opacity). "#rrggbb" and "rrggbb" are accepted
// too, for code. Returns "#rrggbb" or "#rrggbbaa" in lower case; throws for anything else.
export function parseColourSetting(value: string): Colour {
  const m = /^(?:hex\s+)?#?([0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?)$/i.exec(value.trim());
  if (!m) throw new Error(`not a colour (write hex rrggbb): ${value}`);
  return "#" + m[1].toLowerCase();
}

// The named theme with the installer's colour overrides applied; an unknown name falls back to the default.
export function resolveTheme(file: ThemeFile, settings: ThemeSettings = {}): Tokens {
  const base = file.themes.find((t) => t.name === settings.themeName) ?? file.themes.find((t) => t.name === file.default) ?? file.themes[0];
  if (!base) throw new Error("no themes");
  const out: Tokens = JSON.parse(JSON.stringify(base));
  if (settings.primaryColour !== undefined && settings.primaryColour !== "") {
    try { out.colour.primary = parseColourSetting(settings.primaryColour); } catch { throw new Error(`primaryColour is not a colour (write hex rrggbb): ${settings.primaryColour}`); }
  }
  if (settings.tableColour !== undefined && settings.tableColour !== "") {
    try { out.colour.table = parseColourSetting(settings.tableColour); } catch { throw new Error(`tableColour is not a colour (write hex rrggbb): ${settings.tableColour}`); }
  }
  return out;
}

export const themeNames = (file: ThemeFile): string[] => file.themes.map((t) => t.name);

// What the host components need. web-host: every colour name to "#rrggbb" (opacity dropped) for themeColour and
// backgroundColour. apple-host: the accent colour (the primary) for the shell tint. android-host: the five colours of ShellPalette.
export function colourTable(t: Tokens): Record<ColourName, string> {
  const out = {} as Record<ColourName, string>;
  for (const k of COLOUR_NAMES) out[k] = t.colour[k].slice(0, 7).toLowerCase();
  return out;
}
export const accentColour = (t: Tokens): string => t.colour.primary.slice(0, 7).toLowerCase();
export type ShellPalette = { primary: number; secondary: number; background: number; surface: number; onPrimary: number };
const argb = (hex: Colour): number => {
  const c = parseColour(hex);
  return ((Math.round(c.a * 255) << 24) | (c.r << 16) | (c.g << 8) | c.b) >>> 0;
};
// 0xAARRGGBB numbers; the theme has no secondary colour, so the table colour stands in for it.
export function shellPalette(t: Tokens): ShellPalette {
  return { primary: argb(t.colour.primary), secondary: argb(t.colour.table), background: argb(t.colour.background), surface: argb(t.colour.surface), onPrimary: argb(t.colour.onPrimary) };
}

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
const px = (n: number) => `${n}px`;

export function cssVariables(t: Tokens): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of COLOUR_NAMES) out[`--${kebab(k)}`] = t.colour[k].toLowerCase();
  for (const k of SPACING) out[`--space-${k}`] = px(t.spacing[k]);
  for (const k of RADII) out[`--radius-${k}`] = px(t.radii[k]);
  out["--font-family"] = t.type.family;
  for (const k of TYPE_SIZES) out[`--font-${k}`] = px(t.type[k]);
  out["--glow"] = t.background.glow.toLowerCase();
  out["--tint"] = t.background.tint.toLowerCase();
  return out;
}

// The first theme is the page default (:root); the others apply under [data-theme="name"].
export function renderCss(file: ThemeFile): string {
  const lines = ["/* Generated by theme tokens.ts renderCss from themes.json. Do not edit. */"];
  const order = [file.themes.find((t) => t.name === file.default) ?? file.themes[0], ...file.themes.filter((t) => t.name !== file.default)];
  order.forEach((t, i) => {
    lines.push(`${i === 0 ? ":root" : `[data-theme="${t.name}"]`} {`);
    for (const [k, v] of Object.entries(cssVariables(t))) lines.push(`  ${k}: ${v};`);
    lines.push("}");
  });
  return lines.join("\n") + "\n";
}

// Sets the variables on an element (the page root by default) in the browser.
export function applyTheme(t: Tokens, el: { style: { setProperty(name: string, value: string): void } }): void {
  for (const [k, v] of Object.entries(cssVariables(t))) el.style.setProperty(k, v);
}

// 0xRRGGBBAA as eight hex digits.
const rgba = (hex: Colour) => (hex.length === 7 ? hex + "ff" : hex).slice(1).toUpperCase();
const num = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : String(n));

export function renderSwift(file: ThemeFile): string {
  const colours = (t: Tokens) => COLOUR_NAMES.map((k) => `${k}: ThemeColour(rgba: 0x${rgba(t.colour[k])})`).join(", ");
  const items = file.themes.map((t) => {
    const b = t.background;
    return `    static let ${camel(t.name)} = ThemeSet(name: "${t.name}",
        colour: ThemeColours(${colours(t)}),
        spacing: ThemeSpacing(${SPACING.map((k) => `${k}: ${num(t.spacing[k])}`).join(", ")}),
        radii: ThemeRadii(${RADII.map((k) => `${k}: ${num(t.radii[k])}`).join(", ")}),
        type: ThemeType(family: ${JSON.stringify(t.type.family)}, ${TYPE_SIZES.map((k) => `${k}: ${num(t.type[k])}`).join(", ")}),
        background: ThemeBackgroundStyle(tint: ThemeColour(rgba: 0x${rgba(b.tint)}), glow: ThemeColour(rgba: 0x${rgba(b.glow)}), glowFromTop: ${b.glowFromTop}, speed: ${num(b.speed)}, suitAlpha: ${num(b.suitAlpha)}, specks: ${b.specks}, speckUp: ${b.speckUp}, speckColour: ThemeColour(rgba: 0x${rgba(b.speckColour)}), glyphs: ${JSON.stringify(b.glyphs)}))`;
  });
  return `// Generated by theme tokens.ts renderSwift from themes.json. Do not edit.
enum ThemeTokens {
${items.join("\n")}
    static let defaultName = "${file.default}"
    static let all: [String: ThemeSet] = [${file.themes.map((t) => `"${t.name}": ${camel(t.name)}`).join(", ")}]
}
`;
}

export function renderKotlin(file: ThemeFile): string {
  const k = (hex: Colour) => `0x${rgba(hex).slice(6)}${rgba(hex).slice(0, 6)}L`; // Compose wants 0xAARRGGBB as a Long
  const colours = (t: Tokens) => COLOUR_NAMES.map((n) => `${n} = ${k(t.colour[n])}`).join(", ");
  const f = (n: number) => `${Number.isInteger(n) ? n.toFixed(1) : n}f`;
  const items = file.themes.map((t) => {
    const b = t.background;
    return `    val ${camel(t.name).toUpperCase()} = ThemeSet(name = "${t.name}",
        colour = ThemeColours(${colours(t)}),
        spacing = ThemeSpacing(${SPACING.map((n) => `${n} = ${f(t.spacing[n])}`).join(", ")}),
        radii = ThemeRadii(${RADII.map((n) => `${n} = ${f(t.radii[n])}`).join(", ")}),
        type = ThemeType(family = ${JSON.stringify(t.type.family)}, ${TYPE_SIZES.map((n) => `${n} = ${f(t.type[n])}`).join(", ")}),
        background = ThemeBackgroundStyle(tint = ${k(b.tint)}, glow = ${k(b.glow)}, glowFromTop = ${b.glowFromTop}, speed = ${f(b.speed)}, suitAlpha = ${f(b.suitAlpha)}, specks = ${b.specks}, speckUp = ${b.speckUp}, speckColour = ${k(b.speckColour)}, glyphs = ${JSON.stringify(b.glyphs).replace(/[^\x00-\x7f]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"))}))`;
  });
  return `// Generated by theme tokens.ts renderKotlin from themes.json. Do not edit.
package ae.theme

object ThemeTokens {
${items.join("\n")}
    const val DEFAULT_NAME = "${file.default}"
    val ALL: Map<String, ThemeSet> = mapOf(${file.themes.map((t) => `"${t.name}" to ${camel(t.name).toUpperCase()}`).join(", ")})
}
`;
}

function camel(name: string): string {
  return name.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}
