"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

import { PixelArt } from "@/components/game/pixel-art";
import { HeroDice } from "@/components/welcome/hero-dice";
import {
  BOARD_SIZE,
  BOARD_TILES,
  groupFor,
  isCorner,
  tilePlacement,
  type BoardTile,
  type TileEdge,
} from "@/lib/game/monopoly-board";
import { pawnSprite } from "@/lib/game/pawn-sprite";
import { prefersReducedMotion } from "@/lib/motion/gsap-config";
import { cn } from "@/lib/utils";

/** Group bar faces the board center, same as the live table. */
const BAR_POSITION: Record<TileEdge, string> = {
  bottom: "top-0 left-0 right-0 h-[26%] border-b-2 border-void",
  left: "top-0 right-0 bottom-0 w-[26%] border-l-2 border-void",
  top: "bottom-0 left-0 right-0 h-[26%] border-t-2 border-void",
  right: "top-0 left-0 bottom-0 w-[26%] border-r-2 border-void",
};

const CORNER_LABEL: Record<string, string> = {
  go: "GO",
  jail: "JAIL",
  vault: "FREE",
  "go-to-jail": "JAIL",
};

type HopJob = { seat: number; steps: number };

/**
 * Full-bleed Monopoly track for the landing hero.
 * Real CSS-grid board with gutters between tiles; dice settle → pawn hops.
 */
