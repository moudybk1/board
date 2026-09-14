/**
 * Game SFX façade · delegates to the global BOARD audio manager so mute /
 * volume controls apply everywhere.
 */
import { playSfx } from "@/lib/audio/audio-manager";

/** Soft click when a die settles. */
export function playRollSound() {
  playSfx("dice_roll");
}

/** Bright chime when a pawn is captured ("eaten"). */
export function playCaptureSound() {
  playSfx("capture");
}

/** Soft hop tick used optionally on each tile step. */
export function playHopSound() {
  playSfx("pawn_step");
}

export function playWinSound() {
  playSfx("win");
}

export function playLoseSound() {
  playSfx("lose");
}
