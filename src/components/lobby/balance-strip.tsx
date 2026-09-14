import { ArrowDownToLine, ArrowUpFromLine, Link2, Lock } from "lucide-react";

import { BoardAmount } from "@/components/ui/board-amount";
import { PixelBadge } from "@/components/ui/pixel-badge";
import { PixelButtonLink } from "@/components/ui/pixel-button";
import { PixelLabel } from "@/components/ui/pixel-label";
import { PixelPanel } from "@/components/ui/pixel-panel";
import type { WalletBalance } from "@/lib/types";
import { formatBoard } from "@/lib/utils";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Balance at a glance, so the player can judge which rooms they can afford. */
export function BalanceStrip({
  balance,
  /** Cheapest entry fee on offer · drives the "top up" hint. */
  cheapestEntryFee,
}: {
  balance: WalletBalance;
  cheapestEntryFee?: number;
}) {
  const cannotPlay =
    cheapestEntryFee !== undefined && balance.available < cheapestEntryFee;

  return (
    <PixelPanel
      tone="gold"
      className="flex flex-col gap-4 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6 sm:p-5"
    >
      <div>
        <PixelLabel className="text-gold/70">Available balance</PixelLabel>
        <BoardAmount
          value={balance.available}
          size="xl"
          tone="gold"
          className="mt-2"
        />
      </div>

      <div className="border-t-2 border-gold/20 pt-4 sm:border-l-2 sm:border-t-0 sm:pl-6 sm:pt-0">
        <PixelLabel className="flex items-center gap-1.5 text-faint">
          <Lock className="size-3" aria-hidden />
          In play
        </PixelLabel>
        <BoardAmount
          value={balance.locked}
          tone="muted"
          showTicker={false}
          className="mt-2"
        />
      </div>

      <div className="flex flex-col gap-2">
        <PixelBadge tone="gold">
          <Link2 className="size-3" aria-hidden />
          {balance.chain}
        </PixelBadge>
        <span className="font-mono text-[10px] text-faint">
          {shortAddress(balance.address)}
        </span>
      </div>

      <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
        <PixelButtonLink
          href="/wallet/deposit"
          variant="primary"
          size="sm"
          className="flex-1 justify-center sm:flex-none"
        >
          <ArrowDownToLine className="size-3" aria-hidden />
          Deposit
        </PixelButtonLink>
        <PixelButtonLink
          href="/wallet/withdraw"
          variant="outline"
          size="sm"
          className="flex-1 justify-center sm:flex-none"
        >
          <ArrowUpFromLine className="size-3" aria-hidden />
          Withdraw
        </PixelButtonLink>
      </div>

      {cannotPlay && (
        <p className="w-full border-t-2 border-gold/20 pt-4 text-xs text-danger">
          Your balance is below the cheapest room ({formatBoard(
            cheapestEntryFee,
          )}{" "}
          BOARD). Deposit to join a table.
        </p>
      )}
    </PixelPanel>
  );
}
