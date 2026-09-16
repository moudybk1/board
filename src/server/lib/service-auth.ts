import { timingSafeEqual } from "node:crypto";

import { defineServiceError } from "@/server/lib/service-error";

/** Thrown when a machine-to-machine caller presents no or a wrong secret. */
export const ServiceAuthError = defineServiceError("ServiceAuthError");

/** Compare without leaking the matching prefix length through timing. */
function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Read the shared secret from either accepted header. */
function readSecret(request: Request): string | null {
  const direct = request.headers.get("x-webhook-secret")?.trim();
  if (direct) return direct;

  const auth = request.headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }

  return null;
}

/**
 * Gate for endpoints called by the chain indexer and payout worker rather than
 * by a signed-in player: deposit confirmation, withdraw processing, burn
 * proofs, and the payment webhook.
 *
 * When `PAYMENT_WEBHOOK_SECRET` is unset the endpoint is open in development
 * and refuses to serve in production. The previous behaviour was to allow the
 * request either way, so a missing env var disabled authentication instead of
 * disabling the endpoint.
 */
export function assertServiceSecret(request: Request): void {
  const expected = process.env.PAYMENT_WEBHOOK_SECRET?.trim();

  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      throw new ServiceAuthError(
        "PAYMENT_WEBHOOK_SECRET is not configured.",
        503,
      );
    }
    return;
  }

  const provided = readSecret(request);
  if (!provided || !secretsMatch(provided, expected)) {
    throw new ServiceAuthError("Invalid webhook secret.", 401);
  }
}
