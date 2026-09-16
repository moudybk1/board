import { NextResponse } from "next/server";

import { errorResponse } from "@/server/lib/api-response";
import { requireUser } from "@/server/lib/require-user";
import { getWalletStatus } from "@/server/services/wallet-status.service";

/** GET /api/wallet · available/locked BOARD balance plus network/wallet status. */
export async function GET(request: Request) {
  try {
    const { userId } = await requireUser(request);
    const status = await getWalletStatus(userId);
    if (!status) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    return NextResponse.json(status);
  } catch (error) {
    return errorResponse(error, "GET /api/wallet");
  }
}
