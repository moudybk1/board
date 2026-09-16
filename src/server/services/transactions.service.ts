import { and, desc, eq } from "drizzle-orm";

import { MOCK_PLAYER } from "@/lib/mock/lobby";
import { MOCK_TRANSACTIONS } from "@/lib/mock/wallet";
import { getDb } from "@/server/db";
import { transactions } from "@/server/db/schema";
import { isDbConfigured as dbConfigured } from "@/server/lib/db-config";

export type TransactionListItem = {
  id: string;
  type: string;
  status: string;
  amount: number;
  chain: string;
  walletAddress: string | null;
  txHash: string | null;
  note: string | null;
  createdAt: string;
};

export type ListTransactionsFilter = {
  userId: string;
  type?: string;
  status?: string;
};

/**
 * User transaction history, newest first. Supports optional type/status filters.
 */
export async function listUserTransactions(
  filter: ListTransactionsFilter,
): Promise<{ transactions: TransactionListItem[]; source: "database" | "mock" }> {
  if (!dbConfigured()) {
    if (filter.userId !== MOCK_PLAYER.id && filter.userId !== "me") {
      return { transactions: [], source: "mock" };
    }

    let rows = [...MOCK_TRANSACTIONS].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );

    if (filter.type) {
      rows = rows.filter((tx) => tx.type === filter.type);
    }
    if (filter.status) {
      rows = rows.filter((tx) => tx.status === filter.status);
    }

    return {
      transactions: rows.map((tx) => ({
        id: tx.id,
        type: tx.type,
        status: tx.status,
        amount: tx.amount,
        chain: "Robinhood Chain",
        walletAddress: null,
        txHash: null,
        note: tx.note,
        createdAt: tx.createdAt,
      })),
      source: "mock",
    };
  }

  const db = getDb();
  const conditions = [eq(transactions.userId, filter.userId)];

  if (
    filter.type === "deposit" ||
    filter.type === "withdraw" ||
    filter.type === "entry_fee" ||
    filter.type === "payout" ||
    filter.type === "fee"
  ) {
    conditions.push(eq(transactions.type, filter.type));
  }

  if (
    filter.status === "pending" ||
    filter.status === "confirmed" ||
    filter.status === "failed"
  ) {
    conditions.push(eq(transactions.status, filter.status));
  }

  const rows = await db
    .select()
    .from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.createdAt));

  return {
    transactions: rows.map((row) => ({
      id: row.id,
      type: row.type,
      status: row.status,
      amount: Number(row.amount),
      chain: row.chain,
      walletAddress: row.walletAddress,
      txHash: row.txHash,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
    })),
    source: "database",
  };
}
