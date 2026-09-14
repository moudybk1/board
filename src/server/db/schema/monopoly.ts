/**
 * Monopoly in-match tables · turn state, cash/tile per seat, country ownership,
 * and the action log. Static board tiles (countries/landmarks) live in code
 * (`lib/game/monopoly-board.ts`), not in Postgres.
 */
import {
  integer,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { roomPlayerStatusEnum } from "./enums";
import { matches } from "./matches";
import { users } from "./users";

/**
 * monopoly_matches · 1:1 extension of `matches` for Monopoly turn clock.
 * Created when a Monopoly room auto-starts.
 */
export const monopolyMatches = pgTable("monopoly_matches", {
  matchId: uuid("match_id")
    .primaryKey()
    .references(() => matches.id, { onDelete: "cascade" }),
  /** Seat (1-4) whose turn it is. */
  activeSeat: smallint("active_seat").notNull().default(1),
  /** Monotonic turn counter shown in the UI. */
  turn: integer("turn").notNull().default(1),
  /** When the current turn expires (server-authoritative timer). */
  turnEndsAt: timestamp("turn_ends_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * monopoly_players · live cash + board position for each seat in a match.
 */
export const monopolyPlayers = pgTable(
  "monopoly_players",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    /** Seat 1-4 · mirrors room_players.position. */
    seat: smallint("seat").notNull(),
    /** In-game cash (BOARD tokens on the Monopoly ledger, not wallet balance). */
    cash: numeric("cash", { precision: 20, scale: 2 }).notNull(),
    /** Tile index on the 40-tile perimeter (0 = Go). */
    tile: smallint("tile").notNull().default(0),
    status: roomPlayerStatusEnum("status").notNull().default("alive"),
  },
  (table) => [
    uniqueIndex("monopoly_players_match_user_uidx").on(
      table.matchId,
      table.userId,
    ),
    uniqueIndex("monopoly_players_match_seat_uidx").on(table.matchId, table.seat),
  ],
);

/**
 * monopoly_properties · which seat owns each buyable tile (country / airport).
 * Unowned tiles simply have no row.
 */
export const monopolyProperties = pgTable(
  "monopoly_properties",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    /** Board tile index (country / airport / exchange). */
    tileIndex: smallint("tile_index").notNull(),
    /** Owning seat 1-4. */
    ownerSeat: smallint("owner_seat").notNull(),
  },
  (table) => [
    uniqueIndex("monopoly_properties_match_tile_uidx").on(
      table.matchId,
      table.tileIndex,
    ),
  ],
);

/**
 * monopoly_logs · chronological feed for the room sidebar.
 */
export const monopolyLogs = pgTable("monopoly_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  matchId: uuid("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  /** Seat that caused the entry, or null for system messages. */
  seat: smallint("seat"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type MonopolyMatchRow = typeof monopolyMatches.$inferSelect;
export type MonopolyPlayerRow = typeof monopolyPlayers.$inferSelect;
export type MonopolyPropertyRow = typeof monopolyProperties.$inferSelect;
export type MonopolyLogRow = typeof monopolyLogs.$inferSelect;
