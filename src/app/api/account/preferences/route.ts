import { NextResponse } from "next/server";

import { resolveRequestUser } from "@/server/lib/resolve-user";
import {
  getPreferences,
  PreferencesError,
  updatePreferences,
  type PreferencesPatch,
} from "@/server/services/preferences.service";

/**
 * GET /api/account/preferences · load (or create defaults for) display/audio prefs.
 */
export async function GET(request: Request) {
  const { userId } = await resolveRequestUser(request);
  try {
    const result = await getPreferences(userId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PreferencesError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[GET /api/account/preferences]", error);
    return NextResponse.json(
      { error: "Failed to load preferences." },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/account/preferences · upsert display/audio preferences.
 *
 * Body fields (all optional): sfxMuted, sfxVolume (0-1), musicMuted,
 * musicVolume (0-1), musicAutoplay, reducedMotion, scanlines.
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
  const patch: PreferencesPatch = {};

  if ("sfxMuted" in raw) patch.sfxMuted = raw.sfxMuted as boolean;
  if ("musicMuted" in raw) patch.musicMuted = raw.musicMuted as boolean;
  if ("musicAutoplay" in raw)
    patch.musicAutoplay = raw.musicAutoplay as boolean;
  if ("reducedMotion" in raw)
    patch.reducedMotion = raw.reducedMotion as boolean;
  if ("scanlines" in raw) patch.scanlines = raw.scanlines as boolean;
  if ("sfxVolume" in raw) patch.sfxVolume = Number(raw.sfxVolume);
  if ("musicVolume" in raw) patch.musicVolume = Number(raw.musicVolume);

  try {
    const result = await updatePreferences({ userId, patch });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PreferencesError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[PATCH /api/account/preferences]", error);
    return NextResponse.json(
      { error: "Failed to update preferences." },
      { status: 500 },
    );
  }
}
