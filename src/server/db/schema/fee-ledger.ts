/**
 * fee_ledger · 2% prize fee split into treasury credits and burn records.
 * One reward payout typically inserts two rows (treasury + burn).
 */
import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { feeLedgerKindEnum } from "./enums";
import { matches } from "./matches";
import { rewardPayouts } from "./reward-payouts";

export const feeLedger = pgTable(
  "fee_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    rewardPayoutId: uuid("reward_payout_id")
      .notNull()
      .references(() => rewardPayouts.id, { onDelete: "cascade" }),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    kind: feeLedgerKindEnum("kind").notNull(),
    amount: numeric("amount", { precision: 20, scale: 2 }).notNull(),
    /** On-chain burn / treasury transfer hash when available. */
    txHash: text("tx_hash"),
    proofUri: text("proof_uri"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("fee_ledger_payout_idx").on(table.rewardPayoutId),
    index("fee_ledger_kind_created_idx").on(table.kind, table.createdAt),
  ],
);

export type FeeLedgerRow = typeof feeLedger.$inferSelect;
export type NewFeeLedger = typeof feeLedger.$inferInsert;
