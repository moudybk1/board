export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

export type DiceRoll = {
  dice: [DieValue, DieValue];
  total: number;
  /** Doubles grant another roll in Monopoly. */
  isDouble: boolean;
};

/** Produces one die face. Swapped out on the server for a secure source. */
export type DieSource = () => DieValue;

/** Pip positions on a 3x3 grid, indexed 0-8 reading left to right, top to bottom. */
export const PIP_LAYOUT: Record<DieValue, readonly number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const DIE_FACES = [1, 2, 3, 4, 5, 6] as const;

/** Turn a 0-5 index into a die face without asserting the type. */
export function dieFromIndex(index: number): DieValue {
  return DIE_FACES[Math.abs(Math.trunc(index)) % DIE_FACES.length];
}

/**
 * Die face for animation and previews only.
 *
 * `Math.random` is not a cryptographic generator, so it must never decide a
 * match with real entry fees. Authoritative rolls use `secureDie` from
 * `@/server/lib/secure-dice`.
 */
export function randomDie(): DieValue {
  return dieFromIndex(Math.floor(Math.random() * DIE_FACES.length));
}

/** Roll two dice from the given source, defaulting to the display source. */
export function rollDice(die: DieSource = randomDie): DiceRoll {
  const dice: [DieValue, DieValue] = [die(), die()];
  return {
    dice,
    total: dice[0] + dice[1],
    isDouble: dice[0] === dice[1],
  };
}
