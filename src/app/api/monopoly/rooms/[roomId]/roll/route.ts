import { NextResponse } from "next/server";

import { MOCK_PLAYER } from "@/lib/mock/lobby";
import { rollMonopoly } from "@/server/services/monopoly-roll.service";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

/**
 * POST /api/monopoly/rooms/[roomId]/roll · authoritative dice + pawn move.
 *
 * Auth stub: `x-user-id` (defaults to the mock player).
 */
export async function POST(request: Request, context: RouteContext) {
  const { roomId } = await context.params;
  const userId =
    request.headers.get("x-user-id")?.trim() || MOCK_PLAYER.id;

  if (!roomId) {
    return NextResponse.json({ error: "Missing room id." }, { status: 400 });
  }

  try {
    const result = await rollMonopoly(roomId, userId);

    if (!result.ok) {
      const status =
        result.code === "NOT_FOUND"
          ? 404
          : result.code === "NOT_YOUR_TURN" || result.code === "ELIMINATED"
            ? 403
            : result.code === "USER_NOT_FOUND"
              ? 401
              : 409;

      return NextResponse.json(
        { error: result.message, code: result.code },
        { status },
      );
    }

    return NextResponse.json({
      dice: result.dice,
      total: result.total,
      isDouble: result.isDouble,
      fromTile: result.fromTile,
      toTile: result.toTile,
      tileName: result.tileName,
      tileKind: result.tileKind,
      canBuy: result.canBuy,
      rent: result.rent ?? null,
      seat: result.seat,
      state: result.state,
      source: result.source,
    });
  } catch (error) {
    console.error("[POST /api/monopoly/rooms/:roomId/roll]", error);
    return NextResponse.json(
      { error: "Failed to roll dice." },
      { status: 500 },
    );
  }
}
