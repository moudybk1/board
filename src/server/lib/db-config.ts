/**
 * Single source of truth for "is a real database wired up?".
 *
 * Services fall back to in-memory mocks when it returns false, which is a
 * development convenience. In production that fallback would silently turn
 * every request into the mock player with a mock balance, so a missing
 * DATABASE_URL fails loudly there instead of degrading.
 */
export function isDbConfigured(): boolean {
  const configured = Boolean(process.env.DATABASE_URL);

  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_URL is required in production. Refusing to serve mock data.",
    );
  }

  return configured;
}