export function WelcomeStage({ className }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const board = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = root.current;
    const boardNode = board.current;
    if (!stage || !boardNode || prefersReducedMotion()) return;

    const tileNodes = Array.from(
      boardNode.querySelectorAll<HTMLElement>("[data-hero-tile]"),
    ).sort(
      (a, b) => Number(a.dataset.index ?? 0) - Number(b.dataset.index ?? 0),
    );
    const pawns = Array.from(
      boardNode.querySelectorAll<HTMLElement>("[data-hero-pawn]"),
    );

    const queue: HopJob[] = [];
    let busy = false;
    let leadSeat = 0;
    const tweens: gsap.core.Animation[] = [];

    const centerOf = (index: number) => {
      const tile = tileNodes[index % tileNodes.length];
      if (!tile) return { x: 50, y: 50 };
      const br = boardNode.getBoundingClientRect();
      const tr = tile.getBoundingClientRect();
      if (br.width < 1 || br.height < 1) return { x: 50, y: 50 };
      return {
        x: ((tr.left + tr.width / 2 - br.left) / br.width) * 100,
        y: ((tr.top + tr.height / 2 - br.top) / br.height) * 100,
      };
    };

    pawns.forEach((pawn, seat) => {
      const start = seat * (BOARD_SIZE - 1);
      const point = centerOf(start);
      gsap.set(pawn, {
        left: `${point.x}%`,
        top: `${point.y}%`,
        xPercent: -50,
        yPercent: -50,
      });
      pawn.dataset.tile = String(start);

      const body = pawn.querySelector<HTMLElement>("[data-pawn-body]");
      if (body) {
        const bob = gsap.to(body, {
          y: -3,
          duration: 0.65 + seat * 0.08,
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut",
          delay: seat * 0.2,
        });
        tweens.push(bob);
      }
    });

    const flashTile = (index: number) => {
      const tile = tileNodes[index % tileNodes.length];
      if (!tile) return;
      gsap.fromTo(
        tile,
        { filter: "brightness(1)" },
        {
          filter: "brightness(2.05)",
          duration: 0.1,
          yoyo: true,
          repeat: 1,
          ease: "power1.out",
        },
      );
    };

    const setBob = (pawn: HTMLElement, enabled: boolean) => {
      const body = pawn.querySelector<HTMLElement>("[data-pawn-body]");
      if (!body) return;
      if (enabled) {
        gsap.set(body, { y: 0, scaleX: 1, scaleY: 1, rotate: 0 });
        const bob = gsap.to(body, {
          y: -3,
          duration: 0.65,
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut",
        });
        tweens.push(bob);
      } else {
        gsap.killTweensOf(body);
        gsap.set(body, { y: 0, scaleX: 1, scaleY: 1, rotate: 0 });
      }
    };

    const runHop = (seat: number, steps: number) => {
      const pawn = pawns[seat];
      if (!pawn || steps < 1) {
        busy = false;
        drain();
        return;
      }

      busy = true;
      setBob(pawn, false);

      const body = pawn.querySelector<HTMLElement>("[data-pawn-body]");
      const from = Number(pawn.dataset.tile ?? "0");
      const stepDur = steps >= 8 ? 0.13 : steps >= 5 ? 0.16 : 0.19;

      const tl = gsap.timeline({
        onComplete: () => {
          if (body) {
            gsap.fromTo(
              body,
              { rotate: -6 },
              {
                rotate: 6,
                duration: 0.09,
                yoyo: true,
                repeat: 3,
                ease: "power1.inOut",
                onComplete: () => {
                  gsap.set(body, { rotate: 0 });
                  setBob(pawn, true);
                },
              },
            );
          } else {
            setBob(pawn, true);
          }
          busy = false;
          drain();
        },
      });
      tweens.push(tl);

      for (let step = 1; step <= steps; step += 1) {
        const idx = (from + step) % tileNodes.length;
        const next = centerOf(idx);
        const isLast = step === steps;

        tl.to(pawn, {
          left: `${next.x}%`,
          top: `${next.y}%`,
          duration: stepDur,
          ease: "none",
          onStart: () => {
            flashTile(idx);
            pawn.dataset.tile = String(idx);
          },
        });

        if (body) {
          tl.to(
            body,
            {
              y: isLast ? -20 : -12,
              scaleY: 1.25,
              scaleX: 0.88,
              duration: stepDur * 0.42,
              ease: "power2.out",
            },
            "<",
          )
            .to(body, {
              y: 0,
              scaleY: 0.84,
              scaleX: 1.16,
              duration: stepDur * 0.38,
              ease: "power2.in",
            })
            .to(body, {
              scaleY: 1,
              scaleX: 1,
              duration: stepDur * 0.22,
              ease: "power1.out",
            });
        }
      }
    };

    const drain = () => {
      if (busy) return;
      const job = queue.shift();
      if (!job) return;
      runHop(job.seat, job.steps);
    };

    const onRoll = (event: Event) => {
      const detail = (event as CustomEvent<{ total: number }>).detail;
      const total = detail?.total ?? 0;
      if (total < 1) return;

      const seat = leadSeat % pawns.length;
      leadSeat = (leadSeat + 1) % Math.max(pawns.length, 1);
      queue.push({ seat, steps: total });
      drain();
    };

    const onResize = () => {
      pawns.forEach((pawn) => {
        const idx = Number(pawn.dataset.tile ?? "0");
        const point = centerOf(idx);
        gsap.set(pawn, { left: `${point.x}%`, top: `${point.y}%` });
      });
    };

    stage.addEventListener("hero-dice-settle", onRoll);
    window.addEventListener("resize", onResize);

    return () => {
      stage.removeEventListener("hero-dice-settle", onRoll);
      window.removeEventListener("resize", onResize);
      tweens.forEach((t) => t.kill());
      pawns.forEach((p) => {
        gsap.killTweensOf(p);
        const body = p.querySelector<HTMLElement>("[data-pawn-body]");
        if (body) gsap.killTweensOf(body);
      });
      queue.length = 0;
    };
  }, []);

  return (
    <div
      ref={root}
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden bg-ink",
        className,
      )}
    >
      {/* Felt wash biased to the right where the board lives */}
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 55% 70% at 78% 48%, color-mix(in srgb, var(--color-surface) 60%, transparent), transparent 72%)",
        }}
      />

      {/*
        Layout split:
        - Mobile: board sits in the top band above the pitch card
        - Desktop: board owns the right half; left half stays clear for copy
      */}
      <div className="absolute inset-x-0 top-0 flex h-[40vh] items-center justify-center px-2 pt-2 sm:h-[36vh] sm:px-3 lg:inset-y-3 lg:left-[48%] lg:right-3 lg:h-auto lg:justify-center lg:px-0 lg:pt-0 xl:left-[50%] xl:right-5">
        <div
          ref={board}
          className="relative grid aspect-square h-full max-h-full w-auto max-w-full gap-[3px] border-[3px] border-edge-bright bg-[#020b16] p-[3px] shadow-pixel-lg"
          style={{
            gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
          }}
        >
          {BOARD_TILES.map((tile) => {
            const { row, col, edge } = tilePlacement(tile.index);
            return (
              <HeroTile
                key={tile.index}
                tile={tile}
                edge={edge}
                style={{ gridRow: row, gridColumn: col }}
              />
            );
          })}

          <div
            style={{ gridArea: `2 / 2 / ${BOARD_SIZE} / ${BOARD_SIZE}` }}
            className="relative overflow-hidden border border-void/80 bg-ink"
          >
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, var(--color-gold) 0 8px, transparent 8px 16px)",
              }}
            />
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, var(--color-edge-bright) 1px, transparent 1px), linear-gradient(to bottom, var(--color-edge-bright) 1px, transparent 1px)",
                backgroundSize: "calc(100% / 11) calc(100% / 11)",
              }}
            />

            {/* Dice centered in the board's open middle — clear of the left pitch */}
            <div className="absolute inset-0 z-20 flex items-center justify-center scale-[0.62] sm:scale-[0.72] lg:scale-[0.88] xl:scale-100">
              <HeroDice />
            </div>
          </div>

          {[1, 2, 3, 4].map((seat) => (
            <div
              key={seat}
              data-hero-pawn
              data-tile={String((seat - 1) * (BOARD_SIZE - 1))}
              className="absolute z-30 w-[min(9vw,2.8rem)] will-change-transform sm:w-[min(6vw,3.2rem)]"
              style={{ left: "50%", top: "50%" }}
            >
              <div data-pawn-body className="will-change-transform">
                <PixelArt sprite={pawnSprite(seat)} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroTile({
  tile,
  edge,
  style,
}: {
  tile: BoardTile;
  edge: TileEdge;
  style: React.CSSProperties;
}) {
  const group = groupFor(tile);
  const corner = isCorner(tile.index);
  const isCountry = tile.kind === "country";

  return (
    <div
      data-hero-tile
      data-index={tile.index}
      style={{
        ...style,
        backgroundColor: tileTone(tile, corner),
      }}
      className="relative flex min-h-0 min-w-0 flex-col items-center justify-center overflow-hidden outline outline-1 outline-void"
    >
      {group && isCountry ? (
        <span
          aria-hidden
          className={cn("absolute z-[1]", BAR_POSITION[edge])}
          style={{ backgroundColor: group.color }}
        />
      ) : null}

      {corner ? (
        <span className="relative z-[2] px-0.5 text-center font-pixel text-[clamp(5px,0.85vw,11px)] leading-none text-void">
          {CORNER_LABEL[tile.kind] ?? tile.short}
        </span>
      ) : (
        <span
          className={cn(
            "relative z-[2] max-w-full truncate px-0.5 text-center font-pixel leading-none text-void/85",
            edge === "left" || edge === "right"
              ? "text-[clamp(3px,0.55vw,7px)] [writing-mode:vertical-rl] rotate-180"
              : "text-[clamp(3px,0.55vw,7px)]",
          )}
        >
          {tile.short}
        </span>
      )}
    </div>
  );
}

function tileTone(tile: BoardTile, corner: boolean): string {
  if (corner) return "color-mix(in srgb, var(--color-gold) 26%, #fff3d6)";
  switch (tile.kind) {
    case "chance":
      return "color-mix(in srgb, var(--color-ludo) 30%, #fff3d6)";
    case "treasury":
      return "color-mix(in srgb, var(--color-monopoly) 30%, #fff3d6)";
    case "airport":
      return "color-mix(in srgb, var(--color-edge) 28%, #fff3d6)";
    case "burn":
      return "color-mix(in srgb, var(--color-danger) 26%, #fff3d6)";
    default:
      return "#fff3d6";
  }
}
