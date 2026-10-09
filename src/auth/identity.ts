import { NoirlyIdentity, type NoirlySession } from "@noirly-dev/identity-mobile";
import { config } from "../config";
import { keychainStorage } from "./storage";

let configured = false;

export function configureIdentity() {
  if (configured) return;
  NoirlyIdentity.configure({
    issuer: config.identityIssuer,
    clientId: config.identityClientId,
    storage: keychainStorage,
  });
  configured = true;
}

export async function restoreSession(): Promise<NoirlySession | null> {
  configureIdentity();
  return NoirlyIdentity.getSession();
}

export { NoirlyIdentity };
