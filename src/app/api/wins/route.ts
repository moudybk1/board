import { NextResponse } from "next/server";

import { MOCK_PLAYER } from "@/lib/mock/lobby";
import { listWinHistory } from "@/server/services/wins.service";

/**
 * GET /api/wins · current user's win / payout history (newest first).
 * Header: `x-user-id` (falls back to mock player).
 */
export async function GET(request: Request) {
  const userId =
    request.headers.get("x-user-id")?.trim() || MOCK_PLAYER.id;

  try {
    const result = await listWinHistory(userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/wins]", error);
    return NextResponse.json(
      { error: "Failed to load win history." },
      { status: 500 },
    );
  }
}
