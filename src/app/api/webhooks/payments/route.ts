import { NextResponse } from "next/server";

import {
  assertWebhookSecret,
  PaymentWebhookError,
  processPaymentWebhook,
  type PaymentWebhookKind,
  type PaymentWebhookStatus,
} from "@/server/services/payment-webhook.service";

const KINDS = new Set<PaymentWebhookKind>([
  "reward_payout",
  "deposit",
  "withdraw",
]);

const STATUSES = new Set<PaymentWebhookStatus>([
  "paid",
  "confirmed",
  "failed",
]);

/**
 * POST /api/webhooks/payments · chain-indexer hook that verifies on-chain
 * payment status for reward payouts (and deposit/withdraw ledger rows).
 *
 * Headers: `x-webhook-secret` or `Authorization: Bearer …` when
 * `PAYMENT_WEBHOOK_SECRET` is set.
 *
 * Body:
 * `{ kind: "reward_payout"|"deposit"|"withdraw", id: string,
 *    status: "paid"|"confirmed"|"failed", txHash?: string,
 *    treasuryTxHash?: string, burnTxHash?: string, burnProofUri?: string }`
 */
export async function POST(request: Request) {
  try {
    assertWebhookSecret(request);
  } catch (error) {
    if (error instanceof PaymentWebhookError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    throw error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const kind = raw.kind;
  const id = raw.id;
  const status = raw.status;

  if (typeof kind !== "string" || !KINDS.has(kind as PaymentWebhookKind)) {
    return NextResponse.json(
      { error: "kind must be reward_payout, deposit, or withdraw." },
      { status: 400 },
    );
  }
  if (typeof id !== "string" || !id.trim()) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }
  if (
    typeof status !== "string" ||
    !STATUSES.has(status as PaymentWebhookStatus)
  ) {
    return NextResponse.json(
      { error: "status must be paid, confirmed, or failed." },
      { status: 400 },
    );
  }

  try {
    const result = await processPaymentWebhook({
      kind: kind as PaymentWebhookKind,
      id: id.trim(),
      status: status as PaymentWebhookStatus,
      txHash: typeof raw.txHash === "string" ? raw.txHash : undefined,
      treasuryTxHash:
        typeof raw.treasuryTxHash === "string" ? raw.treasuryTxHash : undefined,
      burnTxHash: typeof raw.burnTxHash === "string" ? raw.burnTxHash : undefined,
      burnProofUri:
        typeof raw.burnProofUri === "string" ? raw.burnProofUri : undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PaymentWebhookError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[POST /api/webhooks/payments]", error);
    return NextResponse.json(
      { error: "Failed to process payment webhook." },
      { status: 500 },
    );
  }
}
