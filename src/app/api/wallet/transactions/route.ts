import { NextResponse } from "next/server";

import { errorResponse } from "@/server/lib/api-response";
import { requireUser } from "@/server/lib/require-user";
import { listUserTransactions } from "@/server/services/transactions.service";

const TYPES = ["deposit", "withdraw", "entry_fee", "payout", "fee"] as const;
const STATUSES = ["pending", "confirmed", "failed"] as const;

type TransactionType = (typeof TYPES)[number];
type TransactionStatus = (typeof STATUSES)[number];

/** Narrow a query-string value to one of the allowed literals. */
function readFilter<T extends string>(
  raw: string | null,
  allowed: readonly T[],
): { ok: true; value: T | undefined } | { ok: false } {
  if (raw === null) return { ok: true, value: undefined };
  const match = allowed.find((option) => option === raw);
  return match ? { ok: true, value: match } : { ok: false };
}

/**
 * GET /api/wallet/transactions · the signed-in user's ledger, newest first.
 *
 * Query: `type` (deposit|withdraw|entry_fee|payout|fee), `status`
 * (pending|confirmed|failed).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);

  const type = readFilter<TransactionType>(url.searchParams.get("type"), TYPES);
  if (!type.ok) {
    return NextResponse.json(
      { error: `Invalid type. Use ${TYPES.join(", ")}.` },
      { status: 400 },
    );
  }

  const status = readFilter<TransactionStatus>(
    url.searchParams.get("status"),
    STATUSES,
  );
  if (!status.ok) {
    return NextResponse.json(
      { error: `Invalid status. Use ${STATUSES.join(", ")}.` },
      { status: 400 },
    );
  }

  try {
    const { userId } = await requireUser(request);
    const result = await listUserTransactions({
      userId,
      type: type.value,
      status: status.value,
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "GET /api/wallet/transactions");
  }
}
