import { NextResponse } from "next/server";

import { settleMonopolyWinner } from "@/server/services/monopoly-settle.service";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

/**
 * POST /api/monopoly/rooms/[roomId]/settle · declare winner & pay net prize.
 *
 * Requires exactly one living player. Applies the 2% fee, credits the winner's
 * platform BOARD balance, and marks the match settled.
 */
export async function POST(_request: Request, context: RouteContext) {
  const { roomId } = await context.params;
  if (!roomId) {
    return NextResponse.json({ error: "Missing room id." }, { status: 400 });
  }

  try {
    const result = await settleMonopolyWinner(roomId);

    if (!result.ok) {
      const status =
        result.code === "NOT_FOUND"
          ? 404
          : result.code === "ALREADY_SETTLED"
            ? 409
            : 409;

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
    console.error("[POST /api/monopoly/rooms/:roomId/settle]", error);
    return NextResponse.json(
      { error: "Failed to settle Monopoly match." },
      { status: 500 },
    );
  }
}
