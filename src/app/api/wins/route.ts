import { NextResponse } from "next/server";

import { errorResponse } from "@/server/lib/api-response";
import { requireUser } from "@/server/lib/require-user";
import { listWinHistory } from "@/server/services/wins.service";

/** GET /api/wins · the signed-in user's win / payout history (newest first). */
export async function GET(request: Request) {
  try {
    const { userId } = await requireUser(request);
    return NextResponse.json(await listWinHistory(userId));
  } catch (error) {
    return errorResponse(error, "GET /api/wins");
  }
}
