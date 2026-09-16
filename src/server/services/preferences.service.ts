/**
 * Load / upsert user display + audio preferences (user_preferences table).
 */
import { eq } from "drizzle-orm";

import { getDb } from "@/server/db";
import { userPreferences } from "@/server/db/schema";
import { isDbConfigured as dbConfigured } from "@/server/lib/db-config";

export class PreferencesError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PreferencesError";
    this.status = status;
  }
}

export type PreferencesView = {
  sfxMuted: boolean;
  sfxVolume: number;
  musicMuted: boolean;
  musicVolume: number;
  musicAutoplay: boolean;
  reducedMotion: boolean;
  scanlines: boolean;
  updatedAt: string;
};

export type PreferencesPatch = Partial<{
  sfxMuted: boolean;
  sfxVolume: number;
  musicMuted: boolean;
  musicVolume: number;
  musicAutoplay: boolean;
  reducedMotion: boolean;
  scanlines: boolean;
}>;

const DEFAULTS: Omit<PreferencesView, "updatedAt"> = {
  sfxMuted: false,
  sfxVolume: 0.7,
  musicMuted: false,
  musicVolume: 0.35,
  musicAutoplay: true,
  reducedMotion: false,
  scanlines: true,
};

/** In-memory prefs when DATABASE_URL is unset. */
const mockPrefs = new Map<string, PreferencesView>();

function clampVolume(value: number, field: string): number {
  if (!Number.isFinite(value)) {
    throw new PreferencesError(`${field} must be a number.`);
  }
  if (value < 0 || value > 1) {
    throw new PreferencesError(`${field} must be between 0 and 1.`);
  }
  return Math.round(value * 1000) / 1000;
}

function mapRow(row: typeof userPreferences.$inferSelect): PreferencesView {
  return {
    sfxMuted: row.sfxMuted,
    sfxVolume: Number(row.sfxVolume),
    musicMuted: row.musicMuted,
    musicVolume: Number(row.musicVolume),
    musicAutoplay: row.musicAutoplay,
    reducedMotion: row.reducedMotion,
    scanlines: row.scanlines,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function defaultView(): PreferencesView {
  return { ...DEFAULTS, updatedAt: new Date().toISOString() };
}

function parsePatch(input: PreferencesPatch): PreferencesPatch {
  const patch: PreferencesPatch = {};

  if (input.sfxMuted !== undefined) {
    if (typeof input.sfxMuted !== "boolean") {
      throw new PreferencesError("sfxMuted must be a boolean.");
    }
    patch.sfxMuted = input.sfxMuted;
  }
  if (input.musicMuted !== undefined) {
    if (typeof input.musicMuted !== "boolean") {
      throw new PreferencesError("musicMuted must be a boolean.");
    }
    patch.musicMuted = input.musicMuted;
  }
  if (input.musicAutoplay !== undefined) {
    if (typeof input.musicAutoplay !== "boolean") {
      throw new PreferencesError("musicAutoplay must be a boolean.");
    }
    patch.musicAutoplay = input.musicAutoplay;
  }
  if (input.reducedMotion !== undefined) {
    if (typeof input.reducedMotion !== "boolean") {
      throw new PreferencesError("reducedMotion must be a boolean.");
    }
    patch.reducedMotion = input.reducedMotion;
  }
  if (input.scanlines !== undefined) {
    if (typeof input.scanlines !== "boolean") {
      throw new PreferencesError("scanlines must be a boolean.");
    }
    patch.scanlines = input.scanlines;
  }
  if (input.sfxVolume !== undefined) {
    patch.sfxVolume = clampVolume(input.sfxVolume, "sfxVolume");
  }
  if (input.musicVolume !== undefined) {
    patch.musicVolume = clampVolume(input.musicVolume, "musicVolume");
  }

  if (Object.keys(patch).length === 0) {
    throw new PreferencesError("No preference fields to update.");
  }

  return patch;
}

export async function getPreferences(userId: string): Promise<{
  preferences: PreferencesView;
  source: "database" | "mock";
}> {
  if (!dbConfigured()) {
    const existing = mockPrefs.get(userId) ?? defaultView();
    mockPrefs.set(userId, existing);
    return { preferences: existing, source: "mock" };
  }

  const db = getDb();
  const [row] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  if (row) {
    return { preferences: mapRow(row), source: "database" };
  }

  const [created] = await db
    .insert(userPreferences)
    .values({ userId })
    .returning();

  return { preferences: mapRow(created), source: "database" };
}

export async function updatePreferences(input: {
  userId: string;
  patch: PreferencesPatch;
}): Promise<{ preferences: PreferencesView; source: "database" | "mock" }> {
  const patch = parsePatch(input.patch);
  const now = new Date();

  if (!dbConfigured()) {
    const current = mockPrefs.get(input.userId) ?? defaultView();
    const next: PreferencesView = {
      ...current,
      ...patch,
      updatedAt: now.toISOString(),
    };
    mockPrefs.set(input.userId, next);
    return { preferences: next, source: "mock" };
  }

  const db = getDb();
  const [existing] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, input.userId))
    .limit(1);

  if (!existing) {
    const [created] = await db
      .insert(userPreferences)
      .values({
        userId: input.userId,
        sfxMuted: patch.sfxMuted ?? DEFAULTS.sfxMuted,
        sfxVolume: String(patch.sfxVolume ?? DEFAULTS.sfxVolume),
        musicMuted: patch.musicMuted ?? DEFAULTS.musicMuted,
        musicVolume: String(patch.musicVolume ?? DEFAULTS.musicVolume),
        musicAutoplay: patch.musicAutoplay ?? DEFAULTS.musicAutoplay,
        reducedMotion: patch.reducedMotion ?? DEFAULTS.reducedMotion,
        scanlines: patch.scanlines ?? DEFAULTS.scanlines,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return { preferences: mapRow(created), source: "database" };
  }

  const [updated] = await db
    .update(userPreferences)
    .set({
      ...(patch.sfxMuted !== undefined ? { sfxMuted: patch.sfxMuted } : {}),
      ...(patch.sfxVolume !== undefined
        ? { sfxVolume: String(patch.sfxVolume) }
        : {}),
      ...(patch.musicMuted !== undefined
        ? { musicMuted: patch.musicMuted }
        : {}),
      ...(patch.musicVolume !== undefined
        ? { musicVolume: String(patch.musicVolume) }
        : {}),
      ...(patch.musicAutoplay !== undefined
        ? { musicAutoplay: patch.musicAutoplay }
        : {}),
      ...(patch.reducedMotion !== undefined
        ? { reducedMotion: patch.reducedMotion }
        : {}),
      ...(patch.scanlines !== undefined
        ? { scanlines: patch.scanlines }
        : {}),
      updatedAt: now,
    })
    .where(eq(userPreferences.userId, input.userId))
    .returning();

  if (!updated) {
    throw new PreferencesError("Preferences not found.", 404);
  }

  return { preferences: mapRow(updated), source: "database" };
}
