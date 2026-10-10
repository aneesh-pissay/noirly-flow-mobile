import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

/** Repo root (NoirlyFlow/). */
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** The gold Noirly theme, dark mode — the same values the app renders with. */
export const BRAND = {
  bg: "#0a0a08",
  surface: "#121210",
  text: "#f5f3ea",
  accent: "#ffe66d",
  accentInk: "#222222",
};

function font(file) {
  return `data:font/ttf;base64,${readFileSync(join(ROOT, "src/assets/fonts", file)).toString("base64")}`;
}

/** The app's own faces, inlined so rendering never depends on the network. */
export const FONT_CSS = `
@font-face { font-family: "Fraunces"; font-weight: 400; src: url(${font("Fraunces72pt-Regular.ttf")}); }
@font-face { font-family: "Fraunces"; font-weight: 600; src: url(${font("Fraunces72pt-SemiBold.ttf")}); }
@font-face { font-family: "Fraunces"; font-weight: 700; src: url(${font("Fraunces72pt-Bold.ttf")}); }
@font-face { font-family: "Hanken"; font-weight: 400; src: url(${font("HankenGrotesk-Regular.ttf")}); }
@font-face { font-family: "Hanken"; font-weight: 500; src: url(${font("HankenGrotesk-Medium.ttf")}); }
@font-face { font-family: "Hanken"; font-weight: 600; src: url(${font("HankenGrotesk-SemiBold.ttf")}); }
@font-face { font-family: "Hanken"; font-weight: 700; src: url(${font("HankenGrotesk-Bold.ttf")}); }
@font-face { font-family: "Mono"; font-weight: 500; src: url(${font("JetBrainsMono-Medium.ttf")}); }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: transparent; }
`;

/**
 * Chrome via Playwright. Uses the installed Google Chrome (present on GitHub's
 * Ubuntu runners and most desktops); set CHROME_PATH to use another binary.
 */
export async function openBrowser() {
  return process.env.CHROME_PATH
    ? chromium.launch({ executablePath: process.env.CHROME_PATH })
    : chromium.launch({ channel: "chrome" });
}

/**
 * Renders `html` at width×height CSS pixels into `out` (.png keeps alpha,
 * .jpg is opaque — what Play wants for screenshots and the feature graphic).
 */
export async function render(browser, html, { width, height, out, scale = 1, transparent = false }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${FONT_CSS}</style></head><body>${html}</body></html>`, {
    waitUntil: "load",
  });
  await page.evaluate(() => document.fonts.ready);
  mkdirSync(dirname(out), { recursive: true });
  const jpeg = /\.jpe?g$/i.test(out);
  await page.screenshot({
    path: out,
    type: jpeg ? "jpeg" : "png",
    quality: jpeg ? 92 : undefined,
    omitBackground: transparent && !jpeg,
    clip: { x: 0, y: 0, width, height },
  });
  await page.close();
  return out;
}

/**
 * The Noirly Flow web mark (design/brand/flow-mark.svg) as inline SVG in one
 * colour. Its own <style> tint is dropped; the shapes use currentColor.
 */
export function flowMarkSvg(color, size = null) {
  const svg = readFileSync(join(ROOT, "design/brand/flow-mark.svg"), "utf8")
    .replace(/<\?xml[^>]*>/, "")
    .replace(/<style>[\s\S]*?<\/style>/, "")
    .replace(/<title>[\s\S]*?<\/title>|<desc>[\s\S]*?<\/desc>|<!--[\s\S]*?-->/g, "")
    .replace(/\swidth="\d+"\s+height="\d+"/, size ? ` width="${size}" height="${size}"` : ` width="100%" height="100%"`);
  return svg.replace("<svg ", `<svg style="color:${color};display:block" `);
}

export function dataUrl(file) {
  const ext = file.toLowerCase().endsWith(".jpg") || file.toLowerCase().endsWith(".jpeg") ? "jpeg" : "png";
  return `data:image/${ext};base64,${readFileSync(file).toString("base64")}`;
}
