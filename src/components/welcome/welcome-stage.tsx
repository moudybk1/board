"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

import { PixelArt } from "@/components/game/pixel-art";
import { HeroDice } from "@/components/welcome/hero-dice";
import { pawnSprite } from "@/lib/game/pawn-sprite";
import { prefersReducedMotion } from "@/lib/motion/gsap-config";
import { cn } from "@/lib/utils";

const TILE_BANDS = [
  "#c44b2f",
  "#c44b2f",
  "#87b8d8",
  "#87b8d8",
  "#d4a017",
  "#d4a017",
  "#2f8a4a",
  "#2f8a4a",
  "#3b5bdb",
  "#3b5bdb",
];

type HopJob = { seat: number; steps: number };

/**
 * Full-bleed Monopoly track. Dice settle → queued pawn hops.
 * Outer node owns board position; inner node owns hop squash (no transform fights).
 */
export function WelcomeStage({ className }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = root.current;
    if (!node || prefersReducedMotion()) return;

    const positions = perimeterPoints(40);
    const pawns = Array.from(
      node.querySelectorAll<HTMLElement>("[data-hero-pawn]"),
    );
    const tiles = node.querySelectorAll<HTMLElement>("[data-hero-tile]");

    const queue: HopJob[] = [];
    let busy = false;
    let leadSeat = 0;
    const tweens: gsap.core.Animation[] = [];

    pawns.forEach((pawn, seat) => {
      const start = seat * 10;
      const point = positions[start % positions.length];
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
        pawn.dataset.bob = "1";
      }
    });

    const flashTile = (index: number) => {
      const tile = tiles[index % tiles.length];
      if (!tile) return;
      gsap.fromTo(
        tile,
        { filter: "brightness(1)" },
        {
          filter: "brightness(2.1)",
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
        const idx = (from + step) % positions.length;
        const next = positions[idx];
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

    node.addEventListener("hero-dice-settle", onRoll);

    return () => {
      node.removeEventListener("hero-dice-settle", onRoll);
      tweens.forEach((t) => t.kill());
      pawns.forEach((p) => {
        gsap.killTweensOf(p);
        const body = p.querySelector<HTMLElement>("[data-pawn-body]");
        if (body) gsap.killTweensOf(body);
      });
      queue.length = 0;
    };
  }, []);

  const cells = perimeterPoints(40);

  return (
    <div
      ref={root}
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      <div className="absolute inset-0 bg-ink" />
      {/* Inner felt fill only — no left readability slab (copy has its own solid panel) */}
      <div className="absolute inset-[9%] bg-surface sm:inset-[8%]" />
      <div className="pointer-events-none absolute inset-[9%] border-2 border-edge sm:inset-[8%]" />

      {cells.map((point, index) => {
        const band = TILE_BANDS[index % TILE_BANDS.length];
        const isCorner = index % 10 === 0;
        return (
          <span
            key={index}
            data-hero-tile
            className="absolute z-[5] border border-void bg-surface-raised"
            style={{
              left: `${point.x}%`,
              top: `${point.y}%`,
              width: isCorner
                ? "min(8.5vw, 3.6rem)"
                : "min(6vw, 2.65rem)",
              height: isCorner
                ? "min(8.5vw, 3.6rem)"
                : "min(6vw, 2.65rem)",
              transform: "translate(-50%, -50%)",
              boxShadow: `inset 0 ${isCorner ? 12 : 8}px 0 0 ${band}`,
            }}
          />
        );
      })}

      <span className="absolute bottom-[2.6%] right-[2.8%] z-[6] font-pixel text-[clamp(9px,1.5vw,13px)] text-gold">
        GO
      </span>
      <span className="absolute bottom-[2.6%] left-[2.8%] z-[6] font-pixel text-[clamp(7px,1.1vw,10px)] text-muted">
        JAIL
      </span>
      <span className="absolute left-[2.8%] top-[2.8%] z-[6] font-pixel text-[clamp(7px,1.1vw,10px)] text-muted">
        FREE
      </span>
      <span className="absolute right-[2.8%] top-[2.8%] z-[6] font-pixel text-[clamp(7px,1.1vw,10px)] text-muted">
        PARK
      </span>

      {/* Single dice instance — right/center of felt on desktop, upper center on mobile */}
      <div className="absolute left-1/2 top-[11%] z-30 -translate-x-1/2 scale-[0.68] sm:scale-[0.85] lg:left-auto lg:right-[9%] lg:top-1/2 lg:translate-x-0 lg:-translate-y-[42%] lg:scale-100 xl:right-[11%]">
        <HeroDice />
      </div>

      {[1, 2, 3, 4].map((seat) => {
        const start = cells[(seat - 1) * 10] ?? cells[0];
        return (
          <div
            key={seat}
            data-hero-pawn
            data-tile={String((seat - 1) * 10)}
            className="absolute z-20 w-[min(11vw,3.4rem)] will-change-transform sm:w-[min(7vw,3.75rem)]"
            style={{
              left: `${start.x}%`,
              top: `${start.y}%`,
            }}
          >
            <div data-pawn-body className="will-change-transform">
              <PixelArt sprite={pawnSprite(seat)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function perimeterPoints(count: number) {
  const inset = 4.5;
  const span = 100 - inset * 2;
  const side = count / 4;
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i < count; i += 1) {
    const s = Math.floor(i / side);
    const t = (i % side) / side;
    if (s === 0) points.push({ x: inset + span * (1 - t), y: 100 - inset });
    else if (s === 1) points.push({ x: inset, y: 100 - inset - span * t });
    else if (s === 2) points.push({ x: inset + span * t, y: inset });
    else points.push({ x: 100 - inset, y: inset + span * t });
  }
  return points;
}
