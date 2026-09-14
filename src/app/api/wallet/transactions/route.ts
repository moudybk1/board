import { NextResponse } from "next/server";

import { MOCK_PLAYER } from "@/lib/mock/lobby";
import { listUserTransactions } from "@/server/services/transactions.service";

/**
 * GET /api/wallet/transactions · current user's ledger, newest first.
 *
 * Query:
 * - `type`    deposit | withdraw | entry_fee | payout | fee
 * - `status`  pending | confirmed | failed
 * Header: `x-user-id` (falls back to mock player).
 */
export async function GET(request: Request) {
  const userId =
    request.headers.get("x-user-id")?.trim() || MOCK_PLAYER.id;
  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;

  if (
    type &&
    type !== "deposit" &&
    type !== "withdraw" &&
    type !== "entry_fee" &&
    type !== "payout" &&
    type !== "fee"
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid type. Use deposit, withdraw, entry_fee, payout, or fee.",
      },
      { status: 400 },
    );
  }

  if (
    status &&
    status !== "pending" &&
    status !== "confirmed" &&
    status !== "failed"
  ) {
    return NextResponse.json(
      { error: "Invalid status. Use pending, confirmed, or failed." },
      { status: 400 },
    );
  }

  try {
    const result = await listUserTransactions({ userId, type, status });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/wallet/transactions]", error);
    return NextResponse.json(
      { error: "Failed to list transactions." },
      { status: 500 },
    );
  }
}
