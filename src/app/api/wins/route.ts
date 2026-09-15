import { NextResponse } from "next/server";

import { resolveRequestUser } from "@/server/lib/resolve-user";
import { listWinHistory } from "@/server/services/wins.service";

/**
 * GET /api/wins · current user's win / payout history (newest first).
 */
export async function GET(request: Request) {
  const { userId } = await resolveRequestUser(request);

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
