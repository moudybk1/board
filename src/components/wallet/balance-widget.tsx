import Link from "next/link";
import { Wallet } from "lucide-react";

import { BoardAmount } from "@/components/ui/board-amount";
import { MOCK_WALLET_BALANCE } from "@/lib/mock/wallet";
import type { WalletBalance } from "@/lib/types";
import { cn } from "@/lib/utils";

type BalanceWidgetProps = {
  balance?: WalletBalance;
  /** Compact chip for the site header. */
  compact?: boolean;
  className?: string;
  href?: string;
};

/**
 * Shared BOARD balance readout · available (+ locked when expanded). Links to
 * the wallet so players can top up before joining a room.
 */
export function BalanceWidget({
  balance = MOCK_WALLET_BALANCE,
  compact = false,
  className,
  href = "/wallet",
}: BalanceWidgetProps) {
  if (compact) {
    return (
      <Link
        href={href}
        className={cn(
          "pixel-corners inline-flex items-center gap-2 border-2 border-gold/50 bg-gold/10 px-3 py-2 transition-colors hover:bg-gold/20",
          className,
        )}
        title="Open wallet"
      >
        <Wallet className="size-3.5 text-gold" aria-hidden />
        <BoardAmount value={balance.available} size="sm" tone="gold" compact />
        <span className="sr-only">BOARD available · open wallet</span>
      </Link>
    );
  }

  return (
    <div
      className={cn(
        "pixel-corners border-2 border-gold/50 bg-gold/5 p-4 shadow-pixel-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-pixel text-[8px] uppercase tracking-widest text-faint">
            BOARD balance
          </p>
          <div className="mt-2">
            <BoardAmount value={balance.available} size="lg" tone="gold" />
          </div>
          <p className="mt-2 text-xs text-muted">
            Available to join rooms · locked{" "}
            <BoardAmount value={balance.locked} size="xs" tone="muted" />
          </p>
        </div>
        <Link
          href={href}
          className="font-pixel text-[8px] uppercase text-gold hover:underline"
        >
          Manage →
        </Link>
      </div>
    </div>
  );
}
