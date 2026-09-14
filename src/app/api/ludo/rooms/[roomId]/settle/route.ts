import { NextResponse } from "next/server";

import { settleLudoWinner } from "@/server/services/ludo-settle.service";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

/**
 * POST /api/ludo/rooms/[roomId]/settle · pay net prize to the finished winner.
 *
 * Requires one player with all four pawns finished. Applies the 2% fee and
 * credits the winner's platform BOARD balance.
 */
export async function POST(_request: Request, context: RouteContext) {
  const { roomId } = await context.params;
  if (!roomId) {
    return NextResponse.json({ error: "Missing room id." }, { status: 400 });
  }

  try {
    const result = await settleLudoWinner(roomId);

    if (!result.ok) {
      const status = result.code === "NOT_FOUND" ? 404 : 409;
      return NextResponse.json(
        { error: result.message, code: result.code },
        { status },
      );
    }

    return NextResponse.json({
      winnerUserId: result.winnerUserId,
      winnerSeat: result.winnerSeat,
      winnerUsername: result.winnerUsername,
      prizePool: result.prizePool,
      fee: result.fee,
      netPrize: result.netPrize,
      balanceAfter: result.balanceAfter,
      state: result.state,
      source: result.source,
    });
  } catch (error) {
    console.error("[POST /api/ludo/rooms/:roomId/settle]", error);
    return NextResponse.json(
      { error: "Failed to settle Ludo match." },
      { status: 500 },
    );
  }
}
