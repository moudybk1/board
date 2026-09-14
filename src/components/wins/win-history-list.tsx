"use client";

import Link from "next/link";

import { BoardAmount } from "@/components/ui/board-amount";
import { PayoutStatusBadge } from "@/components/wins/payout-status-badge";
import {
  MOCK_WIN_HISTORY,
  type MockWinResult,
} from "@/lib/mock/wins";
import { cn, formatAge } from "@/lib/utils";

const NOW = Date.parse("2026-09-13T12:00:00.000Z");

/**
 * Mock win history list · newest first, links into the full result page.
 */
export function WinHistoryList({
  wins = MOCK_WIN_HISTORY,
  className,
}: {
  wins?: MockWinResult[];
  className?: string;
}) {
  const sorted = [...wins].sort(
    (a, b) => Date.parse(b.settledAt) - Date.parse(a.settledAt),
  );

  return (
    <ul
      className={cn(
        "divide-y-2 divide-edge border-2 border-edge bg-surface/40",
        className,
      )}
    >
      {sorted.map((win) => (
        <li key={win.id}>
          <Link
            href="/result"
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-surface-hover"
          >
            <div className="min-w-0">
              <p className="font-pixel text-[10px] capitalize text-parchment">
                {win.gameType}
                <span className="mx-2 text-faint">·</span>
                {win.roomId}
              </p>
              <p className="mt-1 text-xs text-muted">
                {win.winner.isYou
                  ? "You won"
                  : `${win.winner.username} won`}{" "}
                · {formatAge(win.settledAt, NOW)}
              </p>
              <div className="mt-2">
                <PayoutStatusBadge status={win.payoutStatus} />
              </div>
            </div>
            <div className="text-right">
              <BoardAmount
                value={win.netPayout}
                size="sm"
                tone={win.winner.isYou ? "gold" : "muted"}
              />
              <p className="mt-1 font-pixel text-[8px] uppercase text-faint">
                Net
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
