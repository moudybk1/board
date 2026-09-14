import { NextResponse } from "next/server";

import { clearSessionCookieHeader } from "@/server/lib/request-session";
import { resolveRequestUser } from "@/server/lib/resolve-user";
import {
  logoutSessions,
  SessionRevokeError,
} from "@/server/services/logout.service";

/**
 * POST /api/auth/sessions/revoke · revoke every active session for the user
 * (cross-device sign-out). Also clears the current cookie.
 */
export async function POST(request: Request) {
  const { userId } = await resolveRequestUser(request);

  try {
    const result = await logoutSessions({
      userId,
      allDevices: true,
    });

    const response = NextResponse.json(result);
    response.headers.set("Set-Cookie", clearSessionCookieHeader());
    return response;
  } catch (error) {
    if (error instanceof SessionRevokeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[POST /api/auth/sessions/revoke]", error);
    return NextResponse.json(
      { error: "Failed to revoke sessions." },
      { status: 500 },
    );
  }
}
