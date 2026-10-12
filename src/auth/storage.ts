import * as Keychain from "react-native-keychain";
import type { TokenStorage } from "@noirly-dev/identity-mobile";

const SERVICE = "noirly-flow-identity";

export const keychainStorage: TokenStorage = {
  async getItem(key: string) {
    const result = await Keychain.getGenericPassword({
      service: `${SERVICE}:${key}`,
      rules: Keychain.SECURITY_RULES.AUTOMATIC_UPGRADE,
    });
    return result ? result.password : null;
  },
  async setItem(key: string, value: string) {
    await Keychain.setGenericPassword(key, value, {
      service: `${SERVICE}:${key}`,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },
  async removeItem(key: string) {
    await Keychain.resetGenericPassword({ service: `${SERVICE}:${key}` });
  },
};
