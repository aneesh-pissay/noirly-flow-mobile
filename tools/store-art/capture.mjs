/**
 * Captures the raw app screenshots for the store from a running emulator.
 *
 *   EMAIL=… PASSWORD=… node capture.mjs [flow.yaml]        (default: fastlane/screenshots/flows/capture.yaml)
 *   node capture.mjs --login demo-login.json                ({ "email", "password" })
 *
 * Env: APP_ID (com.noirly.flow), WORKSPACE (Northwind Studio), DEVICE (adb serial),
 *      MAESTRO (maestro launcher; default: `maestro` on PATH).
 *
 * Sets Android's demo mode first (09:41, full battery and signal, no
 * notifications) so the status bar is clean, and restores it afterwards.
 * Screenshots named by the flow's takeScreenshot steps land in
 * fastlane/screenshots/raw/<name>.png.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { ROOT } from "./lib.mjs";

const args = process.argv.slice(2);
const loginAt = args.indexOf("--login");
let { EMAIL, PASSWORD } = process.env;
if (loginAt >= 0) ({ email: EMAIL, password: PASSWORD } = JSON.parse(readFileSync(args[loginAt + 1], "utf8")));
if (!EMAIL || !PASSWORD) {
  console.error("Set EMAIL and PASSWORD (or --login file.json) for the account to screenshot.");
  process.exit(1);
}
const flow = resolve(args.find((a, i) => a.endsWith(".yaml") && (loginAt < 0 || i !== loginAt + 1)) ?? join(ROOT, "fastlane/screenshots/flows/capture.yaml"));
const appId = process.env.APP_ID ?? "com.noirly.flow";
const workspace = process.env.WORKSPACE ?? "Northwind Studio";
const device = process.env.DEVICE ?? "";
const adbArgs = device ? ["-s", device] : [];

function adb(...a) {
  return spawnSync("adb", [...adbArgs, ...a], { encoding: "utf8" });
}
function demo(command, extra = []) {
  adb("shell", "am", "broadcast", "-a", "com.android.systemui.demo", "-e", "command", command, ...extra);
}

adb("shell", "settings", "put", "global", "sysui_demo_allowed", "1");
demo("enter");
demo("clock", ["-e", "hhmm", "0941"]);
demo("battery", ["-e", "level", "100", "-e", "plugged", "false"]);
demo("network", ["-e", "wifi", "show", "-e", "level", "4", "-e", "fully", "true"]);
demo("network", ["-e", "mobile", "hide"]);
demo("notifications", ["-e", "visible", "false"]);

const out = mkdtempSync(join(tmpdir(), "noirly-shots-"));
const maestro = process.env.MAESTRO ?? "maestro";
const maestroArgs = [
  "test",
  ...(device ? ["--device", device] : []),
  "--test-output-dir", out,
  "-e", `APP_ID=${appId}`,
  "-e", `EMAIL=${EMAIL}`,
  "-e", `PASSWORD=${PASSWORD}`,
  "-e", `WORKSPACE=${workspace}`,
  flow,
];
// Windows runs maestro.bat only through a shell, so quote everything for cmd.exe.
const viaShell = process.platform === "win32";
const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
const result = viaShell
  ? spawnSync(q(maestro), maestroArgs.map(q), { cwd: out, stdio: "inherit", shell: true })
  : spawnSync(maestro, maestroArgs, { cwd: out, stdio: "inherit" });
demo("exit");

const raw = join(ROOT, "fastlane/screenshots/raw");
mkdirSync(raw, { recursive: true });
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const shots = walk(out).filter((f) => f.endsWith(".png") && !/screenshot-❌|step-\d+/.test(f));
for (const file of shots) copyFileSync(file, join(raw, file.split(/[\\/]/).pop()));
rmSync(out, { recursive: true, force: true });
console.log(`${shots.length} screenshot(s) → fastlane/screenshots/raw`);
process.exit(result.status ?? 1);
