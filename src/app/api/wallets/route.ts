import { NextResponse } from "next/server";

import {
  errorResponse,
  InvalidBodyError,
  readJsonBody,
  readOptionalBoolean,
  readOptionalString,
} from "@/server/lib/api-response";
import { requireUser } from "@/server/lib/require-user";
import { connectWallet, listWallets } from "@/server/services/wallet-link.service";

/** GET /api/wallets · list linked wallets for the signed-in user. */
export async function GET(request: Request) {
  try {
    const { userId } = await requireUser(request);
    return NextResponse.json(await listWallets(userId));
  } catch (error) {
    return errorResponse(error, "GET /api/wallets");
  }
}

/**
 * POST /api/wallets · connect / attach a wallet and return a verify nonce.
 *
 * Body: `{ address: string, chain?: string, label?: string, makePrimary?: boolean }`
 */
export async function POST(request: Request) {
  try {
    const { userId } = await requireUser(request);
    const body = await readJsonBody(request);

    const address = readOptionalString(body, "address");
    if (!address) {
      throw new InvalidBodyError("address is required.", 400);
    }

    const result = await connectWallet({
      userId,
      address,
      chain: readOptionalString(body, "chain"),
      label: readOptionalString(body, "label"),
      makePrimary: readOptionalBoolean(body, "makePrimary"),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error, "POST /api/wallets");
  }
}
