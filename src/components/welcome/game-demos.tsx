"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

import { PixelArt } from "@/components/game/pixel-art";
import { pawnSprite } from "@/lib/game/pawn-sprite";
import { prefersReducedMotion } from "@/lib/motion/gsap-config";
import { cn } from "@/lib/utils";

/**
 * Living Monopoly perimeter for the landing hero.
 * Pawns hop the track; a die flips on each lap.
 */
export function MonopolyDemo({ className }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = root.current;
    if (!node || prefersReducedMotion()) return;

    const pawns = node.querySelectorAll<HTMLElement>("[data-mnp-pawn]");
    const die = node.querySelector<HTMLElement>("[data-mnp-die]");
    const ring = node.querySelectorAll<HTMLElement>("[data-mnp-cell]");

    const positions = perimeterPoints(40);
    const timelines: gsap.core.Timeline[] = [];

    pawns.forEach((pawn, seat) => {
      const start = seat * 10;
      const point = positions[start % positions.length];
      gsap.set(pawn, {
        left: `${point.x}%`,
        top: `${point.y}%`,
        xPercent: -50,
        yPercent: -50,
      });

      const tl = gsap.timeline({ repeat: -1, delay: seat * 0.35 });
      for (let step = 1; step <= 40; step += 1) {
        const next = positions[(start + step) % positions.length];
        tl.to(pawn, {
          left: `${next.x}%`,
          top: `${next.y}%`,
          duration: 0.16,
          ease: "none",
        }).to(
          pawn,
          {
            y: -6,
            scaleY: 1.2,
            scaleX: 1.05,
            duration: 0.08,
            yoyo: true,
            repeat: 1,
            ease: "power1.out",
          },
          "<",
        );
      }
      timelines.push(tl);
    });

    if (die) {
      const faces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
      const dieTl = gsap.timeline({ repeat: -1, repeatDelay: 1.4 });
      dieTl
        .to(die, {
          rotation: "+=360",
          duration: 0.55,
          ease: "power2.inOut",
          onUpdate: () => {
            die.textContent = faces[Math.floor(Math.random() * 6)];
          },
        })
        .to(die, { scale: 1.15, duration: 0.12, yoyo: true, repeat: 1 });
      timelines.push(dieTl);
    }

    const pulse = gsap.to(ring, {
      opacity: 0.35,
      duration: 1.8,
      stagger: { each: 0.04, repeat: -1, yoyo: true },
      ease: "sine.inOut",
    });

    return () => {
      timelines.forEach((tl) => tl.kill());
      pulse.kill();
    };
  }, []);

  return (
    <div
      ref={root}
      className={cn(
        "relative aspect-square w-full overflow-hidden border-2 border-monopoly/50 bg-ink",
        className,
      )}
      aria-hidden
    >
      <div className="absolute inset-[18%] border border-monopoly/40 bg-surface/90" />
      <p className="absolute inset-0 flex items-center justify-center font-pixel text-[clamp(8px,1.8vw,14px)] text-monopoly">
        MONOPOLY
      </p>

      {perimeterPoints(40).map((point, index) => (
        <span
          key={index}
          data-mnp-cell
          className="absolute size-[5.5%] border border-monopoly/30 bg-surface-raised"
          style={{
            left: `${point.x}%`,
            top: `${point.y}%`,
            transform: "translate(-50%, -50%)",
            opacity: 0.75,
          }}
        />
      ))}

      {[1, 2, 3, 4].map((seat) => (
        <div
          key={seat}
          data-mnp-pawn
          className="absolute z-10 w-[9%] will-change-transform"
        >
          <PixelArt sprite={pawnSprite(seat)} />
        </div>
      ))}

      <div
        data-mnp-die
        className="absolute bottom-[22%] left-1/2 z-20 -translate-x-1/2 border-2 border-edge-bright bg-surface px-2 py-1 font-pixel text-lg text-parchment shadow-pixel-sm"
      >
        ⚄
      </div>
    </div>
  );
}

