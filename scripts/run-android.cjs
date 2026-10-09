/**
 * Windows-friendly android runner: short GRADLE_USER_HOME on D: avoids
 * MAX_PATH failures and C: disk pressure during native CMake builds.
 * Also targets the connected device/emulator ABI so arm64-only APKs
 * do not crash on x86_64 emulators (missing libreactnative.so).
 */
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const isWin = process.platform === "win32";
const env = { ...process.env, CI: process.env.CI ?? "true" };

if (isWin) {
  const gradleHome = "D:\\g";
  const tmp = "D:\\tmp";
  fs.mkdirSync(gradleHome, { recursive: true });
  fs.mkdirSync(tmp, { recursive: true });
  env.GRADLE_USER_HOME = gradleHome;
  env.TEMP = tmp;
  env.TMP = tmp;
}

function detectDeviceAbi() {
  const result = spawnSync("adb", ["shell", "getprop", "ro.product.cpu.abi"], {
    encoding: "utf8",
    shell: isWin,
  });
  if (result.status !== 0) {
    return null;
  }
  const abi = String(result.stdout || "").trim();
  return abi || null;
}

const extraArgs = process.argv.slice(2);
const hasArchOverride = extraArgs.some(
  (arg) =>
    arg.startsWith("--mode") ||
    arg.includes("reactNativeArchitectures") ||
    arg.startsWith("--active-arch-only"),
);

const args = ["react-native", "run-android", "--no-packager", ...extraArgs];
if (!hasArchOverride) {
  // The RN CLI does not accept raw Gradle `-P...` properties as run-android options.
  // Use the supported `--active-arch-only` flag instead (it uses the detected ABI
  // internally via the `reactNativeArchitectures` Gradle property).
  const abi = detectDeviceAbi();
  if (abi) args.push("--active-arch-only");
}

const child = spawn("npx", args, {
  cwd: path.join(__dirname, ".."),
  env,
  stdio: "inherit",
  shell: isWin,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
