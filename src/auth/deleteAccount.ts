import { api } from "../api/client";
import { config } from "../config";
import { NoirlyIdentity } from "./identity";

export type DeletionProof = { password: string } | { confirmEmail: string };

export class DeleteAccountError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = "DeleteAccountError";
  }
}

async function callIdentity(proof: DeletionProof, verifyOnly: boolean): Promise<void> {
  const token = await NoirlyIdentity.getAccessToken();
  if (!token) throw new DeleteAccountError("You are signed out. Sign in again first.", "unauthorized");
  const response = await fetch(`${config.identityIssuer}/api/mobile/delete-account`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ...proof, verifyOnly }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new DeleteAccountError(data.message ?? "Could not delete the account", data.error ?? "request_failed");
  }
}

/**
 * Deletes the Noirly account and its Flow data, in an order that never loses
 * one without the other:
 *  1. Identity checks the password (or typed email) without deleting anything.
 *  2. Flow deletes this person's Flow data.
 *  3. Identity deletes the account (and tells Flow, which finds nothing left).
 * Then the local session is cleared.
 */
export async function deleteNoirlyAccount(proof: DeletionProof): Promise<void> {
  await callIdentity(proof, true);
  await api.deleteMe();
  await callIdentity(proof, false);
  await NoirlyIdentity.signOut();
}
