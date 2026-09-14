/**
 * matches · one game session per room, from kickoff to prize settlement.
 * Created when a room fills (4 players) and flips to `playing`.
 */
import {
  numeric,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { gameTypeEnum, matchStatusEnum } from "./enums";
import { rooms } from "./rooms";
import { users } from "./users";

export const matches = pgTable("matches", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id")
    .notNull()
    .unique()
    .references(() => rooms.id, { onDelete: "cascade" }),
  gameType: gameTypeEnum("game_type").notNull(),
  winnerUserId: uuid("winner_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  /** Gross prize pool before the 2% fee (entry_fee × max_players). */
  prizePool: numeric("prize_pool", { precision: 20, scale: 2 }).notNull(),
  status: matchStatusEnum("status").notNull().default("ongoing"),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export type MatchRow = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
