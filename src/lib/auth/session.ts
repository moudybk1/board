const SESSION_KEYS = [
  "board.session",
  "board.wallet",
  "board.auth",
] as const;

/**
 * Clear mock client session keys used by account / wallet UI.
 */
export function clearBoardSession() {
  if (typeof window === "undefined") return;

  for (const key of SESSION_KEYS) {
    try {
      window.sessionStorage.removeItem(key);
      window.localStorage.removeItem(key);
    } catch {
      // ignore quota / privacy mode
    }
  }
}

export function writeBoardSession(payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem("board.session", JSON.stringify(payload));
  } catch {
    // ignore
  }
}
