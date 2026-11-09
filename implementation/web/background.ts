// Animated background: glyphs drifting out of the dark toward the viewer under a glow, with specks,
// an optional scene picture behind and figures in front. The placement maths is pure (tested in node);
// `Background` draws it on a canvas.
import { parseColour } from "./tokens.ts";
import type { BackgroundStyle, Tokens } from "./tokens.ts";

export type Particle = { x: number; y: number; period: number; phase: number; spin: number; sway: number; sprite: number };
export type Speck = { x: number; phase: number; period: number; size: number; wobble: number };
export type SuitFrame = { x: number; y: number; size: number; alpha: number; rotation: number; sprite: number };
export type SpeckFrame = { x: number; y: number; radius: number; alpha: number };
export type Front = { at: "tl" | "bl" | "br"; h: number; maxW: number; flipX?: boolean; flipY?: boolean };
// anchor: 0 shows the top of a picture wider than the screen, 1 the bottom.
export type Scene = { back?: string; front?: string; anchor: number; fronts: Front[] };

export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

export function makeParticles(count = 14, glyphCount = 4): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const r = seededRandom(i * 7919 + 13);
    return { x: r() * 1.6 - 0.8, y: r() * 1.4 - 0.7, period: 14 + r() * 12, phase: r(), spin: (r() - 0.5) * 30, sway: r() * 6.283, sprite: Math.floor(r() * glyphCount) };
  });
}

export function makeSpecks(count = 120): Speck[] {
  return Array.from({ length: count }, (_, i) => {
    const r = seededRandom(i * 31 + 7);
    return { x: r(), phase: r(), period: 18 + r() * 20, size: 1.5 + r() * 2.5, wobble: r() * 6.283 };
  });
}

// The glow's breathing, 0 to about 1.
export function flicker(style: BackgroundStyle, t: number): number {
  return style.glowFromTop ? 0.75 + 0.1 * Math.sin(t * 0.7) : 0.6 + 0.2 * Math.sin(t * 1.3) * Math.sin(t * 0.7);
}

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

// One glyph at time t (already scaled by the style's speed); null when off screen or too faint.
export function glyphFrame(p: Particle, style: BackgroundStyle, t: number, light: number, width: number, height: number, sizeBase = width): SuitFrame | null {
  const z = 1 - ((t / p.period + p.phase) % 1);
  const depth = 0.08 + z * 0.92;
  const scale = 0.1 / depth;
  const x = width * (0.5 + (p.x / depth) * 0.5 + 0.02 * Math.sin(t * 0.6 + p.sway));
  const y = height * (0.5 + (p.y / depth) * 0.5 + 0.015 * Math.sin(t * 0.8 + p.sway * 2));
  const size = sizeBase * scale;
  if (x < -size || x > width + size || y < -size || y > height + size) return null;
  const alpha = style.suitAlpha * clamp01((1 - z) * 4) * clamp01(z * 5) * (0.6 + 0.4 * Math.min(light, 1.2)) * (1 - depth * 0.5);
  if (alpha <= 0.01) return null;
  return { x, y, size, alpha, rotation: p.spin * (1 - z), sprite: p.sprite };
}

export function speckFrame(sp: Speck, style: BackgroundStyle, t: number, width: number, height: number): SpeckFrame {
  const f = (t / sp.period + sp.phase) % 1;
  const y = style.speckUp ? 1 - f : f;
  const x = sp.x + 0.02 * Math.sin(t * 0.5 + sp.wobble);
  const alpha = (0.25 + 0.2 * Math.sin(t * 1.3 + sp.wobble)) * clamp01(1 - Math.abs(y - 0.5) * 1.2);
  return { x: x * width, y: y * height, radius: sp.size, alpha };
}

// Where a front figure sits: the largest that fits its height and width fractions, in a corner.
export function figureBox(f: Front, imageWidth: number, imageHeight: number, width: number, height: number): { x: number; y: number; w: number; h: number } {
  const k = Math.min((f.h * height) / imageHeight, (f.maxW * width) / imageWidth);
  const w = imageWidth * k, h = imageHeight * k;
  return { x: f.at === "br" ? width - w : 0, y: f.at === "tl" ? 0 : height - h, w, h };
}

