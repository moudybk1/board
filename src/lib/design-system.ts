/**
 * BOARD design-system tokens. Typed mirrors of globals.css @theme.
 * Prefer Tailwind theme classes in JSX; use these for JS/canvas/GSAP.
 */
export const boardColors = {
  void: "#050706",
  ink: "#0a0e0c",
  surface: "#121816",
  surfaceRaised: "#1a211e",
  edge: "#2a3530",
  edgeBright: "#3d4d45",
  parchment: "#e6ebe7",
  muted: "#8b978f",
  faint: "#5c675f",
  /** Brand phosphor (token still named gold for class compatibility). */
  gold: "#6cff9f",
  goldDeep: "#2f9a5a",
  monopoly: "#3ec9b0",
  ludo: "#ff7a59",
  danger: "#ff6b6b",
  success: "#6cff9f",
} as const;

export const boardSpacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const boardMotion = {
  instant: 100,
  fast: 180,
  normal: 320,
  slow: 560,
} as const;

export const boardZ = {
  base: 0,
  raised: 10,
  sticky: 40,
  overlay: 50,
  toast: 60,
  modal: 70,
} as const;

export const PIXEL_AVATAR_IDS = [
  "pawn-gold",
  "pawn-teal",
  "pawn-violet",
  "pawn-rose",
  "dice-ink",
  "crown-lite",
] as const;

export type PixelAvatarId = (typeof PIXEL_AVATAR_IDS)[number];
