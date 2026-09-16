import { eq } from "drizzle-orm";

import { MOCK_PLAYER, MOCK_BALANCE } from "@/lib/mock/lobby";
import { getDb } from "@/server/db";
import { transactions, users } from "@/server/db/schema";
import { isDbConfigured as dbConfigured } from "@/server/lib/db-config";

export type DepositRequest = {
  userId: string;
  amount: number;
  walletAddress?: string;
};

export type DepositResult = {
  transaction: {
    id: string;
    type: "deposit";
    status: "pending" | "confirmed" | "failed";
    amount: number;
    chain: string;
    walletAddress: string | null;
    txHash: string | null;
    note: string | null;
    createdAt: string;
  };
  source: "database" | "mock";
};

const mockDeposits = new Map<string, DepositResult["transaction"]>();

/**
 * Create a deposit ledger row in `pending` status. Balance is credited only
 * after confirmation (see confirmDeposit).
 */
export async function createPendingDeposit(
  input: DepositRequest,
): Promise<DepositResult> {
  const amount = input.amount;
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new DepositError("Amount must be a positive number.", 400);
  }

  if (!dbConfigured()) {
    if (input.userId !== MOCK_PLAYER.id && input.userId !== "me") {
      throw new DepositError("User not found.", 404);
    }

    const id = `dep_${Date.now().toString(36)}`;
    const transaction: DepositResult["transaction"] = {
      id,
      type: "deposit",
      status: "pending",
      amount,
      chain: MOCK_BALANCE.chain,
      walletAddress: input.walletAddress ?? MOCK_BALANCE.address,
      txHash: null,
      note: "Wallet → platform",
      createdAt: new Date().toISOString(),
    };
    mockDeposits.set(id, transaction);
    return { transaction, source: "mock" };
  }

  const db = getDb();
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);

  if (!user) {
    throw new DepositError("User not found.", 404);
  }

  const [row] = await db
    .insert(transactions)
    .values({
      userId: user.id,
      type: "deposit",
      status: "pending",
      amount: amount.toFixed(2),
      walletAddress: input.walletAddress ?? null,
      note: "Wallet → platform",
    })
    .returning();

  return {
    transaction: {
      id: row.id,
      type: "deposit",
      status: row.status,
      amount: Number(row.amount),
      chain: row.chain,
      walletAddress: row.walletAddress,
      txHash: row.txHash,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
    },
    source: "database",
  };
}

/** Test/mock helper · pending deposits waiting for confirmation. */
export function getMockPendingDeposit(id: string) {
  return mockDeposits.get(id) ?? null;
}

export function upsertMockDeposit(tx: DepositResult["transaction"]) {
  mockDeposits.set(tx.id, tx);
}

export class DepositError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DepositError";
    this.status = status;
  }
}
