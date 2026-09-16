import { and, eq } from "drizzle-orm";

import { getDb } from "@/server/db";
import { transactions } from "@/server/db/schema";
import {
  DepositError,
  getMockPendingDeposit,
  upsertMockDeposit,
  type DepositResult,
} from "@/server/services/deposit.service";
import { isDbConfigured as dbConfigured } from "@/server/lib/db-config";
import { applyBalanceDelta } from "@/server/db/repositories/balances.repository";

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

    // Mock mode records the confirmation on the ledger only; MOCK_BALANCE is a
    // constant, so there is no mock balance to credit.
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

    await applyBalanceDelta(tx, row.userId, amount, {
      chain: row.chain,
      walletAddress: row.walletAddress,
    });

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
