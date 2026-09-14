import { NextResponse } from "next/server";

import { MOCK_PLAYER } from "@/lib/mock/lobby";
import { settleMonopolyRent } from "@/server/services/monopoly-rent.service";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

/**
 * POST /api/monopoly/rooms/[roomId]/rent · pay rent on the tile you occupy.
 *
 * Body (optional): `{ "tileIndex": number }`.
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
    /* empty body ok */
  }

  try {
    const result = await settleMonopolyRent(roomId, userId, tileIndex);

    if (!result.ok) {
      const status =
        result.code === "NOT_FOUND"
          ? 404
          : result.code === "USER_NOT_FOUND"
            ? 401
            : result.code === "ELIMINATED"
              ? 403
              : 409;

      return NextResponse.json(
        { error: result.message, code: result.code },
        { status },
      );
    }

    return NextResponse.json({
      tileIndex: result.tileIndex,
      tileName: result.tileName,
      due: result.due,
      paid: result.paid,
      bankrupted: result.bankrupted,
      payerSeat: result.payerSeat,
      ownerSeat: result.ownerSeat,
      state: result.state,
      source: result.source,
    });
  } catch (error) {
    console.error("[POST /api/monopoly/rooms/:roomId/rent]", error);
    return NextResponse.json(
      { error: "Failed to settle rent." },
      { status: 500 },
    );
  }
}
