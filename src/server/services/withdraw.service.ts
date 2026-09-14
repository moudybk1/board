import { eq } from "drizzle-orm";

import { MOCK_BALANCE, MOCK_PLAYER } from "@/lib/mock/lobby";
import { getDb } from "@/server/db";
import { transactions, users } from "@/server/db/schema";
import { getUserBalance } from "@/server/services/balance.service";

function dbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export type WithdrawRequest = {
  userId: string;
  amount: number;
  walletAddress?: string;
};

export type WithdrawResult = {
  transaction: {
    id: string;
    type: "withdraw";
    status: "pending" | "confirmed" | "failed";
    amount: number;
    chain: string;
    walletAddress: string | null;
    txHash: string | null;
    note: string | null;
    createdAt: string;
  };
  availableAfter: number;
  source: "database" | "mock";
};

const mockWithdraws = new Map<string, WithdrawResult["transaction"]>();

export class WithdrawError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "WithdrawError";
    this.status = status;
  }
}

/**
 * Open a withdraw with balance validation. Creates a `pending` ledger row
 * (negative amount). Balance debit is applied by the process service.
 */
export async function createPendingWithdraw(
  input: WithdrawRequest,
): Promise<WithdrawResult> {
  const amount = input.amount;
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new WithdrawError("Amount must be a positive number.", 400);
  }

  const balance = await getUserBalance(input.userId);
  if (!balance) {
    throw new WithdrawError("User not found.", 404);
  }

  if (amount > balance.available) {
    throw new WithdrawError(
      `Insufficient available balance. You can withdraw up to ${balance.available} BOARD.`,
      400,
    );
  }

  if (!dbConfigured()) {
    if (input.userId !== MOCK_PLAYER.id && input.userId !== "me") {
      throw new WithdrawError("User not found.", 404);
    }

    const id = `wd_${Date.now().toString(36)}`;
    const transaction: WithdrawResult["transaction"] = {
      id,
      type: "withdraw",
      status: "pending",
      amount: -amount,
      chain: MOCK_BALANCE.chain,
      walletAddress: input.walletAddress ?? MOCK_BALANCE.address,
      txHash: null,
      note: "Platform → wallet",
      createdAt: new Date().toISOString(),
    };
    mockWithdraws.set(id, transaction);

    return {
      transaction,
      availableAfter: balance.available - amount,
      source: "mock",
    };
  }

  const db = getDb();
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);

  if (!user) {
    throw new WithdrawError("User not found.", 404);
  }

  const [row] = await db
    .insert(transactions)
    .values({
      userId: user.id,
      type: "withdraw",
      status: "pending",
      amount: (-amount).toFixed(2),
      walletAddress: input.walletAddress ?? balance.address,
      note: "Platform → wallet",
    })
    .returning();

  return {
    transaction: {
      id: row.id,
      type: "withdraw",
      status: row.status,
      amount: Number(row.amount),
      chain: row.chain,
      walletAddress: row.walletAddress,
      txHash: row.txHash,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
    },
    availableAfter: balance.available - amount,
    source: "database",
  };
}

export function getMockPendingWithdraw(id: string) {
  return mockWithdraws.get(id) ?? null;
}

export function upsertMockWithdraw(tx: WithdrawResult["transaction"]) {
  mockWithdraws.set(tx.id, tx);
}
