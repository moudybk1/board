import { NextResponse } from "next/server";

import { errorResponse } from "@/server/lib/api-response";
import { requireUser } from "@/server/lib/require-user";
import { getUserBalance } from "@/server/services/balance.service";

/** GET /api/me/balance · the signed-in user's BOARD balance. */
export async function GET(request: Request) {
  try {
    const { userId } = await requireUser(request);
    const balance = await getUserBalance(userId);
    if (!balance) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({
      balance: {
        available: balance.available,
        locked: balance.locked,
        chain: balance.chain,
        address: balance.address,
      },
      user: {
        id: balance.userId,
        username: balance.username,
      },
    });
  } catch (error) {
    return errorResponse(error, "GET /api/me/balance");
  }
}
