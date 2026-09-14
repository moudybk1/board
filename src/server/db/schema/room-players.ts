/**
 * room_players · seats at a room table (1-4).
 * Joining a waiting room deducts `rooms.entry_fee` from `users.balance`.
 */
import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { roomPlayerStatusEnum } from "./enums";
import { rooms } from "./rooms";
import { users } from "./users";

export const roomPlayers = pgTable(
  "room_players",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    /** Seat at the table, 1-4. */
    position: integer("position").notNull(),
    status: roomPlayerStatusEnum("status").notNull().default("alive"),
    /** Waiting-room ready flag (used by Ludo before kickoff). */
    ready: boolean("ready").notNull().default(false),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("room_players_room_user_uidx").on(table.roomId, table.userId),
    uniqueIndex("room_players_room_position_uidx").on(
      table.roomId,
      table.position,
    ),
  ],
);

export type RoomPlayerRow = typeof roomPlayers.$inferSelect;
export type NewRoomPlayer = typeof roomPlayers.$inferInsert;
