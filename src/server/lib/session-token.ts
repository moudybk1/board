import { createHash, randomBytes } from "node:crypto";

/** Opaque session token for the client cookie / header. */
export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Persist only the hash of the session token. */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export function sessionExpiryDate(from = new Date()): Date {
  return new Date(from.getTime() + SESSION_TTL_MS);
}
