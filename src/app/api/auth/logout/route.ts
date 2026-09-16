import { NextResponse } from "next/server";

import {
  errorResponse,
  readJsonBody,
  readOptionalBoolean,
} from "@/server/lib/api-response";
import {
  clearSessionCookieHeader,
  readSessionToken,
} from "@/server/lib/request-session";
import { optionalUser } from "@/server/lib/require-user";
import { logoutSessions } from "@/server/services/logout.service";

/**
 * POST /api/auth/logout · revoke the current session, or all devices.
 *
 * Body (optional): `{ allDevices?: boolean }`
 * Clears the `board_session` cookie. Logging out without a valid session is
 * not an error: the cookie is cleared either way.
 */
export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const allDevices = readOptionalBoolean(body, "allDevices") ?? false;

    const user = await optionalUser(request);
    const result = user
      ? await logoutSessions({
          userId: user.userId,
          token: readSessionToken(request),
          allDevices,
        })
      : { revoked: 0 };

    const response = NextResponse.json(result);
    response.headers.set("Set-Cookie", clearSessionCookieHeader());
    return response;
  } catch (error) {
    return errorResponse(error, "POST /api/auth/logout");
  }
}
