import { NextResponse } from "next/server";

import { MOCK_PLAYER } from "@/lib/mock/lobby";
import {
  createPendingWithdraw,
  WithdrawError,
} from "@/server/services/withdraw.service";

/**
 * POST /api/wallet/withdraw · request a withdraw after available-balance check.
 *
 * Body: `{ amount: number, walletAddress?: string }`
 * Header: `x-user-id` (falls back to mock player).
 *
 * Creates a pending ledger row; the process service debits balance + confirms.
 */
export async function POST(request: Request) {
  const userId =
    request.headers.get("x-user-id")?.trim() || MOCK_PLAYER.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const amount =
    typeof body === "object" && body !== null && "amount" in body
      ? Number((body as { amount: unknown }).amount)
      : NaN;

  const walletAddress =
    typeof body === "object" &&
    body !== null &&
    "walletAddress" in body &&
    typeof (body as { walletAddress: unknown }).walletAddress === "string"
      ? (body as { walletAddress: string }).walletAddress.trim()
      : undefined;

  try {
    const result = await createPendingWithdraw({
      userId,
      amount,
      walletAddress,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof WithdrawError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[POST /api/wallet/withdraw]", error);
    return NextResponse.json(
      { error: "Failed to create withdraw." },
      { status: 500 },
    );
  }
}
