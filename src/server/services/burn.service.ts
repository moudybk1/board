import { eq } from "drizzle-orm";

import { getDb } from "@/server/db";
import { feeLedger } from "@/server/db/schema";
import {
  burnShareOfFee,
  recordBurnFee,
} from "@/server/services/burn-fee.service";

function dbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export type AttachBurnProofInput = {
  feeLedgerId: string;
  txHash: string;
  proofUri?: string;
};

/**
 * Attach on-chain burn proof to an existing fee_ledger burn row.
 */
export async function attachBurnProof(input: AttachBurnProofInput) {
  if (!dbConfigured()) {
    return {
      id: input.feeLedgerId,
      kind: "burn" as const,
      txHash: input.txHash,
      proofUri: input.proofUri ?? `mock://burn/${input.txHash}`,
      source: "mock" as const,
    };
  }

  const db = getDb();
  const [row] = await db
    .update(feeLedger)
    .set({
      txHash: input.txHash,
      proofUri: input.proofUri ?? null,
    })
    .where(eq(feeLedger.id, input.feeLedgerId))
    .returning();

  if (!row || row.kind !== "burn") {
    throw new Error("Burn ledger row not found.");
  }

  return {
    id: row.id,
    kind: "burn" as const,
    amount: Number(row.amount),
    txHash: row.txHash,
    proofUri: row.proofUri,
    source: "database" as const,
  };
}

export { recordBurnFee, burnShareOfFee };
