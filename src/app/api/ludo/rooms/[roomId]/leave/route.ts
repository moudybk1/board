import { NextResponse } from "next/server";

import { MOCK_PLAYER } from "@/lib/mock/lobby";
import { leaveLudoMatch } from "@/server/services/ludo-turn.service";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

/**
 * POST /api/ludo/rooms/[roomId]/leave · forfeit / leave the match.
 */
export async function POST(request: Request, context: RouteContext) {
  const { roomId } = await context.params;
  const userId =
    request.headers.get("x-user-id")?.trim() || MOCK_PLAYER.id;

  if (!roomId) {
    return NextResponse.json({ error: "Missing room id." }, { status: 400 });
  }

  try {
    const result = await leaveLudoMatch(roomId, userId);

    if (!result.ok) {
      const status =
        result.code === "NOT_FOUND"
          ? 404
          : result.code === "USER_NOT_FOUND"
            ? 401
            : 409;

      return NextResponse.json(
        { error: result.message, code: result.code },
        { status },
      );
    }

    return NextResponse.json({
      action: result.action,
      seat: result.seat,
      state: result.state,
      source: result.source,
    });
  } catch (error) {
    console.error("[POST /api/ludo/rooms/:roomId/leave]", error);
    return NextResponse.json(
      { error: "Failed to leave match." },
      { status: 500 },
    );
  }
}
