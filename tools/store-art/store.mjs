/**
 * Store art from real app screenshots.
 *
 *   in:  fastlane/screenshots/raw/<name>.png   (captured by capture.mjs)
 *        fastlane/screenshots/slides.json      (order, headlines, colours)
 *   out: fastlane/metadata/android/en-US/images/phoneScreenshots/<n>_<name>.jpg   1080×1920
 *        fastlane/metadata/android/en-US/images/featureGraphic.jpg                  1024×500
 *
 * Style: a bold headline over a phone that bleeds off the bottom edge, on the
 * Noirly gold or dark background — the layout big listings (WhatsApp & co.) use.
 */
import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { BRAND, ROOT, dataUrl, flowMarkSvg, openBrowser, render } from "./lib.mjs";

const RAW = join(ROOT, "fastlane/screenshots/raw");
const OUT = join(ROOT, "fastlane/metadata/android/en-US/images");
const slides = JSON.parse(readFileSync(join(ROOT, "fastlane/screenshots/slides.json"), "utf8"));

const W = 1080;
const H = 1920;

function phone(src, { width, top = null, left = null, rotate = 0, shadow = true }) {
  const bezel = Math.round(width * 0.03);
  const radius = Math.round(width * 0.11);
  const pos = `${top !== null ? `top:${top}px;` : ""}${left !== null ? `left:${left}px;` : "left:50%;margin-left:" + -width / 2 + "px;"}`;
  return `
  <div style="position:absolute;${pos}width:${width}px;transform:rotate(${rotate}deg);transform-origin:50% 0;">
    <div style="position:relative;padding:${bezel}px;border-radius:${radius}px;background:linear-gradient(160deg,#2b2a25,#0d0d0b 45%,#1c1b17);
      box-shadow:${shadow ? "0 60px 120px rgba(0,0,0,.55), 0 20px 40px rgba(0,0,0,.35)," : ""} inset 0 0 0 2px rgba(255,255,255,.08), inset 0 0 0 ${Math.round(bezel * 0.45)}px #050505;">
      <div style="position:relative;border-radius:${radius - bezel}px;overflow:hidden;background:#000;">
        <img src="${src}" style="display:block;width:100%;" />
        <div style="position:absolute;top:${Math.round(width * 0.022)}px;left:50%;width:${Math.round(width * 0.04)}px;height:${Math.round(width * 0.04)}px;margin-left:${-Math.round(width * 0.02)}px;
          border-radius:50%;background:#050505;box-shadow:0 0 0 2px rgba(255,255,255,.05);"></div>
      </div>
    </div>
  </div>`;
}

function headline(text, color, accent) {
  // **word** marks a highlighted word.
  const html = text
    .split("\n")
    .map((line) => line.replace(/\*\*(.+?)\*\*/g, `<span style="color:${accent}">$1</span>`))
    .join("<br/>");
  return `<h1 style="font-family:Fraunces;font-weight:700;font-size:104px;line-height:1.02;letter-spacing:-0.025em;color:${color};">${html}</h1>`;
}

