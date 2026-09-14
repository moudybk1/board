"use client";

import { useMemo, useState } from "react";

import { BoardAmount } from "@/components/ui/board-amount";
import { MOCK_TRANSACTIONS, type MockTx } from "@/lib/mock/wallet";
import { cn, formatAge } from "@/lib/utils";

type TxFilter = "all" | MockTx["type"] | MockTx["status"];

const FILTERS: { id: TxFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "deposit", label: "Deposit" },
  { id: "withdraw", label: "Withdraw" },
  { id: "entry_fee", label: "Entry" },
  { id: "payout", label: "Payout" },
  { id: "pending", label: "Pending" },
  { id: "failed", label: "Failed" },
];

/**
 * Transaction history sorted newest-first with type/status filters (mock data).
 */
export function TransactionHistory({ className }: { className?: string }) {
  const [filter, setFilter] = useState<TxFilter>("all");
  const now = Date.parse("2026-09-13T12:00:00.000Z");

  const rows = useMemo(() => {
    const sorted = [...MOCK_TRANSACTIONS].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
    if (filter === "all") return sorted;
    return sorted.filter(
      (tx) => tx.type === filter || tx.status === filter,
    );
  }, [filter]);

  return (
    <section aria-labelledby="tx-history-title" className={className}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2
          id="tx-history-title"
          className="font-pixel text-[11px] text-parchment"
        >
          Transaction history
        </h2>
        <p className="font-pixel text-[8px] uppercase text-faint">
          Newest first
        </p>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={cn(
              "pixel-corners shrink-0 border px-3 py-1.5 font-pixel text-[8px] uppercase",
              filter === item.id
                ? "border-gold bg-gold/15 text-gold"
                : "border-edge text-muted hover:border-edge-bright hover:text-parchment",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="border-2 border-edge bg-surface/40 px-4 py-6 text-sm text-muted">
          No transactions match this filter.
        </p>
      ) : (
        <ul className="divide-y-2 divide-edge border-2 border-edge bg-surface/40">
          {rows.map((tx) => (
            <TxRow key={tx.id} tx={tx} now={now} />
          ))}
        </ul>
      )}
    </section>
  );
}

function TxRow({ tx, now }: { tx: MockTx; now: number }) {
  const positive = tx.amount > 0;
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
      <div className="min-w-0">
        <p className="font-pixel text-[10px] capitalize text-parchment">
          {tx.type.replace("_", " ")}
        </p>
        <p className="mt-1 truncate text-xs text-faint">{tx.note}</p>
        <p className="mt-1 font-pixel text-[8px] text-faint">
          {formatAge(tx.createdAt, now)}
        </p>
      </div>
      <div className="text-right">
        <BoardAmount
          value={Math.abs(tx.amount)}
          size="sm"
          tone={
            tx.status === "failed"
              ? "danger"
              : positive
                ? "success"
                : "default"
          }
        />
        <p
          className={cn(
            "mt-1 font-pixel text-[8px] uppercase",
            tx.status === "confirmed" && "text-success",
            tx.status === "pending" && "text-gold",
            tx.status === "failed" && "text-danger",
          )}
        >
          {positive ? "+" : "−"}
          {tx.status}
        </p>
      </div>
    </li>
  );
}
