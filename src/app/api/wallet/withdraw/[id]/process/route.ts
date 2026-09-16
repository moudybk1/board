import { NextResponse } from "next/server";

import {
  errorResponse,
  readJsonBody,
  readOptionalBoolean,
  readOptionalString,
} from "@/server/lib/api-response";
import { assertServiceSecret } from "@/server/lib/service-auth";
import { processWithdraw } from "@/server/services/withdraw-process.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/wallet/withdraw/[id]/process · debit balance and confirm (or fail)
 * a pending withdraw. Stands in for the chain send worker.
 *
 * Moves money, so it is authenticated with the shared service secret rather
 * than a player session. Body (optional): `{ txHash?: string, fail?: boolean }`
 */
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { error: "Missing withdraw id." },
      { status: 400 },
    );
  }

  try {
    assertServiceSecret(request);
    const body = await readJsonBody(request);

    const result = await processWithdraw({
      transactionId: id,
      txHash: readOptionalString(body, "txHash"),
      fail: readOptionalBoolean(body, "fail") ?? false,
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "POST /api/wallet/withdraw/:id/process");
  }
}