function slide(s, index) {
  const gold = s.theme === "gold";
  const ink = gold ? BRAND.bg : BRAND.text;
  const accent = gold ? "#7a5b00" : BRAND.accent;
  const sub = gold ? "rgba(10,10,8,.72)" : "rgba(245,243,234,.72)";
  const background = gold
    ? `radial-gradient(90% 60% at 50% 105%, #fff3b0 0%, transparent 60%), linear-gradient(170deg, #ffe66d 0%, #f7cf3d 100%)`
    : `radial-gradient(70% 45% at 50% 78%, rgba(255,230,109,.20) 0%, transparent 70%), radial-gradient(60% 40% at 0% 0%, rgba(255,230,109,.07) 0%, transparent 70%), linear-gradient(180deg, #13120f 0%, ${BRAND.bg} 100%)`;
  const grid = gold ? "rgba(10,10,8,.06)" : "rgba(255,230,109,.05)";
  return `
  <div style="position:relative;width:${W}px;height:${H}px;overflow:hidden;background:${background};">
    <div style="position:absolute;inset:0;background-image:linear-gradient(${grid} 1px,transparent 1px),linear-gradient(90deg,${grid} 1px,transparent 1px);
      background-size:72px 72px;mask-image:linear-gradient(180deg,#000 0%,transparent 55%);-webkit-mask-image:linear-gradient(180deg,#000 0%,transparent 55%);"></div>
    <div style="position:absolute;top:120px;left:90px;right:90px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:28px;">
      ${s.badge ? `<span style="font-family:Mono;font-weight:500;font-size:28px;letter-spacing:.18em;text-transform:uppercase;color:${gold ? BRAND.bg : BRAND.accent};
        padding:12px 26px;border-radius:999px;border:2px solid ${gold ? "rgba(10,10,8,.35)" : "rgba(255,230,109,.45)"};background:${gold ? "rgba(255,255,255,.25)" : "rgba(255,230,109,.08)"};">${s.badge}</span>` : ""}
      ${headline(s.headline, ink, accent)}
      <p style="font-family:Hanken;font-weight:500;font-size:40px;line-height:1.35;color:${sub};max-width:860px;">${s.sub}</p>
    </div>
    ${phone(dataUrl(join(RAW, s.raw)), { width: 780, top: s.badge ? 650 : 540 })}
    <div style="position:absolute;bottom:38px;right:44px;font-family:Mono;font-size:22px;letter-spacing:.2em;color:${gold ? "rgba(10,10,8,.35)" : "rgba(255,230,109,.35)"};">${String(index + 1).padStart(2, "0")}</div>
  </div>`;
}

function featureGraphic(screens) {
  return `
  <div style="position:relative;width:1024px;height:500px;overflow:hidden;
    background:radial-gradient(60% 90% at 78% 60%, rgba(255,230,109,.22) 0%, transparent 70%), linear-gradient(120deg,#16150f 0%,${BRAND.bg} 60%);">
    <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(255,230,109,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,230,109,.05) 1px,transparent 1px);background-size:48px 48px;"></div>
    <div style="position:absolute;left:72px;top:0;bottom:0;width:470px;display:flex;flex-direction:column;justify-content:center;gap:22px;">
      <div style="display:flex;align-items:center;gap:20px;">
        <div style="width:84px;height:84px;border-radius:22px;background:radial-gradient(120% 120% at 30% 18%,#22201a 0%,${BRAND.bg} 58%);
          box-shadow:inset 0 0 0 2px rgba(201,164,74,.24);display:flex;align-items:center;justify-content:center;">
          ${flowMarkSvg("#C9A44A", 88)}
        </div>
        <div>
          <div style="font-family:Mono;font-size:18px;letter-spacing:.3em;color:rgba(255,230,109,.75);">NOIRLY</div>
          <div style="font-family:Fraunces;font-weight:700;font-size:54px;line-height:1;color:${BRAND.text};">Flow</div>
        </div>
      </div>
      <div style="font-family:Fraunces;font-weight:600;font-size:40px;line-height:1.1;color:${BRAND.text};">Tasks, boards and your team, <span style="color:${BRAND.accent}">in sync.</span></div>
    </div>
    ${phone(dataUrl(join(RAW, screens[1])), { width: 230, top: 70, left: 610, rotate: -6 })}
    ${phone(dataUrl(join(RAW, screens[0])), { width: 250, top: 40, left: 760, rotate: 4 })}
  </div>`;
}

const missing = slides.filter((s) => !existsSync(join(RAW, s.raw))).map((s) => s.raw);
if (missing.length) {
  console.error(`Missing raw screenshots in fastlane/screenshots/raw: ${missing.join(", ")}. Run capture.mjs first.`);
  process.exit(1);
}

const shotsDir = join(OUT, "phoneScreenshots");
if (existsSync(shotsDir)) for (const f of readdirSync(shotsDir)) rmSync(join(shotsDir, f));

const browser = await openBrowser();
try {
  for (const [i, s] of slides.entries()) {
    const out = join(shotsDir, `${i + 1}_${s.raw.replace(/\.png$/, "")}.jpg`);
    await render(browser, slide(s, i), { width: W, height: H, out });
    console.log("wrote", out.replace(ROOT, "."));
  }
  const fg = join(OUT, "featureGraphic.jpg");
  await render(browser, featureGraphic([slides[0].raw, slides[1].raw]), { width: 1024, height: 500, out: fg });
  console.log("wrote", fg.replace(ROOT, "."));
} finally {
  await browser.close();
}
