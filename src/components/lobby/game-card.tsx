"use client";

import { Check, Radio, Users } from "lucide-react";

import { PixelBadge } from "@/components/ui/pixel-badge";
import type { GameOption } from "@/lib/mock/lobby";
import { cn, formatBoard } from "@/lib/utils";

/**
 * One selectable game in the lobby picker. Rendered as a `radio` rather than a
 * link so choosing a game swaps the room list in place · one tap, no navigation.
 */
export function GameCard({
  game,
  selected,
  tabbable,
  onSelect,
  onKeyDown,
  ref,
}: {
  game: GameOption;
  selected: boolean;
  /** Roving tabindex: only the active option is reachable by Tab. */
  tabbable: boolean;
  onSelect: () => void;
  onKeyDown: React.KeyboardEventHandler<HTMLButtonElement>;
  ref?: React.Ref<HTMLButtonElement>;
}) {
  const isMonopoly = game.type === "monopoly";

  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={tabbable ? 0 : -1}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={cn(
        "scanlines pixel-corners group flex flex-col gap-3 border-2 p-4 text-left sm:gap-4 sm:p-5",
        "transition-[transform,box-shadow,border-color,opacity] duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
        selected
          ? "-translate-y-0.5 border-gold shadow-pixel-lg"
          : "border-edge opacity-70 shadow-pixel hover:-translate-y-0.5 hover:opacity-100",
        selected && isMonopoly && "bg-monopoly/10",
        selected && !isMonopoly && "bg-ludo/10",
        !selected && "bg-surface",
      )}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <span
          aria-hidden
          className={cn(
            "pixel-corners grid size-12 shrink-0 place-items-center border-2 text-xl sm:size-14 sm:text-2xl",
            selected && "animate-float",
            isMonopoly
              ? "border-monopoly/50 bg-monopoly/10"
              : "border-ludo/50 bg-ludo/10",
          )}
        >
          {game.glyph}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={cn(
                "font-pixel text-pixel-fluid-md text-shadow-pixel",
                isMonopoly ? "text-monopoly" : "text-ludo",
              )}
            >
              {game.name}
            </h3>
            {selected && (
              <PixelBadge tone="gold">
                <Check className="size-3" aria-hidden />
                Selected
              </PixelBadge>
            )}
          </div>
          <p className="mt-2 text-xs text-muted">{game.tagline}</p>
        </div>
      </div>

      <p className="hidden text-sm leading-relaxed text-muted sm:block">
        {game.description}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t-2 border-edge pt-4 text-[10px] uppercase tracking-wide text-faint">
        <span className="flex items-center gap-1.5">
          <Users className="size-3" aria-hidden />
          {formatBoard(game.activePlayers)} playing
        </span>
        <span className="flex items-center gap-1.5">
          <Radio className="size-3" aria-hidden />
          {game.openRooms} open rooms
        </span>
        <span
          className={cn(
            "ml-auto font-pixel text-[9px] uppercase transition-colors",
            selected ? "text-gold" : "text-faint group-hover:text-parchment",
          )}
        >
          {selected ? "Showing rooms ↓" : "Tap to pick"}
        </span>
      </div>
    </button>
  );
}
