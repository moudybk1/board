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

export type BurnFeeInput = {
  rewardPayoutId: string;
  matchId: string;
  feeAmount: number;
  txHash?: string;
  proofUri?: string;
};

/**
 * Record the burn share of the 2% prize fee and optional on-chain proof.
 */
export async function recordBurnFee(tx: DbTx, input: BurnFeeInput) {
  const config = getRoomEconomyConfig();
  const amount =
    Math.round(input.feeAmount * config.feeDestination.burnShare * 100) / 100;

  const [row] = await tx
    .insert(feeLedger)
    .values({
      rewardPayoutId: input.rewardPayoutId,
      matchId: input.matchId,
      kind: "burn",
      amount: amount.toFixed(2),
      txHash: input.txHash ?? null,
      proofUri: input.proofUri ?? null,
      note: "2% prize fee → BOARD burn",
    })
    .returning();

  return {
    id: row.id,
    kind: "burn" as const,
    amount,
    txHash: row.txHash,
    proofUri: row.proofUri,
  };
}

export function burnShareOfFee(feeAmount: number) {
  const config = getRoomEconomyConfig();
  return Math.round(feeAmount * config.feeDestination.burnShare * 100) / 100;
}
