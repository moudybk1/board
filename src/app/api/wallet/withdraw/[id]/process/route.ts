import { NextResponse } from "next/server";

import { processWithdraw } from "@/server/services/withdraw-process.service";
import { WithdrawError } from "@/server/services/withdraw.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/wallet/withdraw/[id]/process · debit balance and confirm (or fail)
 * a pending withdraw. Stands in for the chain send worker.
 *
 * Body (optional): `{ txHash?: string, fail?: boolean }`
 */
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { error: "Missing withdraw id." },
      { status: 400 },
    );
  }

  let body: { txHash?: string; fail?: boolean } = {};
  try {
    const raw = await request.json();
    if (raw && typeof raw === "object") {
      body = raw as { txHash?: string; fail?: boolean };
    }
  } catch {
    // empty body ok
  }

  try {
    const result = await processWithdraw({
      transactionId: id,
      txHash: typeof body.txHash === "string" ? body.txHash : undefined,
      fail: Boolean(body.fail),
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof WithdrawError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error(`[POST /api/wallet/withdraw/${id}/process]`, error);
    return NextResponse.json(
      { error: "Failed to process withdraw." },
      { status: 500 },
    );
  }
}
