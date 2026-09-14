export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

export type DiceRoll = {
  dice: [DieValue, DieValue];
  total: number;
  /** Doubles grant another roll in Monopoly. */
  isDouble: boolean;
};

/** Pip positions on a 3x3 grid, indexed 0-8 reading left to right, top to bottom. */
export const PIP_LAYOUT: Record<DieValue, readonly number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export function randomDie(): DieValue {
  return (Math.floor(Math.random() * 6) + 1) as DieValue;
}

export function rollDice(): DiceRoll {
  const dice: [DieValue, DieValue] = [randomDie(), randomDie()];
  return {
    dice,
    total: dice[0] + dice[1],
    isDouble: dice[0] === dice[1],
  };
}
