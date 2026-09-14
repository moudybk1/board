import { and, eq, sql } from "drizzle-orm";

import { MOCK_BALANCE, MOCK_PLAYER } from "@/lib/mock/lobby";
import { getDb } from "@/server/db";
import { transactions, userBalances, users } from "@/server/db/schema";
import {
  DepositError,
  getMockPendingDeposit,
  upsertMockDeposit,
  type DepositResult,
} from "@/server/services/deposit.service";

function dbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export type ConfirmDepositInput = {
  transactionId: string;
  txHash?: string;
  /** When true, mark the deposit failed instead of confirming. */
  fail?: boolean;
};

/**
 * Confirm (or fail) a pending deposit and credit `user_balances` / `users.balance`
 * when successful. Stands in for a chain listener until Robinhood RPC hooks land.
 */
export async function confirmDeposit(
  input: ConfirmDepositInput,
): Promise<DepositResult> {
  if (!dbConfigured()) {
    const pending = getMockPendingDeposit(input.transactionId);
    if (!pending) {
      throw new DepositError("Deposit not found.", 404);
    }
    if (pending.status !== "pending") {
      throw new DepositError("Deposit is no longer pending.", 409);
    }

    const next: DepositResult["transaction"] = {
      ...pending,
      status: input.fail ? "failed" : "confirmed",
      txHash: input.fail
        ? null
        : (input.txHash ?? `0xmock${Date.now().toString(16)}`),
      note: input.fail
        ? "Rejected by mock chain listener"
        : pending.note,
    };
    upsertMockDeposit(next);

    if (!input.fail && (pending.id.startsWith("dep_") || true)) {
      // Mock balance lives in MOCK_BALANCE constant · confirmation is recorded
      // on the ledger only until a mutable mock store is needed.
      void MOCK_PLAYER;
      void MOCK_BALANCE;
    }

    return { transaction: next, source: "mock" };
  }

  const db = getDb();

  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.id, input.transactionId),
          eq(transactions.type, "deposit"),
        ),
      )
      .limit(1)
      .for("update");

    if (!row) {
      throw new DepositError("Deposit not found.", 404);
    }
    if (row.status !== "pending") {
      throw new DepositError("Deposit is no longer pending.", 409);
    }

    if (input.fail) {
      const [updated] = await tx
        .update(transactions)
        .set({
          status: "failed",
          note: "Rejected by chain listener",
          updatedAt: new Date(),
        })
        .where(eq(transactions.id, row.id))
        .returning();

      return {
        transaction: mapRow(updated),
        source: "database" as const,
      };
    }

    const amount = Number(row.amount);
    const txHash = input.txHash ?? `0x${row.id.replace(/-/g, "").slice(0, 40)}`;

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
        available: amount.toFixed(2),
        chain: row.chain,
        walletAddress: row.walletAddress,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userBalances.userId,
        set: {
          available: sql`${userBalances.available} + ${amount.toFixed(2)}`,
          walletAddress: row.walletAddress ?? userBalances.walletAddress,
          chain: row.chain,
          updatedAt: new Date(),
        },
      });

    // Keep legacy users.balance in sync for older join/settle paths.
    await tx
      .update(users)
      .set({
        balance: sql`${users.balance} + ${amount.toFixed(2)}`,
      })
      .where(eq(users.id, row.userId));

    return {
      transaction: mapRow(updated),
      source: "database" as const,
    };
  });
}

function mapRow(row: typeof transactions.$inferSelect): DepositResult["transaction"] {
  return {
    id: row.id,
    type: "deposit",
    status: row.status,
    amount: Number(row.amount),
    chain: row.chain,
    walletAddress: row.walletAddress,
    txHash: row.txHash,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}
