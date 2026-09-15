import { NextResponse } from "next/server";

import { resolveRequestUser } from "@/server/lib/resolve-user";
import {
  verifyWallet,
  WalletLinkError,
} from "@/server/services/wallet-link.service";

/**
 * POST /api/wallets/verify · confirm wallet ownership with EIP-191 signature.
 *
 * Body: `{ signature: string, walletId?: string, address?: string, message?: string }`
 */
export async function POST(request: Request) {
  const { userId } = await resolveRequestUser(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    typeof (body as { signature?: unknown }).signature !== "string"
  ) {
    return NextResponse.json(
      { error: "signature is required." },
      { status: 400 },
    );
  }

  const raw = body as Record<string, unknown>;

  try {
    const result = await verifyWallet({
      userId,
      signature: raw.signature as string,
      walletId: typeof raw.walletId === "string" ? raw.walletId : undefined,
      address: typeof raw.address === "string" ? raw.address : undefined,
      message: typeof raw.message === "string" ? raw.message : undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof WalletLinkError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[POST /api/wallets/verify]", error);
    return NextResponse.json(
      { error: "Failed to verify wallet." },
      { status: 500 },
    );
  }
}
