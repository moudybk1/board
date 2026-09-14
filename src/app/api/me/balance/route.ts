import { NextResponse } from "next/server";

import { MOCK_PLAYER } from "@/lib/mock/lobby";
import { getUserBalance } from "@/server/services/balance.service";

/**
 * GET /api/me/balance · current user's BOARD balance.
 *
 * Until Better Auth lands, the caller may pass `x-user-id`. Missing header
 * falls back to the mock lobby player so the frontend keeps working.
 */
export async function GET(request: Request) {
  const userId =
    request.headers.get("x-user-id")?.trim() || MOCK_PLAYER.id;

  try {
    const balance = await getUserBalance(userId);
    if (!balance) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({
      balance: {
        available: balance.available,
        locked: balance.locked,
        chain: balance.chain,
        address: balance.address,
      },
      user: {
        id: balance.userId,
        username: balance.username,
      },
      source: process.env.DATABASE_URL ? "database" : "mock",
    });
  } catch (error) {
    console.error("[GET /api/me/balance]", error);
    return NextResponse.json(
      { error: "Failed to load balance." },
      { status: 500 },
    );
  }
}
