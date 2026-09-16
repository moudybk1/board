import { NextResponse } from "next/server";

import { errorResponse } from "@/server/lib/api-response";
import { clearSessionCookieHeader } from "@/server/lib/request-session";
import { requireUser } from "@/server/lib/require-user";
import { logoutSessions } from "@/server/services/logout.service";

/**
 * POST /api/auth/sessions/revoke · revoke every active session for the user
 * (cross-device sign-out). Also clears the current cookie.
 */
export async function POST(request: Request) {
  try {
    const { userId } = await requireUser(request);
    const result = await logoutSessions({ userId, allDevices: true });

    const response = NextResponse.json(result);
    response.headers.set("Set-Cookie", clearSessionCookieHeader());
    return response;
  } catch (error) {
    return errorResponse(error, "POST /api/auth/sessions/revoke");
  }
}
