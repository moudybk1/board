import { NextResponse } from "next/server";

import {
  errorResponse,
  InvalidBodyError,
  readJsonBody,
  readOptionalString,
} from "@/server/lib/api-response";
import { assertServiceSecret } from "@/server/lib/service-auth";
import { attachBurnProof } from "@/server/services/burn.service";

/**
 * POST /api/rewards/burn/proof · attach an on-chain burn tx hash / proof URI
 * to a fee_ledger burn row.
 *
 * These rows back the public burn claim, so the endpoint is authenticated with
 * the shared service secret. Body:
 * `{ feeLedgerId: string, txHash: string, proofUri?: string }`
 */
export async function POST(request: Request) {
  try {
    assertServiceSecret(request);
    const body = await readJsonBody(request);

    const feeLedgerId = readOptionalString(body, "feeLedgerId");
    const txHash = readOptionalString(body, "txHash");
    if (!feeLedgerId || !txHash) {
      throw new InvalidBodyError("feeLedgerId and txHash are required.", 400);
    }

    const result = await attachBurnProof({
      feeLedgerId,
      txHash,
      proofUri: readOptionalString(body, "proofUri"),
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "POST /api/rewards/burn/proof");
  }
}
