import { NextResponse } from "next/server";

import { resolveRequestUser } from "@/server/lib/resolve-user";
import {
  getProfile,
  ProfileError,
  updateProfile,
} from "@/server/services/profile.service";

/**
 * GET /api/account/profile · current player profile.
 */
export async function GET(request: Request) {
  const { userId } = await resolveRequestUser(request);
  try {
    const result = await getProfile(userId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ProfileError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[GET /api/account/profile]", error);
    return NextResponse.json(
      { error: "Failed to load profile." },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/account/profile · update username and/or pixel avatar.
 *
 * Body: `{ username?: string, avatarId?: string, avatarUrl?: string | null }`
 */
export async function PATCH(request: Request) {
  const { userId } = await resolveRequestUser(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;

  try {
    const result = await updateProfile({
      userId,
      username: typeof raw.username === "string" ? raw.username : undefined,
      avatarId: typeof raw.avatarId === "string" ? raw.avatarId : undefined,
      avatarUrl:
        raw.avatarUrl === null
          ? null
          : typeof raw.avatarUrl === "string"
            ? raw.avatarUrl
            : undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ProfileError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[PATCH /api/account/profile]", error);
    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500 },
    );
  }
}
