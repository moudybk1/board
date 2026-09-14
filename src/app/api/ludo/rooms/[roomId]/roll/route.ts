import { NextResponse } from "next/server";

import { MOCK_PLAYER } from "@/lib/mock/lobby";
import { rollLudo } from "@/server/services/ludo-roll.service";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

/**
 * POST /api/ludo/rooms/[roomId]/roll · authoritative single-die roll.
 *
 * Auth stub: `x-user-id`.
 */
export async function POST(request: Request, context: RouteContext) {
  const { roomId } = await context.params;
  const userId =
    request.headers.get("x-user-id")?.trim() || MOCK_PLAYER.id;

  if (!roomId) {
    return NextResponse.json({ error: "Missing room id." }, { status: 400 });
  }

  try {
    const result = await rollLudo(roomId, userId);

    if (!result.ok) {
      const status =
        result.code === "NOT_FOUND"
          ? 404
          : result.code === "NOT_YOUR_TURN" || result.code === "ALREADY_ROLLED"
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
      roll: result.roll,
      seat: result.seat,
      legalMoves: result.legalMoves,
      state: result.state,
      source: result.source,
    });
  } catch (error) {
    console.error("[POST /api/ludo/rooms/:roomId/roll]", error);
    return NextResponse.json(
      { error: "Failed to roll die." },
      { status: 500 },
    );
  }
}
