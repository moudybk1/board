/**
 * BOARD design-system tokens. Typed mirrors of globals.css @theme.
 * Prefer Tailwind theme classes in JSX; use these for JS/canvas/GSAP.
 */
export const boardColors = {
  void: "#2d170c",
  ink: "#fff4c4",
  surface: "#fffaf1",
  surfaceRaised: "#fff6de",
  edge: "#2d170c",
  edgeBright: "#6b3a14",
  parchment: "#2d170c",
  muted: "#7a4e2a",
  faint: "#8d5a32",
  cream: "#fff8e4",
  felt: "#2ecf7a",
  /** Brand lemon (token still named gold for class compatibility). */
  gold: "#ffd23a",
  goldDeep: "#c45a00",
  monopoly: "#1298c9",
  ludo: "#e83f86",
  danger: "#e23b3b",
  success: "#1a9f4b",
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
