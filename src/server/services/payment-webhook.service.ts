/**
 * On-chain payment status webhook · verifies / updates reward payouts
 * (and optionally wallet deposit/withdraw ledger rows) from a chain listener.
 */
import { and, eq } from "drizzle-orm";

import { getDb } from "@/server/db";
import {
  feeLedger,
  rewardPayouts,
  transactions,
} from "@/server/db/schema";

function dbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export class PaymentWebhookError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PaymentWebhookError";
    this.status = status;
  }
}

export type PaymentWebhookKind = "reward_payout" | "deposit" | "withdraw";

export type PaymentWebhookStatus = "paid" | "confirmed" | "failed";

export type ProcessPaymentWebhookInput = {
  kind: PaymentWebhookKind;
  /** reward_payouts.id or transactions.id */
  id: string;
  status: PaymentWebhookStatus;
  txHash?: string;
  /** Optional fee ledger proofs when confirming a reward payout. */
  treasuryTxHash?: string;
  burnTxHash?: string;
  burnProofUri?: string;
};

export type ProcessPaymentWebhookResult = {
  kind: PaymentWebhookKind;
  id: string;
  status: string;
  txHash: string | null;
  source: "database" | "mock";
};

/**
 * Shared secret check for chain-indexer / payment webhooks.
 * When `PAYMENT_WEBHOOK_SECRET` is unset, requests are allowed (local mock).
 */
export function assertWebhookSecret(request: Request): void {
  const expected = process.env.PAYMENT_WEBHOOK_SECRET?.trim();
  if (!expected) return;

  const header =
    request.headers.get("x-webhook-secret")?.trim() ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();

  if (!header || header !== expected) {
    throw new PaymentWebhookError("Invalid webhook secret.", 401);
  }
}

function normalizePayoutStatus(
  status: PaymentWebhookStatus,
): "paid" | "failed" {
  if (status === "failed") return "failed";
  return "paid";
}

function normalizeTxStatus(
  status: PaymentWebhookStatus,
): "confirmed" | "failed" {
  if (status === "failed") return "failed";
  return "confirmed";
}

/**
 * Apply an on-chain payment verification event to reward_payouts or
 * wallet transactions. Idempotent when status/txHash are already set.
 */
export async function processPaymentWebhook(
  input: ProcessPaymentWebhookInput,
): Promise<ProcessPaymentWebhookResult> {
  if (input.kind === "reward_payout") {
    return confirmRewardPayout(input);
  }
  return confirmWalletTransaction(input);
}

async function confirmRewardPayout(
  input: ProcessPaymentWebhookInput,
): Promise<ProcessPaymentWebhookResult> {
  const nextStatus = normalizePayoutStatus(input.status);
  const txHash =
    nextStatus === "failed"
      ? null
      : (input.txHash ?? `0xpay${Date.now().toString(16)}`);

  if (!dbConfigured()) {
    return {
      kind: "reward_payout",
      id: input.id,
      status: nextStatus,
      txHash,
      source: "mock",
    };
  }

  const db = getDb();

  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(rewardPayouts)
      .where(eq(rewardPayouts.id, input.id))
      .limit(1)
      .for("update");

    if (!row) {
      throw new PaymentWebhookError("Reward payout not found.", 404);
    }

    if (row.status === "failed") {
      throw new PaymentWebhookError("Payout already marked failed.", 409);
    }

    if (row.status === "paid" && row.txHash && nextStatus === "paid") {
      // Idempotent re-delivery with same or new proof · refresh txHash if given.
      if (input.txHash && input.txHash !== row.txHash) {
        const [updated] = await tx
          .update(rewardPayouts)
          .set({ txHash: input.txHash })
          .where(eq(rewardPayouts.id, row.id))
          .returning();
        return {
          kind: "reward_payout" as const,
          id: updated.id,
          status: updated.status,
          txHash: updated.txHash,
          source: "database" as const,
        };
      }
      return {
        kind: "reward_payout" as const,
        id: row.id,
        status: row.status,
        txHash: row.txHash,
        source: "database" as const,
      };
    }

    const now = new Date();
    const [updated] = await tx
      .update(rewardPayouts)
      .set({
        status: nextStatus,
        txHash,
        paidAt: nextStatus === "paid" ? (row.paidAt ?? now) : row.paidAt,
        note:
          nextStatus === "failed"
            ? "Rejected by on-chain payment webhook"
            : (row.note ?? "Confirmed on-chain"),
      })
      .where(eq(rewardPayouts.id, row.id))
      .returning();

    if (nextStatus === "paid" && txHash) {
      await tx
        .update(transactions)
        .set({
          status: "confirmed",
          txHash,
          updatedAt: now,
        })
        .where(
          and(
            eq(transactions.referenceId, row.matchId),
            eq(transactions.type, "payout"),
            eq(transactions.userId, row.winnerUserId),
          ),
        );

      if (input.treasuryTxHash) {
        await tx
          .update(feeLedger)
          .set({ txHash: input.treasuryTxHash })
          .where(
            and(
              eq(feeLedger.rewardPayoutId, row.id),
              eq(feeLedger.kind, "treasury"),
            ),
          );
      }

      if (input.burnTxHash) {
        await tx
          .update(feeLedger)
          .set({
            txHash: input.burnTxHash,
            proofUri: input.burnProofUri ?? `mock://burn/${input.burnTxHash}`,
          })
          .where(
            and(
              eq(feeLedger.rewardPayoutId, row.id),
              eq(feeLedger.kind, "burn"),
            ),
          );
      }
    }

    if (nextStatus === "failed") {
      await tx
        .update(transactions)
        .set({
          status: "failed",
          note: "Rejected by on-chain payment webhook",
          updatedAt: now,
        })
        .where(
          and(
            eq(transactions.referenceId, row.matchId),
            eq(transactions.type, "payout"),
            eq(transactions.userId, row.winnerUserId),
          ),
        );
    }

    return {
      kind: "reward_payout" as const,
      id: updated.id,
      status: updated.status,
      txHash: updated.txHash,
      source: "database" as const,
    };
  });
}

async function confirmWalletTransaction(
  input: ProcessPaymentWebhookInput,
): Promise<ProcessPaymentWebhookResult> {
  const nextStatus = normalizeTxStatus(input.status);
  const expectedType = input.kind === "deposit" ? "deposit" : "withdraw";
  const txHash =
    nextStatus === "failed"
      ? null
      : (input.txHash ?? `0x${expectedType.slice(0, 3)}${Date.now().toString(16)}`);

  if (!dbConfigured()) {
    return {
      kind: input.kind,
      id: input.id,
      status: nextStatus,
      txHash,
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
          eq(transactions.id, input.id),
          eq(transactions.type, expectedType),
        ),
      )
      .limit(1)
      .for("update");

    if (!row) {
      throw new PaymentWebhookError(`${expectedType} not found.`, 404);
    }

    if (row.status !== "pending" && row.status !== nextStatus) {
      throw new PaymentWebhookError(
        `${expectedType} is no longer pending.`,
        409,
      );
    }

    if (row.status === nextStatus && row.txHash) {
      return {
        kind: input.kind,
        id: row.id,
        status: row.status,
        txHash: row.txHash,
        source: "database" as const,
      };
    }

    const [updated] = await tx
      .update(transactions)
      .set({
        status: nextStatus,
        txHash,
        note:
          nextStatus === "failed"
            ? "Rejected by on-chain payment webhook"
            : row.note,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, row.id))
      .returning();

    return {
      kind: input.kind,
      id: updated.id,
      status: updated.status,
      txHash: updated.txHash,
      source: "database" as const,
    };
  });
}
