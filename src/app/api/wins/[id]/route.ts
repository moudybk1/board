import { NextResponse } from "next/server";

import { MOCK_PLAYER } from "@/lib/mock/lobby";
import { getWinDetail } from "@/server/services/wins.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/wins/[id] · single reward payout detail (prize split + status).
 */
export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const viewer =
    request.headers.get("x-user-id")?.trim() || MOCK_PLAYER.id;

  if (!id) {
    return NextResponse.json({ error: "Missing win id." }, { status: 400 });
  }

  try {
    const result = await getWinDetail(id, viewer);
    if (!result) {
      return NextResponse.json({ error: "Win not found." }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error(`[GET /api/wins/${id}]`, error);
    return NextResponse.json(
      { error: "Failed to load win detail." },
      { status: 500 },
    );
  }
}
