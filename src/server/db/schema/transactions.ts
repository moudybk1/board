/**
 * transactions · ledger of BOARD moves (deposit, withdraw, entry fee, payout).
 * Amounts are signed from the user's perspective: deposits/payouts positive,
 * withdraws/entry fees negative. Chain confirmation updates status + tx_hash.
 */
import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { transactionStatusEnum, transactionTypeEnum } from "./enums";
import { users } from "./users";

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    type: transactionTypeEnum("type").notNull(),
    status: transactionStatusEnum("status").notNull().default("pending"),
    /** Signed BOARD delta for the user's platform balance. */
    amount: numeric("amount", { precision: 20, scale: 2 }).notNull(),
    chain: text("chain").notNull().default("Robinhood Chain"),
    /** External wallet address involved in deposit/withdraw, when known. */
    walletAddress: text("wallet_address"),
    /** On-chain transaction hash once broadcast / confirmed. */
    txHash: text("tx_hash"),
    note: text("note"),
    /** Optional link to a room/match for entry_fee or payout rows. */
    referenceId: uuid("reference_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("transactions_user_created_idx").on(table.userId, table.createdAt),
    index("transactions_status_idx").on(table.status),
    index("transactions_type_idx").on(table.type),
  ],
);

export type TransactionRow = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
