import { NextResponse } from "next/server";

import { MOCK_PLAYER } from "@/lib/mock/lobby";
import { getWalletStatus } from "@/server/services/wallet-status.service";

/**
 * GET /api/wallet · available/locked BOARD balance plus network/wallet status.
 *
 * Header: `x-user-id` (falls back to mock player).
 */
export async function GET(request: Request) {
  const userId =
    request.headers.get("x-user-id")?.trim() || MOCK_PLAYER.id;

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
