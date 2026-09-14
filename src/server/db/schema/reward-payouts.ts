/**
 * reward_payouts · net BOARD credited to the match winner after the 2% fee.
 * Gross pot and fee split live here so win history / settle can read one row.
 */
import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { gameTypeEnum, rewardPayoutStatusEnum } from "./enums";
import { matches } from "./matches";
import { rooms } from "./rooms";
import { users } from "./users";

export const rewardPayouts = pgTable(
  "reward_payouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    matchId: uuid("match_id")
      .notNull()
      .unique()
      .references(() => matches.id, { onDelete: "cascade" }),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    winnerUserId: uuid("winner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    gameType: gameTypeEnum("game_type").notNull(),
    entryFee: numeric("entry_fee", { precision: 20, scale: 2 }).notNull(),
    seats: numeric("seats", { precision: 4, scale: 0 }).notNull(),
    grossPot: numeric("gross_pot", { precision: 20, scale: 2 }).notNull(),
    feePercent: numeric("fee_percent", { precision: 5, scale: 2 })
      .notNull()
      .default("2"),
    feeAmount: numeric("fee_amount", { precision: 20, scale: 2 }).notNull(),
    treasuryAmount: numeric("treasury_amount", {
      precision: 20,
      scale: 2,
    }).notNull(),
    burnAmount: numeric("burn_amount", { precision: 20, scale: 2 }).notNull(),
    netPayout: numeric("net_payout", { precision: 20, scale: 2 }).notNull(),
    status: rewardPayoutStatusEnum("status").notNull().default("pending"),
    /** Optional on-chain proof once the payout webhook confirms. */
    txHash: text("tx_hash"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (table) => [
    index("reward_payouts_winner_created_idx").on(
      table.winnerUserId,
      table.createdAt,
    ),
    index("reward_payouts_status_idx").on(table.status),
  ],
);

export type RewardPayoutRow = typeof rewardPayouts.$inferSelect;
export type NewRewardPayout = typeof rewardPayouts.$inferInsert;
