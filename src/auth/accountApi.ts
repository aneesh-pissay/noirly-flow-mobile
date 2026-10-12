import { NoirlyIdentityError } from "@noirly-dev/identity-mobile";
import { config } from "../config";

/**
 * The Identity account endpoints the mobile package does not wrap: forgot /
 * reset password and resending the verification email. They are the same
 * routes the Identity web pages call, and none of them use cookies or CSRF.
 */
async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${config.identityIssuer.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
  } & T;
  if (!response.ok) {
    throw new NoirlyIdentityError(
      payload.message ?? "Request failed",
      payload.error ?? "request_failed",
      response.status,
    );
  }
  return payload;
}

export function requestPasswordReset(email: string) {
  return post<{ ok: true; message: string }>("/api/auth/forgot-password", {
    email: email.trim(),
  });
}

export function resetPassword(token: string, newPassword: string) {
  return post<{ ok: true }>("/api/auth/reset-password", { token, newPassword });
}

export function resendVerification(email: string) {
  return post<{ ok: true; message: string; cooldownSeconds?: number }>(
    "/api/auth/resend-verification",
    { email: email.trim() },
  );
}

/**
 * Accepts the whole link from the reset email (…/reset-password?token=…) or
 * the bare token, and returns the token — or null when it is clearly not one.
 */
export function extractResetToken(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  const match = value.match(/[?&]token=([^&#\s]+)/);
  const token = match ? decodeURIComponent(match[1]) : value;
  return /^[A-Za-z0-9._~-]{20,256}$/.test(token) ? token : null;
}

/** The same four rules as Identity's `isPasswordStrong`. */
export const PASSWORD_RULES = [
  { key: "length", label: "10+ characters", test: (p: string) => p.length >= 10 },
  { key: "case", label: "Upper & lowercase", test: (p: string) => /[A-Z]/.test(p) && /[a-z]/.test(p) },
  { key: "number", label: "A number", test: (p: string) => /[0-9]/.test(p) },
  { key: "symbol", label: "A symbol", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

export function isPasswordStrong(password: string) {
  return password.length <= 128 && PASSWORD_RULES.every((rule) => rule.test(password));
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function errorMessage(error: unknown, fallback = "Something went wrong") {
  if (error instanceof NoirlyIdentityError) {
    if (error.code === "rate_limited") return "Too many attempts. Wait a minute and try again.";
    if (error.code === "registration_failed") {
      return "We couldn't create that account. If you already have one, sign in or reset your password.";
    }
  }
  if (error instanceof Error && /Network request failed/i.test(error.message)) {
    return "No connection. Check your internet and try again.";
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

export function isUnverified(error: unknown) {
  return error instanceof NoirlyIdentityError && error.code === "email_not_verified";
}
