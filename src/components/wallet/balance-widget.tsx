"use client";

import { Wallet } from "lucide-react";

import { BoardAmount } from "@/components/ui/board-amount";
import { usePlatformWallet } from "@/hooks/use-platform-wallet";
import { MOCK_WALLET_BALANCE } from "@/lib/mock/wallet";
import type { WalletBalance } from "@/lib/types";
import { cn } from "@/lib/utils";

type BalanceWidgetProps = {
  balance?: WalletBalance;
  /** When true, fetch live balance from /api/wallet. */
  live?: boolean;
  /** Compact chip for the site header. */
  compact?: boolean;
  className?: string;
};

/**
 * Shared BOARD balance readout · available (+ locked when expanded).
 */
export function BalanceWidget({
  balance,
  live = false,
  compact = false,
  className,
}: BalanceWidgetProps) {
  const liveState = usePlatformWallet({
    enabled: live,
    pollMs: live ? 30_000 : 0,
  });
  const resolved =
    balance ?? (live ? liveState.balance : null) ?? MOCK_WALLET_BALANCE;

  if (compact) {
    return (
      <div
        className={cn(
          "pixel-corners inline-flex items-center gap-2 border-2 border-gold/50 bg-gold/10 px-3 py-2",
          className,
        )}
        title="BOARD available"
      >
        <Wallet className="size-3.5 text-gold" aria-hidden />
        <BoardAmount value={resolved.available} size="sm" tone="gold" compact />
        <span className="sr-only">BOARD available</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "pixel-corners border-2 border-gold/50 bg-gold/5 p-4 shadow-pixel-sm",
        className,
      )}
    >
      <p className="font-pixel text-[8px] uppercase tracking-widest text-faint">
        BOARD balance
      </p>
      <div className="mt-2">
        <BoardAmount value={resolved.available} size="lg" tone="gold" />
      </div>
      <p className="mt-2 text-xs text-muted">
        Available to join rooms · locked{" "}
        <BoardAmount value={resolved.locked} size="xs" tone="muted" />
      </p>
    </div>
  );
}
