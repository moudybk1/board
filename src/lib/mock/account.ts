/**
 * Mock account / profile / session data for Akun & Dompet surfaces.
 */

export type MockAccount = {
  userId: string;
  username: string;
  email: string;
  avatarId: string;
  joinedAt: string;
  walletConnected: boolean;
  walletAddress: string;
  chain: string;
};

export const MOCK_ACCOUNT: MockAccount = {
  userId: "u_me",
  username: "Yoga",
  email: "yoga@board.gg",
  avatarId: "pawn-gold",
  joinedAt: "2026-08-01T00:00:00.000Z",
  walletConnected: true,
  walletAddress: "0x7A3f9C21bE04dD5e8f1A2b6C09Ee4471D8b3F5a2",
  chain: "Robinhood Chain",
};

export const PIXEL_AVATARS = [
  { id: "pawn-gold", label: "Gold pawn", tint: "#f5c451" },
  { id: "pawn-teal", label: "Teal pawn", tint: "#3fd6c1" },
  { id: "pawn-violet", label: "Violet pawn", tint: "#a78bfa" },
  { id: "pawn-rose", label: "Rose pawn", tint: "#ff6b6b" },
  { id: "dice-ink", label: "Ink die", tint: "#8e9bc0" },
  { id: "crown-lite", label: "Lite crown", tint: "#e8ecf8" },
] as const;
