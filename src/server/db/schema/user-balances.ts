/**
 * user_balances · spendable BOARD on the platform plus the linked chain wallet.
 * Locked funds for active rooms stay derived from room_players × entry_fee
 * (see balance.service), not stored here.
 */
import {
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const userBalances = pgTable("user_balances", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  /** Spendable BOARD held by the platform on the player's behalf. */
  available: numeric("available", { precision: 20, scale: 2 })
    .notNull()
    .default("0"),
  chain: text("chain").notNull().default("Robinhood Chain"),
  walletAddress: text("wallet_address"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type UserBalanceRow = typeof userBalances.$inferSelect;
export type NewUserBalance = typeof userBalances.$inferInsert;
