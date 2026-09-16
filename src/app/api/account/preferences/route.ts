import { NextResponse } from "next/server";

import {
  errorResponse,
  readJsonBody,
  readOptionalBoolean,
  readOptionalNumber,
} from "@/server/lib/api-response";
import { requireUser } from "@/server/lib/require-user";
import {
  getPreferences,
  updatePreferences,
  type PreferencesPatch,
} from "@/server/services/preferences.service";

/** GET /api/account/preferences · load (or default) display and audio prefs. */
export async function GET(request: Request) {
  try {
    const { userId } = await requireUser(request);
    return NextResponse.json(await getPreferences(userId));
  } catch (error) {
    return errorResponse(error, "GET /api/account/preferences");
  }
}

/**
 * Build a patch from an unvalidated body. Each reader returns undefined for an
 * absent key and rejects a present key of the wrong type, so a string "false"
 * is a 400 rather than a silently truthy value.
 */
function readPreferencesPatch(body: unknown): PreferencesPatch {
  return {
    sfxMuted: readOptionalBoolean(body, "sfxMuted"),
    musicMuted: readOptionalBoolean(body, "musicMuted"),
    musicAutoplay: readOptionalBoolean(body, "musicAutoplay"),
    reducedMotion: readOptionalBoolean(body, "reducedMotion"),
    scanlines: readOptionalBoolean(body, "scanlines"),
    sfxVolume: readOptionalNumber(body, "sfxVolume"),
    musicVolume: readOptionalNumber(body, "musicVolume"),
  };
}

/**
 * PATCH /api/account/preferences · upsert display/audio preferences.
 *
 * Body fields (all optional): sfxMuted, sfxVolume (0-1), musicMuted,
 * musicVolume (0-1), musicAutoplay, reducedMotion, scanlines.
 */
export async function PATCH(request: Request) {
  try {
    const { userId } = await requireUser(request);
    const patch = readPreferencesPatch(await readJsonBody(request));
    return NextResponse.json(await updatePreferences({ userId, patch }));
  } catch (error) {
    return errorResponse(error, "PATCH /api/account/preferences");
  }
}