/**
 * Living Ludo cross: one pawn loops the shared track; yard pads blink.
 */
export function LudoDemo({ className }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = root.current;
    if (!node || prefersReducedMotion()) return;

    const pawn = node.querySelector<HTMLElement>("[data-lud-pawn]");
    const pads = node.querySelectorAll<HTMLElement>("[data-lud-pad]");
    if (!pawn) return;

    const loop = ludoLoopPoints();
    gsap.set(pawn, {
      left: `${loop[0].x}%`,
      top: `${loop[0].y}%`,
      xPercent: -50,
      yPercent: -50,
    });

    const tl = gsap.timeline({ repeat: -1 });
    for (let i = 1; i < loop.length; i += 1) {
      tl.to(pawn, {
        left: `${loop[i].x}%`,
        top: `${loop[i].y}%`,
        duration: 0.14,
        ease: "none",
      }).to(
        pawn,
        {
          y: -5,
          scaleY: 1.18,
          duration: 0.07,
          yoyo: true,
          repeat: 1,
        },
        "<",
      );
    }

    const padPulse = gsap.to(pads, {
      opacity: 0.4,
      duration: 1.1,
      stagger: 0.2,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });

    return () => {
      tl.kill();
      padPulse.kill();
    };
  }, []);

  const yards = [
    { x: 18, y: 82 },
    { x: 18, y: 18 },
    { x: 82, y: 18 },
    { x: 82, y: 82 },
  ];

  return (
    <div
      ref={root}
      className={cn(
        "relative aspect-square w-full overflow-hidden border-2 border-ludo/50 bg-ink",
        className,
      )}
      aria-hidden
    >
      {/* Cross arms */}
      <div className="absolute inset-x-[38%] inset-y-0 bg-surface/90" />
      <div className="absolute inset-x-0 inset-y-[38%] bg-surface/90" />
      <div className="absolute left-1/2 top-1/2 size-[16%] -translate-x-1/2 -translate-y-1/2 border border-ludo/50 bg-ink" />

      {yards.map((yard, index) => (
        <div
          key={index}
          data-lud-pad
          className="absolute size-[22%] border border-edge bg-ludo/15"
          style={{
            left: `${yard.x}%`,
            top: `${yard.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}

      <p className="absolute left-1/2 top-[46%] -translate-x-1/2 font-pixel text-[clamp(8px,1.6vw,12px)] text-ludo/90">
        LUDO
      </p>

      <div
        data-lud-pawn
        className="absolute z-10 w-[11%] will-change-transform"
      >
        <PixelArt sprite={pawnSprite(3)} />
      </div>
    </div>
  );
}

/** 40 points around a square ring (Monopoly-style perimeter). */
function perimeterPoints(count: number) {
  const inset = 8;
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

/** Simplified Ludo loop around the cross (CCW from bottom entry). */
function ludoLoopPoints() {
  const pts: { x: number; y: number }[] = [];
  const push = (x: number, y: number) => pts.push({ x, y });

  // Bottom left entry up the left of bottom arm, around clockwise-ish for visual
  for (let y = 78; y >= 42; y -= 6) push(42, y);
  for (let x = 42; x >= 8; x -= 6) push(x, 42);
  for (let y = 42; y >= 8; y -= 6) push(8, y);
  for (let x = 8; x <= 42; x += 6) push(x, 8);
  for (let y = 8; y <= 42; y += 6) push(42, y);
  for (let x = 42; x <= 92; x += 6) push(x, 42);
  for (let y = 42; y <= 92; y += 6) push(92, y);
  for (let x = 92; x >= 58; x -= 6) push(x, 92);
  for (let y = 92; y >= 58; y -= 6) push(58, y);
  for (let x = 58; x >= 42; x -= 6) push(x, 58);

  return pts;
}
