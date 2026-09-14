import type { Metadata } from "next";

import { BalanceStrip } from "@/components/lobby/balance-strip";
import { LobbyBoard } from "@/components/lobby/lobby-board";
import { SiteHeader } from "@/components/layout/site-header";
import { RoomEconomyHighlight } from "@/components/ui/room-economy-highlight";
import {
  ENTRY_FEE_TIERS,
  GAME_OPTIONS,
  MOCK_BALANCE,
  MOCK_NOW,
  MOCK_ROOMS,
} from "@/lib/mock/lobby";

export const metadata: Metadata = {
  title: "Lobby | BOARD",
  description:
    "Pick Monopoly or Ludo, browse open rooms by entry fee, and join a four-player table.",
};

export default function LobbyPage() {
  const balance = MOCK_BALANCE;

  return (
    <div className="board-atmosphere flex min-h-full flex-col">
      <SiteHeader />

      <main className="board-container flex-1 py-8 sm:py-10">
        <div className="mb-8 max-w-2xl">
          <h1 className="text-sm leading-snug text-parchment sm:text-base">
            Choose your game
          </h1>
          <p className="mt-3 text-[9px] leading-relaxed text-muted sm:text-[10px]">
            Four players per room, one winner. The pot is every entry fee
            combined. The winner takes it home minus a 2% fee for treasury and
            burn.
          </p>
        </div>

        <div className="mb-10 space-y-4">
          <BalanceStrip
            balance={balance}
            cheapestEntryFee={Math.min(
              ...MOCK_ROOMS.filter((room) => room.status === "waiting").map(
                (room) => room.entryFee,
              ),
            )}
          />
          <RoomEconomyHighlight
            entryFee={1_000}
            seats={4}
            balance={balance.available}
            variant="panel"
            className="max-w-xl"
          />
        </div>

        <LobbyBoard
          games={GAME_OPTIONS}
          rooms={MOCK_ROOMS}
          feeTiers={ENTRY_FEE_TIERS}
          balance={balance.available}
          now={MOCK_NOW}
          defaultGame={GAME_OPTIONS[0].type}
        />
      </main>
    </div>
  );
}
