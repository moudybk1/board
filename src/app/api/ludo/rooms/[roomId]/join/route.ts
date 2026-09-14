import { NextResponse } from "next/server";

import { MOCK_PLAYER } from "@/lib/mock/lobby";
import { joinRoom } from "@/server/services/join-room.service";
import { publishLudo } from "@/server/realtime/ludo-hub";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

/**
 * POST /api/ludo/rooms/[roomId]/join · Ludo join (defers kickoff until ready).
 */
export async function POST(request: Request, context: RouteContext) {
  const { roomId } = await context.params;
  const userId =
    request.headers.get("x-user-id")?.trim() || MOCK_PLAYER.id;

  if (!roomId) {
    return NextResponse.json({ error: "Missing room id." }, { status: 400 });
  }

  try {
    const result = await joinRoom(roomId, userId, {
      requireGame: "ludo",
      deferStart: true,
    });

    if (!result.ok) {
      const status =
        result.code === "NOT_FOUND"
          ? 404
          : result.code === "INSUFFICIENT_BALANCE"
            ? 402
            : result.code === "USER_NOT_FOUND"
              ? 401
              : result.code === "WRONG_GAME"
                ? 400
                : 409;

      return NextResponse.json(
        {
          error: result.message,
          code: result.code,
          shortfall: result.shortfall,
        },
        { status },
      );
    }

    publishLudo({
      type: "action",
      roomId: result.room.id,
      action: "join",
      seat: result.seat,
      room: result.room,
      ready: result.ready,
      source: result.source,
    });

    return NextResponse.json({
      room: result.room,
      seat: result.seat,
      balanceAfter: result.balanceAfter,
      started: result.started,
      ready: result.ready ?? {},
      ludo: result.ludo ?? null,
      source: result.source,
    });
  } catch (error) {
    console.error("[POST /api/ludo/rooms/:roomId/join]", error);
    return NextResponse.json(
      { error: "Failed to join Ludo room." },
      { status: 500 },
    );
  }
}
