import { NextResponse } from "next/server";

import { errorResponse } from "@/server/lib/api-response";
import { requireUser } from "@/server/lib/require-user";
import { getWinDetail } from "@/server/services/wins.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** GET /api/wins/[id] · single reward payout detail (prize split + status). */
export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing win id." }, { status: 400 });
  }

  try {
    const { userId } = await requireUser(request);
    const result = await getWinDetail(id, userId);
    if (!result) {
      return NextResponse.json({ error: "Win not found." }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "GET /api/wins/:id");
  }
}
