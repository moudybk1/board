import Link from "next/link";
import { Clock, LogOut } from "lucide-react";

import { BoardLogo } from "@/components/layout/board-logo";
import { PixelBadge } from "@/components/ui/pixel-badge";
import { RoomEconomyHighlight } from "@/components/ui/room-economy-highlight";

export function RoomHeader({
  roomId,
  turn,
  turnSecondsLeft,
  pot,
  entryFee,
  seats = 4,
  balance,
}: {
  roomId: string;
  turn: number;
  turnSecondsLeft: number;
  /** Prize pool before the fee is taken (kept for callers; derived from entry). */
  pot: number;
  entryFee: number;
  seats?: number;
  balance?: number;
}) {
  void pot;

  return (
    <header className="border-b-2 border-edge bg-ink/90">
      <div className="mx-auto flex w-full max-w-[1800px] flex-wrap items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
        <Link href="/" aria-label="BOARD home" className="shrink-0">
          <BoardLogo className="text-xs sm:text-sm" />
        </Link>

        <span className="pixel-corners border-2 border-edge bg-surface px-2 py-1 font-pixel text-[8px] text-parchment sm:px-2.5 sm:py-1.5 sm:text-[9px]">
          {roomId}
        </span>

        <PixelBadge tone="neutral" className="hidden sm:inline-flex">
          Turn {turn}
        </PixelBadge>

        <PixelBadge tone={turnSecondsLeft <= 10 ? "danger" : "neutral"}>
          <Clock className="size-3" aria-hidden />
          {turnSecondsLeft}s
        </PixelBadge>

        <div className="order-last w-full sm:order-none sm:ml-auto sm:w-auto">
          <RoomEconomyHighlight
            entryFee={entryFee}
            seats={seats}
            balance={balance}
            variant="strip"
          />
        </div>

        <Link
          href="/lobby"
          className="pixel-corners flex items-center gap-1.5 border-2 border-edge px-2 py-1 font-pixel text-[8px] uppercase text-muted transition-colors hover:border-danger/50 hover:text-danger sm:gap-2 sm:px-3 sm:py-1.5 sm:text-[9px]"
        >
          <LogOut className="size-3" aria-hidden />
          <span className="hidden sm:inline">Leave</span>
        </Link>
      </div>
    </header>
  );
}
