import NativeModule from "./NativeNoirlyFlowNative";

/**
 * Thin wrapper over the TurboModule. When the native side is missing — a
 * binary built before this module existed, or Jest — clipboard and save throw a
 * clear error and preferences fall back to memory, so callers never crash on
 * an `undefined` module.
 */

const memory = new Map<string, string>();

function required() {
  if (!NativeModule) {
    throw new Error(
      "NoirlyFlowNative is not linked. Rebuild the app (npm run android / ios).",
    );
  }
  return NativeModule;
}

export const isNativeAvailable = NativeModule != null;

export function copyToClipboard(text: string): void {
  required().setClipboard(text);
}

/** Resolves with the saved location, or `null` when the user cancels. */
export function saveTextFile(
  filename: string,
  contents: string,
  mimeType = "text/plain",
): Promise<string | null> {
  return required().saveTextFile(filename, mimeType, contents);
}

export async function getPreference(key: string): Promise<string | null> {
  if (!NativeModule) return memory.get(key) ?? null;
  return NativeModule.getPreference(key);
}

export function setPreference(key: string, value: string | null): void {
  if (!NativeModule) {
    if (value == null) memory.delete(key);
    else memory.set(key, value);
    return;
  }
  if (value == null) NativeModule.removePreference(key);
  else NativeModule.setPreference(key, value);
}