const rgba = (hex: string, alpha: number) => {
  const c = parseColour(hex);
  return `rgba(${c.r},${c.g},${c.b},${alpha})`;
};

export class Background {
  private ctx: CanvasRenderingContext2D;
  private sprites: HTMLCanvasElement[] = [];
  private particles = makeParticles();
  private specks = makeSpecks();
  private back: HTMLImageElement | null = null;
  private front: HTMLImageElement | null = null;
  private start = performance.now();
  private raf = 0;
  private style: BackgroundStyle;
  private scene: Scene = { anchor: 0.5, fronts: [] };
  private background: string;

  // Figures are for the screens away from play; a table shows only the picture behind.
  figures = true;

  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement, theme: Tokens) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.style = theme.background;
    this.background = theme.colour.background;
    this.makeSprites();
    window.addEventListener("resize", () => this.resize());
    this.resize();
    this.loop();
  }

  setTheme(theme: Tokens) {
    this.style = theme.background;
    this.background = theme.colour.background;
    this.makeSprites();
  }

  // Picture URLs are the application's; a missing file just leaves the picture out.
  setScene(scene: Scene) {
    this.scene = scene;
    this.back = this.front = null;
    const load = (url: string | undefined, set: (img: HTMLImageElement) => void) => {
      if (!url) return;
      const img = new Image();
      img.onload = () => { if (this.scene === scene) set(img); };
      img.src = url;
    };
    load(scene.back, (img) => { this.back = img; });
    load(scene.front, (img) => { this.front = img; });
  }

  private makeSprites() {
    const tint = rgba(this.style.tint, 1);
    this.sprites = [...this.style.glyphs].map((g) => {
      const c = document.createElement("canvas");
      c.width = c.height = 256;
      const x = c.getContext("2d")!;
      x.fillStyle = tint;
      x.font = "220px serif";
      x.textAlign = "center";
      x.textBaseline = "middle";
      x.fillText(g, 128, 140);
      return c;
    });
  }

  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(innerWidth * dpr);
    this.canvas.height = Math.floor(innerHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private loop = () => {
    this.draw((performance.now() - this.start) / 1000);
    this.raf = requestAnimationFrame(this.loop);
  };

  stop() {
    cancelAnimationFrame(this.raf);
  }

  private draw(t: number) {
    const { ctx, style, scene } = this;
    const W = innerWidth, H = innerHeight;
    ctx.fillStyle = this.background;
    ctx.fillRect(0, 0, W, H);
    if (this.back) {
      const b = this.back, k = Math.max(W / b.width, H / b.height);
      ctx.drawImage(b, (W - b.width * k) / 2, (H - b.height * k) * scene.anchor, b.width * k, b.height * k);
    }
    const light = flicker(style, t);
    for (const p of this.particles) {
      const f = glyphFrame(p, style, t * style.speed, light, W, H, Math.min(W, 600));
      if (!f) continue;
      ctx.save();
      ctx.globalAlpha = f.alpha;
      ctx.translate(f.x, f.y);
      ctx.rotate((f.rotation * Math.PI) / 180);
      ctx.drawImage(this.sprites[f.sprite % this.sprites.length], -f.size / 2, -f.size / 2, f.size, f.size);
      ctx.restore();
    }
    for (let i = 0; i < Math.min(style.specks, this.specks.length); i++) {
      const s = speckFrame(this.specks[i], style, t, W, H);
      ctx.fillStyle = rgba(style.speckColour, s.alpha);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, 6.283);
      ctx.fill();
    }
    const cy = style.glowFromTop ? -H * 0.1 : H * 1.05;
    const glow = ctx.createRadialGradient(W / 2, cy, 0, W / 2, cy, H * 0.9);
    glow.addColorStop(0, rgba(style.glow, 0.22 * light));
    glow.addColorStop(0.5, rgba(style.glow, 0.08 * light));
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    const vig = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.75);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.75)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
    if (this.front && this.figures) for (const f of scene.fronts) this.figure(this.front, f, W, H);
  }

  private figure(img: HTMLImageElement, f: Front, W: number, H: number) {
    const { x, y, w, h } = figureBox(f, img.width, img.height, W, H);
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.scale(f.flipX ? -1 : 1, f.flipY ? -1 : 1);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
}
