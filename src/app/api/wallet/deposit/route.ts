import { NextResponse } from "next/server";

import { MOCK_PLAYER } from "@/lib/mock/lobby";
import {
  createPendingDeposit,
  DepositError,
} from "@/server/services/deposit.service";

/**
 * POST /api/wallet/deposit · open a deposit with status `pending`.
 *
 * Body: `{ amount: number, walletAddress?: string }`
 * Header: `x-user-id` (falls back to mock player).
 *
 * Does not credit balance yet · confirmation comes from the deposit listener.
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
    typeof body === "object" &&
    body !== null &&
    "amount" in body
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
    const result = await createPendingDeposit({
      userId,
      amount,
      walletAddress,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof DepositError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[POST /api/wallet/deposit]", error);
    return NextResponse.json(
      { error: "Failed to create deposit." },
      { status: 500 },
    );
  }
}
