import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";

import type * as schema from "@/server/db/schema";
import { feeLedger } from "@/server/db/schema";
import { getRoomEconomyConfig } from "@/server/services/economy.service";

type DbTx = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

export type TreasuryFeeInput = {
  rewardPayoutId: string;
  matchId: string;
  /** Total 2% fee amount before the treasury/burn split. */
  feeAmount: number;
  txHash?: string;
};

/**
 * Record the treasury share of the 2% prize fee (default half of the fee).
 */
export async function recordTreasuryFee(
  tx: DbTx,
  input: TreasuryFeeInput,
) {
  const config = getRoomEconomyConfig();
  const amount =
    Math.round(input.feeAmount * config.feeDestination.treasuryShare * 100) /
    100;

  const [row] = await tx
    .insert(feeLedger)
    .values({
      rewardPayoutId: input.rewardPayoutId,
      matchId: input.matchId,
      kind: "treasury",
      amount: amount.toFixed(2),
      txHash: input.txHash ?? null,
      note: "2% prize fee → project treasury",
    })
    .returning();

  return {
    id: row.id,
    kind: "treasury" as const,
    amount,
  };
}

/** Pure helper for docs / API examples. */
export function treasuryShareOfFee(feeAmount: number) {
  const config = getRoomEconomyConfig();
  return (
    Math.round(feeAmount * config.feeDestination.treasuryShare * 100) / 100
  );
}
