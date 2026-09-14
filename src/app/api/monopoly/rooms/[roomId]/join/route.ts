import { NextResponse } from "next/server";

import { MOCK_PLAYER } from "@/lib/mock/lobby";
import { joinRoom } from "@/server/services/join-room.service";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

/**
 * POST /api/monopoly/rooms/[roomId]/join · Monopoly-only join + auto-start.
 *
 * When the 4th seat fills, seeds monopoly_matches / players / logs and returns
 * the initial `monopoly` board state alongside the room payload.
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
      requireGame: "monopoly",
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

    return NextResponse.json({
      room: result.room,
      seat: result.seat,
      balanceAfter: result.balanceAfter,
      started: result.started,
      monopoly: result.monopoly ?? null,
      source: result.source,
    });
  } catch (error) {
    console.error("[POST /api/monopoly/rooms/:roomId/join]", error);
    return NextResponse.json(
      { error: "Failed to join Monopoly room." },
      { status: 500 },
    );
  }
}
