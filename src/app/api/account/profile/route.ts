import { NextResponse } from "next/server";

import {
  errorResponse,
  readJsonBody,
  readOptionalString,
} from "@/server/lib/api-response";
import { requireUser } from "@/server/lib/require-user";
import { getProfile, updateProfile } from "@/server/services/profile.service";

/** GET /api/account/profile · current player profile. */
export async function GET(request: Request) {
  try {
    const { userId } = await requireUser(request);
    return NextResponse.json(await getProfile(userId));
  } catch (error) {
    return errorResponse(error, "GET /api/account/profile");
  }
}

/**
 * Explicit null clears the avatar, a string sets it, and an absent key leaves
 * it untouched. `readOptionalString` cannot express the clear, so it is read
 * directly here.
 */
function readAvatarUrl(body: unknown): string | null | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const raw = (body as Record<string, unknown>).avatarUrl;
  if (raw === null) return null;
  return typeof raw === "string" ? raw : undefined;
}

/**
 * PATCH /api/account/profile · update username and/or pixel avatar.
 *
 * Body: `{ username?: string, avatarId?: string, avatarUrl?: string | null }`
 */
export async function PATCH(request: Request) {
  try {
    const { userId } = await requireUser(request);
    const body = await readJsonBody(request);

    const result = await updateProfile({
      userId,
      username: readOptionalString(body, "username"),
      avatarId: readOptionalString(body, "avatarId"),
      avatarUrl: readAvatarUrl(body),
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "PATCH /api/account/profile");
  }
}
