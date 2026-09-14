"use client";

import { useMemo, useState } from "react";

import {
  EntryFeeFilter,
  type EntryFeeFilter as EntryFeeFilterValue,
} from "@/components/lobby/entry-fee-filter";
import { GamePicker } from "@/components/lobby/game-picker";
import { RoomList } from "@/components/lobby/room-list";
import { PixelHeading } from "@/components/ui/pixel-label";
import type { GameOption } from "@/lib/mock/lobby";
import type { GameType, Room } from "@/lib/types";

/**
 * Owns the lobby's client state: the picked game plus the entry-fee filters,
 * which together decide which rooms are listed. Data arrives from the server
 * as props.
 */
export function LobbyBoard({
  games,
  rooms,
  feeTiers,
  balance,
  now,
  defaultGame,
}: {
  games: GameOption[];
  rooms: Room[];
  feeTiers: readonly number[];
  /** Available balance, used to flag rooms the player cannot afford. */
  balance: number;
  /** Reference timestamp for room age labels. */
  now: number;
  defaultGame: GameType;
}) {
  const [selectedGame, setSelectedGame] = useState<GameType>(defaultGame);
  const [feeFilter, setFeeFilter] = useState<EntryFeeFilterValue>(null);
  const [affordableOnly, setAffordableOnly] = useState(false);

  const gameRooms = useMemo(
    () => rooms.filter((room) => room.gameType === selectedGame),
    [rooms, selectedGame],
  );

  // Counts come from the unfiltered set for this game so the chips always show
  // what's actually on offer, not what's left after filtering.
  const countsByTier = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const room of gameRooms) {
      if (room.status !== "waiting") continue;
      counts[room.entryFee] = (counts[room.entryFee] ?? 0) + 1;
    }
    return counts;
  }, [gameRooms]);

  const visibleRooms = useMemo(
    () =>
      gameRooms.filter((room) => {
        if (feeFilter !== null && room.entryFee !== feeFilter) return false;
        if (affordableOnly && room.entryFee > balance) return false;
        return true;
      }),
    [gameRooms, feeFilter, affordableOnly, balance],
  );

  const isFiltered = feeFilter !== null || affordableOnly;

  return (
    <>
      <section aria-labelledby="games" className="mb-12">
        <PixelHeading as="h2" id="games" size="sm" className="mb-4">
          Games
        </PixelHeading>
        <GamePicker
          games={games}
          selected={selectedGame}
          onSelect={(game) => {
            setSelectedGame(game);
            // Tiers differ per game, so a stale fee filter would silently
            // empty the list after switching.
            setFeeFilter(null);
          }}
        />
      </section>

      <RoomList
        gameType={selectedGame}
        rooms={visibleRooms}
        balance={balance}
        now={now}
        filtered={isFiltered}
        toolbar={
          <EntryFeeFilter
            tiers={feeTiers}
            selected={feeFilter}
            onSelect={setFeeFilter}
            counts={countsByTier}
            affordableOnly={affordableOnly}
            onAffordableOnlyChange={setAffordableOnly}
          />
        }
      />
    </>
  );
}
