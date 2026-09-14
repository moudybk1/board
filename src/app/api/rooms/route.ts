import { NextResponse } from "next/server";

import { listOpenRooms } from "@/server/services/rooms.service";
import type { GameType, RoomStatus } from "@/lib/types";

/**
 * GET /api/rooms · open (waiting) rooms for the lobby.
 *
 * Query:
 * - `game`     monopoly | ludo
 * - `entryFee` number (exact match)
 * - `status`   waiting | playing | all  (default: waiting)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const game = url.searchParams.get("game");
  const entryFeeRaw = url.searchParams.get("entryFee");
  const status = url.searchParams.get("status");

  if (game && game !== "monopoly" && game !== "ludo") {
    return NextResponse.json(
      { error: "Invalid game. Use monopoly or ludo." },
      { status: 400 },
    );
  }

  let entryFee: number | undefined;
  if (entryFeeRaw !== null) {
    entryFee = Number(entryFeeRaw);
    if (!Number.isFinite(entryFee) || entryFee < 0) {
      return NextResponse.json(
        { error: "entryFee must be a non-negative number." },
        { status: 400 },
      );
    }
  }

  if (
    status &&
    status !== "waiting" &&
    status !== "playing" &&
    status !== "finished" &&
    status !== "all"
  ) {
    return NextResponse.json(
      { error: "Invalid status. Use waiting, playing, finished, or all." },
      { status: 400 },
    );
  }

  try {
    const rooms = await listOpenRooms({
      gameType: (game as GameType | null) ?? undefined,
      entryFee,
      status: (status as RoomStatus | "all" | null) ?? "waiting",
    });

    return NextResponse.json({
      rooms,
      source: process.env.DATABASE_URL ? "database" : "mock",
    });
  } catch (error) {
    console.error("[GET /api/rooms]", error);
    return NextResponse.json(
      { error: "Failed to list rooms." },
      { status: 500 },
    );
  }
}
