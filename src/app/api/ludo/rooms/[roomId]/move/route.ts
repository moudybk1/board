import { NextResponse } from "next/server";

import { MOCK_PLAYER } from "@/lib/mock/lobby";
import { moveLudoPawn } from "@/server/services/ludo-move.service";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

/**
 * POST /api/ludo/rooms/[roomId]/move · move a pawn after an authoritative roll.
 *
 * Body: `{ "pawnId": "p1-0" }`
 * Auth stub: `x-user-id`.
 */
export async function POST(request: Request, context: RouteContext) {
  const { roomId } = await context.params;
  const userId =
    request.headers.get("x-user-id")?.trim() || MOCK_PLAYER.id;

  if (!roomId) {
    return NextResponse.json({ error: "Missing room id." }, { status: 400 });
  }

  let pawnId: string | undefined;
  try {
    const body = (await request.json()) as { pawnId?: unknown };
    if (typeof body.pawnId === "string" && body.pawnId.trim()) {
      pawnId = body.pawnId.trim();
    }
  } catch {
    /* fall through */
  }

  if (!pawnId) {
    return NextResponse.json(
      { error: "Body must include pawnId." },
      { status: 400 },
    );
  }

  try {
    const result = await moveLudoPawn(roomId, userId, pawnId);

    if (!result.ok) {
      const status =
        result.code === "NOT_FOUND"
          ? 404
          : result.code === "NOT_YOUR_TURN" || result.code === "ILLEGAL_MOVE"
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
      pawnId: result.pawnId,
      seat: result.seat,
      roll: result.roll,
      captures: result.captures,
      extraTurn: result.extraTurn,
      won: result.won,
      state: result.state,
      source: result.source,
    });
  } catch (error) {
    console.error("[POST /api/ludo/rooms/:roomId/move]", error);
    return NextResponse.json(
      { error: "Failed to move pawn." },
      { status: 500 },
    );
  }
}
