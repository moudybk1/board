import type { DieValue } from "@/lib/game/dice";
import {
  findCaptures,
  grantsExtraTurn,
  nextActiveSeat,
  sendHome,
  type CaptureResult,
} from "@/lib/game/ludo-rules";
import type { LudoPawn, LudoPlayer, LudoRoomState } from "@/lib/mock/ludo";

export type CaptureApplyResult = {
  players: LudoPlayer[];
  captures: CaptureResult[];
};

/**
 * Resolve captures after a pawn lands: opponents on the same (unsafe) track
 * cell are sent back to their yard.
 */
export function applyLudoCaptures(
  state: LudoRoomState,
  moverSeat: number,
  movedPawn: LudoPawn,
): CaptureApplyResult {
  const captures = findCaptures(state, moverSeat, movedPawn);
  if (captures.length === 0) {
    return { players: state.players, captures };
  }

  const players = state.players.map((player) => {
    const hit = captures.filter((entry) => entry.victimSeat === player.position);
    if (hit.length === 0) return player;
    return {
      ...player,
      pawns: player.pawns.map((pawn) =>
        hit.some((entry) => entry.victimPawnId === pawn.id)
          ? sendHome(pawn)
          : pawn,
      ),
    };
  });

  return { players, captures };
}

/**
 * Extra turn on a 6, a capture, or finishing a pawn.
 */
export function grantsLudoExtraTurn(
  roll: DieValue,
  movedPawn: LudoPawn,
  captured = false,
): boolean {
  return grantsExtraTurn({ roll, movedPawn, captured });
}

/** @deprecated Prefer nextActiveSeat from ludo-rules. */
export function nextLudoSeat(
  players: LudoPlayer[],
  currentSeat: number,
): { activeSeat: number; turnDelta: number } {
  return nextActiveSeat(players, currentSeat);
}
