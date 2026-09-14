import { and, eq, sql } from "drizzle-orm";

import { getDb } from "@/server/db";
import { transactions, userBalances, users } from "@/server/db/schema";
import {
  getMockPendingWithdraw,
  upsertMockWithdraw,
  WithdrawError,
  type WithdrawResult,
} from "@/server/services/withdraw.service";
import { getUserBalance } from "@/server/services/balance.service";

function dbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export type ProcessWithdrawInput = {
  transactionId: string;
  txHash?: string;
  fail?: boolean;
};

/**
 * Process a pending withdraw: debit available balance and mark confirmed, or
 * mark failed without debiting. Call after the chain send is accepted/rejected.
 */
export async function processWithdraw(
  input: ProcessWithdrawInput,
): Promise<WithdrawResult> {
  if (!dbConfigured()) {
    const pending = getMockPendingWithdraw(input.transactionId);
    if (!pending) {
      throw new WithdrawError("Withdraw not found.", 404);
    }
    if (pending.status !== "pending") {
      throw new WithdrawError("Withdraw is no longer pending.", 409);
    }

    const absolute = Math.abs(pending.amount);
    const balance = await getUserBalance("u_me");
    const available = balance?.available ?? 0;

    if (!input.fail && absolute > available) {
      throw new WithdrawError(
        `Insufficient available balance. You can withdraw up to ${available} BOARD.`,
        400,
      );
    }

    const next: WithdrawResult["transaction"] = {
      ...pending,
      status: input.fail ? "failed" : "confirmed",
      txHash: input.fail
        ? null
        : (input.txHash ?? `0xwd${Date.now().toString(16)}`),
      note: input.fail ? "Withdraw rejected by mock processor" : pending.note,
    };
    upsertMockWithdraw(next);

    return {
      transaction: next,
      availableAfter: input.fail ? available : available - absolute,
      source: "mock",
    };
  }

  const db = getDb();

  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.id, input.transactionId),
          eq(transactions.type, "withdraw"),
        ),
      )
      .limit(1)
      .for("update");

    if (!row) {
      throw new WithdrawError("Withdraw not found.", 404);
    }
    if (row.status !== "pending") {
      throw new WithdrawError("Withdraw is no longer pending.", 409);
    }

    const absolute = Math.abs(Number(row.amount));

    if (input.fail) {
      const [updated] = await tx
        .update(transactions)
        .set({
          status: "failed",
          note: "Withdraw rejected by processor",
          updatedAt: new Date(),
        })
        .where(eq(transactions.id, row.id))
        .returning();

      const balance = await getUserBalance(row.userId);

      return {
        transaction: mapRow(updated),
        availableAfter: balance?.available ?? 0,
        source: "database" as const,
      };
    }

    const [balanceRow] = await tx
      .select({
        available: userBalances.available,
        legacy: users.balance,
      })
      .from(users)
      .leftJoin(userBalances, eq(userBalances.userId, users.id))
      .where(eq(users.id, row.userId))
      .limit(1)
      .for("update");

    const available =
      balanceRow?.available != null
        ? Number(balanceRow.available)
        : Number(balanceRow?.legacy ?? 0);

    if (absolute > available) {
      throw new WithdrawError(
        `Insufficient available balance. You can withdraw up to ${available} BOARD.`,
        400,
      );
    }

    const txHash =
      input.txHash ?? `0x${row.id.replace(/-/g, "").slice(0, 40)}`;

    const [updated] = await tx
      .update(transactions)
      .set({
        status: "confirmed",
        txHash,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, row.id))
      .returning();

    await tx
      .insert(userBalances)
      .values({
        userId: row.userId,
        available: (available - absolute).toFixed(2),
        chain: row.chain,
        walletAddress: row.walletAddress,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userBalances.userId,
        set: {
          available: sql`${userBalances.available} - ${absolute.toFixed(2)}`,
          updatedAt: new Date(),
        },
      });

    await tx
      .update(users)
      .set({
        balance: sql`${users.balance} - ${absolute.toFixed(2)}`,
      })
      .where(eq(users.id, row.userId));

    return {
      transaction: mapRow(updated),
      availableAfter: available - absolute,
      source: "database" as const,
    };
  });
}

function mapRow(
  row: typeof transactions.$inferSelect,
): WithdrawResult["transaction"] {
  return {
    id: row.id,
    type: "withdraw",
    status: row.status,
    amount: Number(row.amount),
    chain: row.chain,
    walletAddress: row.walletAddress,
    txHash: row.txHash,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}
