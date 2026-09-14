/**
 * Ludo match / seat tables plus in-match pawn + log state.
 */
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { matches } from "./matches";
import { users } from "./users";

export const ludoPlayerStatusEnum = pgEnum("ludo_player_status", [
  "alive",
  "finished",
]);

export const ludoPawnStatusEnum = pgEnum("ludo_pawn_status", [
  "yard",
  "track",
  "home",
  "finished",
]);

/**
 * ludo_matches · 1:1 extension of `matches` for Ludo turn clock + last roll.
 */
export const ludoMatches = pgTable("ludo_matches", {
  matchId: uuid("match_id")
    .primaryKey()
    .references(() => matches.id, { onDelete: "cascade" }),
  activeSeat: smallint("active_seat").notNull().default(1),
  turn: integer("turn").notNull().default(1),
  turnEndsAt: timestamp("turn_ends_at", { withTimezone: true }).notNull(),
  /** Last die face (1-6), or null before the first roll of the turn. */
  lastRoll: smallint("last_roll"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * ludo_players · seats in a Ludo match, including ready flag for pre-start.
 */
export const ludoPlayers = pgTable(
  "ludo_players",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    seat: smallint("seat").notNull(),
    status: ludoPlayerStatusEnum("status").notNull().default("alive"),
    /** True once the player taps Ready in the waiting room. */
    ready: boolean("ready").notNull().default(false),
  },
  (table) => [
    uniqueIndex("ludo_players_match_user_uidx").on(table.matchId, table.userId),
    uniqueIndex("ludo_players_match_seat_uidx").on(table.matchId, table.seat),
  ],
);

/**
 * ludo_pawns · four pawns per seat; steps encode track / home column progress.
 */
export const ludoPawns = pgTable(
  "ludo_pawns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    /** Seat 1-4. */
    seat: smallint("seat").notNull(),
    /** Seat-local pawn index 0-3. */
    pawnIndex: smallint("pawn_index").notNull(),
    status: ludoPawnStatusEnum("status").notNull().default("yard"),
    /**
     * Track cell 0-51 when status is `track`, home-column steps 0-5 when
     * `home`, otherwise 0.
     */
    steps: smallint("steps").notNull().default(0),
  },
  (table) => [
    uniqueIndex("ludo_pawns_match_seat_pawn_uidx").on(
      table.matchId,
      table.seat,
      table.pawnIndex,
    ),
  ],
);

/**
 * ludo_logs · chronological feed for the Ludo room sidebar.
 */
export const ludoLogs = pgTable("ludo_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  matchId: uuid("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  seat: smallint("seat"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type LudoMatchRow = typeof ludoMatches.$inferSelect;
export type LudoPlayerRow = typeof ludoPlayers.$inferSelect;
export type LudoPawnRow = typeof ludoPawns.$inferSelect;
export type LudoLogRow = typeof ludoLogs.$inferSelect;
