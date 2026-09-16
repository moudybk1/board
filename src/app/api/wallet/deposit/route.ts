import { NextResponse } from "next/server";

import {
  errorResponse,
  readJsonBody,
  readNumber,
  readOptionalString,
} from "@/server/lib/api-response";
import { requireUser } from "@/server/lib/require-user";
import { createPendingDeposit } from "@/server/services/deposit.service";

/**
 * POST /api/wallet/deposit · open a deposit with status `pending`.
 *
 * Body: `{ amount: number, walletAddress?: string }`
 *
 * Does not credit balance · confirmation comes from the deposit listener.
 */
export async function POST(request: Request) {
  try {
    const { userId } = await requireUser(request);
    const body = await readJsonBody(request);

    const result = await createPendingDeposit({
      userId,
      amount: readNumber(body, "amount"),
      walletAddress: readOptionalString(body, "walletAddress"),
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error, "POST /api/wallet/deposit");
  }
}
