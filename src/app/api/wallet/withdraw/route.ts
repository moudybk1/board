import { NextResponse } from "next/server";

import {
  errorResponse,
  readJsonBody,
  readNumber,
  readOptionalString,
} from "@/server/lib/api-response";
import { requireUser } from "@/server/lib/require-user";
import { createPendingWithdraw } from "@/server/services/withdraw.service";

/**
 * POST /api/wallet/withdraw · request a withdraw after an available-balance check.
 *
 * Body: `{ amount: number, walletAddress?: string }`
 *
 * Creates a pending ledger row; the process service debits balance + confirms.
 */
export async function POST(request: Request) {
  try {
    const { userId } = await requireUser(request);
    const body = await readJsonBody(request);

    const result = await createPendingWithdraw({
      userId,
      amount: readNumber(body, "amount"),
      walletAddress: readOptionalString(body, "walletAddress"),
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error, "POST /api/wallet/withdraw");
  }
}
