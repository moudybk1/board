import { Link2, Lock, Sparkles } from "lucide-react";

import { BoardAmount } from "@/components/ui/board-amount";
import { PixelBadge } from "@/components/ui/pixel-badge";
import { PixelLabel } from "@/components/ui/pixel-label";
import type { WalletBalance } from "@/lib/types";
import { cn, formatBoard } from "@/lib/utils";

function shortAddress(address: string) {
  if (!address || address.length < 10) return "—";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Balance vault strip — stakes at a glance before joining a room. */
export function BalanceStrip({
  balance,
  cheapestEntryFee,
  className,
}: {
  balance: WalletBalance;
  cheapestEntryFee?: number;
  className?: string;
}) {
  const cannotPlay =
    cheapestEntryFee !== undefined && balance.available < cheapestEntryFee;

  return (
    <section
      className={cn(
        "relative overflow-hidden border-2 border-gold/50 bg-void/70 shadow-pixel-gold",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 size-40 rounded-full bg-gold/10 blur-2xl"
      />
      <div className="relative p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <PixelLabel className="text-gold/80">Available to stake</PixelLabel>
          <PixelBadge tone="gold">
            <Sparkles className="size-3" aria-hidden />
            Ready
          </PixelBadge>
        </div>
        <BoardAmount
          value={balance.available}
          size="xl"
          tone="gold"
          className="mt-3"
        />
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div>
            <PixelLabel className="flex items-center gap-1.5 text-faint">
              <Lock className="size-3" aria-hidden />
              Locked in rooms
            </PixelLabel>
            <BoardAmount
              value={balance.locked}
              tone="muted"
              showTicker={false}
              className="mt-1.5"
            />
          </div>
          <div className="border-l-2 border-edge pl-4">
            <PixelBadge tone="gold">
              <Link2 className="size-3" aria-hidden />
              {balance.chain}
            </PixelBadge>
            <p className="mt-2 font-mono text-[10px] text-faint">
              {shortAddress(balance.address)}
            </p>
          </div>
        </div>
      </div>

      {cannotPlay ? (
        <p
          role="alert"
          className="border-t-2 border-danger/40 bg-danger/10 px-5 py-3 text-xs text-danger sm:px-6"
        >
          Balance is below the cheapest open table (
          {formatBoard(cheapestEntryFee)} BOARD).
        </p>
      ) : null}
    </section>
  );
}
