/**
 * App icons from the Noirly Flow web mark (design/brand/flow-mark.svg, copied
 * from noirly-flow/public/brand-mark.svg): a board whose cards thin out
 * column by column. Gold #C9A44A — the web favicon's dark tint — on the
 * Noirly dark background.
 *
 *   android/app/src/main/res/mipmap-<density>/ic_launcher(.png|_round.png)  legacy icons
 *   android/app/src/main/res/mipmap-<density>/ic_launcher_foreground.png    adaptive foreground
 *   android/app/src/main/res/mipmap-anydpi-v26/ic_launcher(_round).xml      adaptive icon
 *   android/app/src/main/res/values/ic_launcher_background.xml              adaptive background
 *   fastlane/metadata/android/en-US/images/icon.png                          Play listing icon (512)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BRAND, ROOT, flowMarkSvg, openBrowser, render } from "./lib.mjs";

const RES = join(ROOT, "android/app/src/main/res");
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
/** The web favicon's gold on dark. */
export const MARK_GOLD = "#C9A44A";

/**
 * The mark on its tile. `scale` is the SVG's size relative to the tile; the
 * SVG already has its own padding (the cards span ~62% of its viewBox).
 */
function tile(size, { shape = "square", scale = 1 } = {}) {
  // "none" keeps a 2px radius: translucent corner pixels make the PNG RGBA (32-bit), as Play asks; its mask is far larger.
  const radius = shape === "circle" ? "50%" : shape === "square" ? `${size * 0.22}px` : "2px";
  const svg = size * scale;
  return `
  <div style="width:${size}px;height:${size}px;border-radius:${radius};overflow:hidden;position:relative;
    background:radial-gradient(120% 120% at 30% 18%, #22201a 0%, ${BRAND.bg} 58%);
    display:flex;align-items:center;justify-content:center;">
    ${shape !== "none" ? `<div style="position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 ${Math.max(1, size * 0.012)}px rgba(201,164,74,.22);"></div>` : ""}
    <div style="width:${svg}px;height:${svg}px;filter:drop-shadow(0 ${size * 0.015}px ${size * 0.04}px rgba(0,0,0,.45));">
      ${flowMarkSvg(MARK_GOLD)}
    </div>
  </div>`;
}

const browser = await openBrowser();
try {
  for (const [density, k] of Object.entries(DENSITIES)) {
    const dir = join(RES, `mipmap-${density}`);
    // Legacy launcher icons: 48dp, with a little margin like system icons.
    const legacy = 48 * k;
    for (const [file, shape] of [["ic_launcher.png", "square"], ["ic_launcher_round.png", "circle"]]) {
      await render(browser, `<div style="padding:${legacy * 0.04}px">${tile(legacy * 0.92, { shape, scale: 1.05 })}</div>`, {
        width: legacy, height: legacy, out: join(dir, file), transparent: true,
      });
    }
    // Adaptive foreground: 108dp canvas; the cards stay inside the 66dp safe zone.
    const fg = 108 * k;
    await render(browser, `<div style="width:${fg}px;height:${fg}px;display:flex;align-items:center;justify-content:center">${flowMarkSvg(MARK_GOLD, fg * 0.86)}</div>`, {
      width: fg, height: fg, out: join(dir, "ic_launcher_foreground.png"), transparent: true,
    });
  }

  mkdirSync(join(RES, "mipmap-anydpi-v26"), { recursive: true });
  const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
    <monochrome android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;
  writeFileSync(join(RES, "mipmap-anydpi-v26/ic_launcher.xml"), adaptive);
  writeFileSync(join(RES, "mipmap-anydpi-v26/ic_launcher_round.xml"), adaptive);
  writeFileSync(
    join(RES, "values/ic_launcher_background.xml"),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BRAND.bg}</color>\n</resources>\n`,
  );

  // Play listing icon: 512×512, full bleed (Play applies its own rounded mask).
  await render(browser, tile(512, { shape: "none", scale: 1.02 }), {
    width: 512, height: 512, out: join(ROOT, "fastlane/metadata/android/en-US/images/icon.png"), transparent: true,
  });
  console.log("Icons written.");
} finally {
  await browser.close();
}
