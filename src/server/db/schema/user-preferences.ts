/**
 * user_preferences · per-user display + audio settings for the pixel UI.
 * Mirrors `/settings` (localStorage keys board.display.* / board.audio.*) so
 * the next API task can sync across devices after login.
 */
import {
  boolean,
  numeric,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const userPreferences = pgTable("user_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  /** Master / SFX mute (board.audio.muted). */
  sfxMuted: boolean("sfx_muted").notNull().default(false),
  /** SFX gain 0-1 (board.audio.volume). */
  sfxVolume: numeric("sfx_volume", { precision: 4, scale: 3 })
    .notNull()
    .default("0.700"),
  /** BGM mute (board.audio.musicMuted). */
  musicMuted: boolean("music_muted").notNull().default(false),
  /** BGM gain 0-1 (board.audio.musicVolume). */
  musicVolume: numeric("music_volume", { precision: 4, scale: 3 })
    .notNull()
    .default("0.350"),
  /** Start lobby loop after unlock (board.audio.musicAutoplay). */
  musicAutoplay: boolean("music_autoplay").notNull().default(true),
  /** Soften hops / dice / idle motion (board.display.reducedMotion). */
  reducedMotion: boolean("reduced_motion").notNull().default(false),
  /** CRT scanline overlay on boards (board.display.scanlines). */
  scanlines: boolean("scanlines").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type UserPreferencesRow = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;
