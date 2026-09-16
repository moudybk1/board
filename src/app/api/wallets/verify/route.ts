import { NextResponse } from "next/server";

import {
  errorResponse,
  InvalidBodyError,
  readJsonBody,
  readOptionalString,
} from "@/server/lib/api-response";
import { requireUser } from "@/server/lib/require-user";
import { verifyWallet } from "@/server/services/wallet-link.service";

/**
 * POST /api/wallets/verify · confirm wallet ownership with an EIP-191 signature.
 *
 * Body: `{ signature: string, walletId?: string, address?: string, message?: string }`
 */
export async function POST(request: Request) {
  try {
    const { userId } = await requireUser(request);
    const body = await readJsonBody(request);

    const signature = readOptionalString(body, "signature");
    if (!signature) {
      throw new InvalidBodyError("signature is required.", 400);
    }

    const result = await verifyWallet({
      userId,
      signature,
      walletId: readOptionalString(body, "walletId"),
      address: readOptionalString(body, "address"),
      message: readOptionalString(body, "message"),
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "POST /api/wallets/verify");
  }
}
