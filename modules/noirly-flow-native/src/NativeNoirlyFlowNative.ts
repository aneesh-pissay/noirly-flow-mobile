import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

/**
 * Codegen spec. Kotlin (`android/`) and Objective-C++ (`ios/`) implement the
 * generated `NativeNoirlyFlowNativeSpec` from this file — change both when it
 * changes.
 */
export interface Spec extends TurboModule {
  /** Puts plain text on the system clipboard. */
  setClipboard(text: string): void;
  /**
   * Opens the system "save as" dialog (Android Storage Access Framework, iOS
   * Files export) and writes `contents` as UTF-8. Resolves with the saved
   * location, or `null` if the user cancelled.
   */
  saveTextFile(
    filename: string,
    mimeType: string,
    contents: string,
  ): Promise<string | null>;
  /** SharedPreferences / NSUserDefaults. Not for secrets — tokens stay in the keychain. */
  getPreference(key: string): Promise<string | null>;
  setPreference(key: string, value: string): void;
  removePreference(key: string): void;
}

export default TurboModuleRegistry.get<Spec>("NoirlyFlowNative");
