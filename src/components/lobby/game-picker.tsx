"use client";

import { useRef } from "react";

import { GameCard } from "@/components/lobby/game-card";
import type { GameOption } from "@/lib/mock/lobby";
import type { GameType } from "@/lib/types";

/**
 * Radio group of game cards. Arrow keys move between options and select as
 * they go, matching native radio behaviour.
 */
export function GamePicker({
  games,
  selected,
  onSelect,
}: {
  games: GameOption[];
  selected: GameType;
  onSelect: (game: GameType) => void;
}) {
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;

    if (step === 0) return;

    event.preventDefault();
    const next = (index + step + games.length) % games.length;
    onSelect(games[next].type);
    cardRefs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label="Choose a game"
      className="grid gap-5 lg:grid-cols-2"
    >
      {games.map((game, index) => (
        <GameCard
          key={game.type}
          ref={(node) => {
            cardRefs.current[index] = node;
          }}
          game={game}
          selected={game.type === selected}
          tabbable={game.type === selected}
          onSelect={() => onSelect(game.type)}
          onKeyDown={(event) => handleKeyDown(event, index)}
        />
      ))}
    </div>
  );
}
