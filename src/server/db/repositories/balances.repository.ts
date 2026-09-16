/**
 * The one place that moves a player's spendable BOARD balance.
 *
 * Balance lives in two columns: `user_balances.available` (current) and
 * `users.balance` (legacy, still read by older join/settle paths). Reads prefer
 * `available` and fall back to `balance`. Room joins used to debit only the
 * legacy column, so an entry fee never reduced the withdrawable amount and the
 * same tokens could be spent on a match and then withdrawn.
 */
import { eq } from "drizzle-orm";

import { toBoardColumn } from "@/lib/money";
import { userBalances, users } from "@/server/db/schema";
import type { DbTx } from "@/server/db/types";
import { defineServiceError } from "@/server/lib/service-error";

/** Thrown when a balance operation targets a user that does not exist. */
export const BalanceError = defineServiceError("BalanceError");

export type BalanceDeltaMeta = {
  chain?: string | null;
  walletAddress?: string | null;
};

/**
 * Current spendable balance, with both rows locked for the rest of the
 * transaction so a concurrent join or withdraw cannot read the same amount.
 */
export async function lockAvailable(
  tx: DbTx,
  userId: string,
): Promise<number> {
  const [userRow] = await tx
    .select({ legacy: users.balance })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .for("update");

  if (!userRow) {
    throw new BalanceError("User not found.", 404);
  }

  const [balanceRow] = await tx
    .select({ available: userBalances.available })
    .from(userBalances)
    .where(eq(userBalances.userId, userId))
    .limit(1)
    .for("update");

  return balanceRow?.available != null
    ? Number(balanceRow.available)
    : Number(userRow.legacy);
}

/**
 * Add `delta` to the player's balance and return the new amount. Negative
 * values debit. Both columns are written, so every reader sees the same number.
 *
 * The caller checks affordability, because the failure message differs by
 * context (entry fee vs withdraw).
 */
export async function applyBalanceDelta(
  tx: DbTx,
  userId: string,
  delta: number,
  meta: BalanceDeltaMeta = {},
): Promise<number> {
  const current = await lockAvailable(tx, userId);
  const next = current + delta;
  const nextColumn = toBoardColumn(next);

  await tx
    .insert(userBalances)
    .values({
      userId,
      available: nextColumn,
      chain: meta.chain ?? undefined,
      walletAddress: meta.walletAddress ?? undefined,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userBalances.userId,
      set: {
        available: nextColumn,
        ...(meta.chain ? { chain: meta.chain } : {}),
        ...(meta.walletAddress ? { walletAddress: meta.walletAddress } : {}),
        updatedAt: new Date(),
      },
    });

  await tx
    .update(users)
    .set({ balance: nextColumn, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return next;
}
