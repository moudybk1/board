import { eq } from "drizzle-orm";

import { getDb } from "@/server/db";
import { feeLedger } from "@/server/db/schema";
import {
  burnShareOfFee,
  recordBurnFee,
} from "@/server/services/burn-fee.service";
import { isDbConfigured as dbConfigured } from "@/server/lib/db-config";
import { defineServiceError } from "@/server/lib/service-error";

/** Thrown when the target fee-ledger row is missing or is not a burn row. */
export const BurnProofError = defineServiceError("BurnProofError");

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

  // Confirm the row is a burn row before writing to it. Updating first stamped
  // a burn proof onto treasury rows before throwing, and left it there.
  const row = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ kind: feeLedger.kind })
      .from(feeLedger)
      .where(eq(feeLedger.id, input.feeLedgerId))
      .limit(1)
      .for("update");

    if (!existing || existing.kind !== "burn") {
      throw new BurnProofError("Burn ledger row not found.", 404);
    }

    const [updated] = await tx
      .update(feeLedger)
      .set({
        txHash: input.txHash,
        proofUri: input.proofUri ?? null,
      })
      .where(eq(feeLedger.id, input.feeLedgerId))
      .returning();

    return updated;
  });

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
