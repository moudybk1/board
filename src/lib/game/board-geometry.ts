import {
  BOARD_SIZE,
  BOARD_TILE_COUNT,
  tilePlacement,
} from "@/lib/game/monopoly-board";

/**
 * Converts tile indices into positions on the board, expressed as percentages
 * of the board's width and height. Percentages keep pawns correct at every
 * board size without measuring the DOM.
 */

const CELL = 100 / BOARD_SIZE;

/** Up to four pawns share a tile, so each seat gets a quadrant of it. */
const SEAT_OFFSETS: readonly { x: number; y: number }[] = [
  { x: -0.18, y: -0.18 },
  { x: 0.18, y: -0.18 },
  { x: -0.18, y: 0.18 },
  { x: 0.18, y: 0.18 },
];

export type BoardPoint = { x: number; y: number };

/** Centre of a tile, in percent of the board box. */
export function tileCenter(index: number): BoardPoint {
  const { row, col } = tilePlacement(index);
  return {
    x: (col - 0.5) * CELL,
    y: (row - 0.5) * CELL,
  };
}

/** Where a given seat's pawn sits within a tile. */
export function pawnPoint(index: number, seat: number): BoardPoint {
  const center = tileCenter(index);
  const offset = SEAT_OFFSETS[(seat - 1) % SEAT_OFFSETS.length];
  return {
    x: center.x + offset.x * CELL,
    y: center.y + offset.y * CELL,
  };
}

/**
 * Tile indices a pawn passes through moving `steps` forward, excluding the
 * starting tile. Used to animate one hop per tile instead of sliding across
 * the middle of the board.
 */
export function pathForward(from: number, steps: number): number[] {
  return Array.from(
    { length: steps },
    (_, i) => (from + i + 1) % BOARD_TILE_COUNT,
  );
}
