import { NextResponse } from "next/server";

import {
  confirmDeposit,
} from "@/server/services/deposit-confirm.service";
import { DepositError } from "@/server/services/deposit.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/wallet/deposit/[id]/confirm · mock chain listener hook.
 *
 * Body (optional): `{ txHash?: string, fail?: boolean }`
 * Marks the pending deposit confirmed (credits balance) or failed.
 */
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing deposit id." }, { status: 400 });
  }

  let body: { txHash?: string; fail?: boolean } = {};
  try {
    const raw = await request.json();
    if (raw && typeof raw === "object") {
      body = raw as { txHash?: string; fail?: boolean };
    }
  } catch {
    // empty body is fine
  }

  try {
    const result = await confirmDeposit({
      transactionId: id,
      txHash: typeof body.txHash === "string" ? body.txHash : undefined,
      fail: Boolean(body.fail),
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DepositError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error(`[POST /api/wallet/deposit/${id}/confirm]`, error);
    return NextResponse.json(
      { error: "Failed to confirm deposit." },
      { status: 500 },
    );
  }
}
