/** BOARD amounts are stored with two decimal places. */
export const BOARD_DECIMALS = 2;

const SCALE = 10 ** BOARD_DECIMALS;

/**
 * Round a BOARD amount to the stored precision.
 *
 * Balances are held in Postgres `numeric(20,2)` but read into JS numbers, so
 * every computed amount is rounded back to two decimals before it is written.
 */
export function roundBoard(amount: number): number {
  return Math.round(amount * SCALE) / SCALE;
}

/** Format a BOARD amount for a `numeric` column. */
export function toBoardColumn(amount: number): string {
  return roundBoard(amount).toFixed(BOARD_DECIMALS);
}
