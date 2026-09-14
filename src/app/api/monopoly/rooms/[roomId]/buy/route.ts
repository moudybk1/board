import { NextResponse } from "next/server";

import { MOCK_PLAYER } from "@/lib/mock/lobby";
import { buyMonopolyProperty } from "@/server/services/monopoly-buy.service";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

/**
 * POST /api/monopoly/rooms/[roomId]/buy · purchase the country underfoot.
 *
 * Body (optional): `{ "tileIndex": number }` · defaults to the buyer's tile.
 * Auth stub: `x-user-id`.
 */
export async function POST(request: Request, context: RouteContext) {
  const { roomId } = await context.params;
  const userId =
    request.headers.get("x-user-id")?.trim() || MOCK_PLAYER.id;

  if (!roomId) {
    return NextResponse.json({ error: "Missing room id." }, { status: 400 });
  }

  let tileIndex: number | undefined;
  try {
    const body = (await request.json().catch(() => null)) as {
      tileIndex?: unknown;
    } | null;
    if (body?.tileIndex !== undefined) {
      tileIndex = Number(body.tileIndex);
      if (!Number.isInteger(tileIndex) || tileIndex < 0 || tileIndex > 39) {
        return NextResponse.json(
          { error: "tileIndex must be an integer 0-39." },
          { status: 400 },
        );
      }
    }
  } catch {
    /* empty body is fine */
  }

  try {
    const result = await buyMonopolyProperty(roomId, userId, tileIndex);

    if (!result.ok) {
      const status =
        result.code === "NOT_FOUND"
          ? 404
          : result.code === "INSUFFICIENT_CASH"
            ? 402
            : result.code === "NOT_YOUR_TURN" || result.code === "ELIMINATED"
              ? 403
              : result.code === "USER_NOT_FOUND"
                ? 401
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
      tileIndex: result.tileIndex,
      tileName: result.tileName,
      price: result.price,
      seat: result.seat,
      cashAfter: result.cashAfter,
      state: result.state,
      source: result.source,
    });
  } catch (error) {
    console.error("[POST /api/monopoly/rooms/:roomId/buy]", error);
    return NextResponse.json(
      { error: "Failed to buy country." },
      { status: 500 },
    );
  }
}
