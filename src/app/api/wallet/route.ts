import { NextResponse } from "next/server";

import { resolveRequestUser } from "@/server/lib/resolve-user";
import { getWalletStatus } from "@/server/services/wallet-status.service";

/**
 * GET /api/wallet · available/locked BOARD balance plus network/wallet status.
 */
export async function GET(request: Request) {
  const { userId } = await resolveRequestUser(request);

  try {
    const status = await getWalletStatus(userId);
    if (!status) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    return NextResponse.json(status);
  } catch (error) {
    console.error("[GET /api/wallet]", error);
    return NextResponse.json(
      { error: "Failed to load wallet status." },
      { status: 500 },
    );
  }
}
