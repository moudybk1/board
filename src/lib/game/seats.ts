/**
 * Seat identity is shared by every game surface so seat colours stay consistent.
 */

export type SeatColor = {
  /** Tailwind background utility for filled swatches and pawns. */
  bg: string;
  /** Tailwind text utility for names and cash figures. */
  text: string;
  /** Tailwind border utility for the active-turn frame. */
  border: string;
  /** Raw hex, needed where colour goes into sprite data or SVG fills. */
  hex: string;
  /** Shading hex for pawn outlines. */
  shadeHex: string;
  label: string;
};

export const SEAT_COLORS: readonly SeatColor[] = [
  {
    bg: "bg-gold",
    text: "text-gold",
    border: "border-gold",
    hex: "#6cff9f",
    shadeHex: "#2f9a5a",
    label: "Phosphor",
  },
  {
    bg: "bg-monopoly",
    text: "text-monopoly",
    border: "border-monopoly",
    hex: "#3ec9b0",
    shadeHex: "#1c7a6d",
    label: "Teal",
  },
  {
    bg: "bg-ludo",
    text: "text-ludo",
    border: "border-ludo",
    hex: "#ff7a59",
    shadeHex: "#b0442e",
    label: "Coral",
  },
  {
    bg: "bg-danger",
    text: "text-danger",
    border: "border-danger",
    hex: "#ff6b6b",
    shadeHex: "#96302f",
    label: "Red",
  },
];

/** Seats are 1-indexed at the table; the palette is 0-indexed. */
export function seatColor(position: number): SeatColor {
  return SEAT_COLORS[(position - 1) % SEAT_COLORS.length];
}
