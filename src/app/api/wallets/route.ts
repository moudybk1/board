import { NextResponse } from "next/server";

import { resolveRequestUser } from "@/server/lib/resolve-user";
import {
  connectWallet,
  listWallets,
  WalletLinkError,
} from "@/server/services/wallet-link.service";

/**
 * GET /api/wallets · list linked wallets for the current user.
 */
export async function GET(request: Request) {
  const { userId } = await resolveRequestUser(request);
  const result = await listWallets(userId);
  return NextResponse.json(result);
}

/**
 * POST /api/wallets · connect / attach a wallet and return a verify nonce.
 *
 * Body: `{ address: string, chain?: string, label?: string, makePrimary?: boolean }`
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
    typeof (body as { address?: unknown }).address !== "string"
  ) {
    return NextResponse.json({ error: "address is required." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;

  try {
    const result = await connectWallet({
      userId,
      address: raw.address as string,
      chain: typeof raw.chain === "string" ? raw.chain : undefined,
      label: typeof raw.label === "string" ? raw.label : undefined,
      makePrimary:
        typeof raw.makePrimary === "boolean" ? raw.makePrimary : undefined,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof WalletLinkError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[POST /api/wallets]", error);
    return NextResponse.json(
      { error: "Failed to connect wallet." },
      { status: 500 },
    );
  }
}
