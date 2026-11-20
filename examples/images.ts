// The package's example images: each look's animated background (the Background class on a canvas) behind a sample of
// the look's colours, spacing, corners and type, read from the theme's own tokens. Rendered by classes/render_images.py in
// headless Chrome.
import themes from "../implementation/web/themes.json" with { type: "json" };
import { Background } from "../implementation/web/background.ts";
import { COLOUR_NAMES, resolveTheme } from "../implementation/web/tokens.ts";
import type { ThemeFile } from "../implementation/web/tokens.ts";

type Scene = { name: string; caption: string; width: number; height: number; look?: string; render: (root: HTMLElement) => void | Promise<void> };

const file = themes as unknown as ThemeFile;

function box(style: Record<string, string>, text = ""): HTMLElement {
  const node = document.createElement("div");
  node.textContent = text;
  Object.assign(node.style, style);
  return node;
}

function backdrop(root: HTMLElement, look: string): Promise<void> {
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%" });
  root.append(canvas);
  new Background(canvas, resolveTheme(file, { themeName: look }));
  return new Promise((done) => setTimeout(done, 2500));
}

function sample(root: HTMLElement, look: string): void {
  const sheet = box({ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: "760px", padding: "var(--space-xl)",
    background: "var(--surface)", border: "1px solid var(--edge)", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", gap: "var(--space-lg)" });
  sheet.append(box({ fontSize: "var(--font-title)", fontWeight: "700" }, `The ${look} look`),
    box({ fontSize: "var(--font-body)", color: "var(--muted)" }, "Colours, spacing, corners and type from one tokens file, for web, Apple and Android."));
  const swatches = box({ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "var(--space-sm)" });
  for (const name of COLOUR_NAMES) {
    const variable = "--" + name.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
    const cell = box({ display: "flex", flexDirection: "column", gap: "4px", fontSize: "var(--font-caption)", color: "var(--muted)" });
    cell.append(box({ height: "44px", borderRadius: "var(--radius-sm)", background: `var(${variable})`, border: "1px solid var(--edge)" }), box({}, name));
    swatches.append(cell);
  }
  const actions = box({ display: "flex", gap: "var(--space-md)", alignItems: "center" });
  actions.append(box({ padding: "10px 22px", borderRadius: "var(--radius-pill)", background: "var(--primary)", color: "var(--on-primary)", fontWeight: "600" }, "Primary action"),
    box({ padding: "10px 22px", borderRadius: "var(--radius-pill)", border: "1px solid var(--edge)" }, "Second action"),
    box({ marginLeft: "auto", width: "160px", height: "72px", borderRadius: "50%", background: "var(--table)", boxShadow: "inset 0 0 0 5px var(--table-edge)" }));
  sheet.append(swatches, actions);
  root.append(sheet);
}

const looks = file.themes.map((t) => t.name);

export const scenes: Scene[] = looks.flatMap((look) => [
  { name: `${look}-sample`, caption: `The ${look} look: colours, actions and table over its animated background`, width: 1280, height: 800, look,
    render: async (root: HTMLElement) => { const shown = backdrop(root, look); sample(root, look); await shown; } },
  { name: `${look}-background`, caption: `The ${look} look's animated background on its own`, width: 1280, height: 720, look,
    render: (root: HTMLElement) => backdrop(root, look) },
]);
