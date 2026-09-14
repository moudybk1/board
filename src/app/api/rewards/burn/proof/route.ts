import { NextResponse } from "next/server";

import { attachBurnProof } from "@/server/services/burn.service";

/**
 * POST /api/rewards/burn/proof · attach on-chain burn tx hash / proof URI
 * to a fee_ledger burn row (mock-friendly until RPC watcher lands).
 *
 * Body: `{ feeLedgerId: string, txHash: string, proofUri?: string }`
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    typeof (body as { feeLedgerId?: unknown }).feeLedgerId !== "string" ||
    typeof (body as { txHash?: unknown }).txHash !== "string"
  ) {
    return NextResponse.json(
      { error: "feeLedgerId and txHash are required." },
      { status: 400 },
    );
  }

  const proofUri =
    typeof (body as { proofUri?: unknown }).proofUri === "string"
      ? (body as { proofUri: string }).proofUri
      : undefined;

  try {
    const result = await attachBurnProof({
      feeLedgerId: (body as { feeLedgerId: string }).feeLedgerId,
      txHash: (body as { txHash: string }).txHash,
      proofUri,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/rewards/burn/proof]", error);
    return NextResponse.json(
      { error: "Failed to attach burn proof." },
      { status: 500 },
    );
  }
}
