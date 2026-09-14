import { NextResponse } from "next/server";

import {
  clearSessionCookieHeader,
  readSessionToken,
} from "@/server/lib/request-session";
import { resolveRequestUser } from "@/server/lib/resolve-user";
import {
  logoutSessions,
  SessionRevokeError,
} from "@/server/services/logout.service";

/**
 * POST /api/auth/logout · revoke current session, or all devices.
 *
 * Body (optional): `{ allDevices?: boolean }`
 * Clears the `board_session` cookie on success.
 */
export async function POST(request: Request) {
  const { userId } = await resolveRequestUser(request);
  const token = readSessionToken(request);

  let allDevices = false;
  try {
    const raw = await request.json();
    if (raw && typeof raw === "object" && "allDevices" in raw) {
      allDevices = Boolean((raw as { allDevices?: unknown }).allDevices);
    }
  } catch {
    // empty body is fine
  }

  try {
    const result = await logoutSessions({
      userId,
      token,
      allDevices,
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
    console.error("[POST /api/auth/logout]", error);
    return NextResponse.json({ error: "Failed to log out." }, { status: 500 });
  }
}
