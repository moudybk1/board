import { randomInt } from "node:crypto";

import {
  dieFromIndex,
  rollDice,
  type DiceRoll,
  type DieValue,
} from "@/lib/game/dice";

/**
 * Die face for authoritative rolls, drawn from the platform CSPRNG.
 *
 * `Math.random` uses V8's xorshift128+, whose internal state can be recovered
 * from a run of observed outputs, which would let a player predict rolls in
 * matches that pay out real tokens. `randomInt` also rejects the modulo bias a
 * naive `% 6` would introduce.
 */
export function secureDie(): DieValue {
  return dieFromIndex(randomInt(0, 6));
}

/** Two dice from the secure source, for Monopoly. */
export function secureRollDice(): DiceRoll {
  return rollDice(secureDie);
}
