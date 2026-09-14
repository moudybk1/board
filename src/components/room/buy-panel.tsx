"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Coins, Landmark, X } from "lucide-react";

import { PixelArt } from "@/components/game/pixel-art";
import { BoardAmount } from "@/components/ui/board-amount";
import { PixelBadge } from "@/components/ui/pixel-badge";
import { PixelButton } from "@/components/ui/pixel-button";
import { PixelPanel } from "@/components/ui/pixel-panel";
import { groupFor, landmarkFor, type BoardTile } from "@/lib/game/monopoly-board";

/**
 * Purchase prompt shown over the board when you land on an unowned country.
 * It is a modal decision, so focus moves in on open and Escape declines.
 */
export function BuyPanel({
  tile,
  cash,
  onBuy,
  onDecline,
}: {
  tile: BoardTile;
  /** Your cash on hand, for the affordability check. */
  cash: number;
  onBuy: () => void;
  onDecline: () => void;
}) {
  const buyRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const landmarkRef = useRef<HTMLDivElement>(null);
  const group = groupFor(tile);
  const landmark = landmarkFor(tile);
  const price = tile.price ?? 0;
  const affordable = cash >= price;

  useEffect(() => {
    buyRef.current?.focus();
  }, []);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const tween = gsap.fromTo(
      panel,
      { opacity: 0, y: 18, scale: 0.92 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.35,
        ease: "back.out(1.6)",
      },
    );

    const art = landmarkRef.current;
    const bounce = art
      ? gsap.fromTo(
          art,
          { y: -8, scale: 0.8 },
          {
            y: 0,
            scale: 1,
            duration: 0.45,
            delay: 0.12,
            ease: "bounce.out",
          },
        )
      : null;

    return () => {
      tween.kill();
      bounce?.kill();
    };
  }, [tile.index]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onDecline();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDecline]);

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 grid place-items-center bg-void/80 p-4 animate-[slide-up_280ms_ease-out]">
      <PixelPanel
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="buy-panel-title"
        tone="raised"
        className="w-full max-w-xs"
      >
        <div
          className="flex items-center justify-between gap-2 border-b-2 border-edge px-4 py-3"
          style={group ? { backgroundColor: `${group.color}22` } : undefined}
        >
          <h2
            id="buy-panel-title"
            className="font-pixel text-[11px] text-parchment text-shadow-pixel"
          >
            {tile.name}
          </h2>
          <button
            type="button"
            onClick={onDecline}
            aria-label="Decline purchase"
            className="text-faint transition-colors hover:text-parchment"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 p-5">
          {landmark && (
            <div
              ref={landmarkRef}
              className="pixel-corners w-24 border-2 p-2"
              style={{
                borderColor: group?.color ?? "var(--color-edge)",
                backgroundColor: `${group?.color ?? "#000000"}18`,
              }}
            >
              <PixelArt sprite={landmark} label={`${tile.name} landmark`} />
            </div>
          )}

          {group && (
            <PixelBadge
              tone="neutral"
              style={{ borderColor: group.color, color: group.color }}
            >
              {group.name}
            </PixelBadge>
          )}

          <dl className="grid w-full grid-cols-2 gap-3">
            <div>
              <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-faint">
                <Coins className="size-3" aria-hidden />
                Price
              </dt>
              <dd className="mt-1">
                <BoardAmount
                  value={price}
                  tone={affordable ? "default" : "danger"}
                  showTicker={false}
                />
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-faint">
                <Landmark className="size-3" aria-hidden />
                Rent
              </dt>
              <dd className="mt-1">
                <BoardAmount
                  value={tile.rent ?? 0}
                  tone="gold"
                  showTicker={false}
                />
              </dd>
            </div>
          </dl>

          <p className="w-full border-t-2 border-edge pt-3 text-[11px] text-muted">
            Your cash after buying:{" "}
            <BoardAmount
              value={Math.max(0, cash - price)}
              size="xs"
              tone={affordable ? "default" : "danger"}
              showTicker={false}
            />
          </p>

          {!affordable && (
            <p className="text-[11px] text-danger">
              Not enough cash for this city.
            </p>
          )}

          <div className="flex w-full gap-2">
            <PixelButton
              ref={buyRef}
              variant="primary"
              size="md"
              className="flex-1"
              disabled={!affordable}
              onClick={onBuy}
            >
              Buy
            </PixelButton>
            <PixelButton
              variant="outline"
              size="md"
              className="flex-1"
              onClick={onDecline}
            >
              Pass
            </PixelButton>
          </div>
        </div>
      </PixelPanel>
    </div>
  );
}
