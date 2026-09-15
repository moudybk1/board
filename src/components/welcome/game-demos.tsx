"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

import { PixelArt } from "@/components/game/pixel-art";
import { pawnSprite } from "@/lib/game/pawn-sprite";
import { prefersReducedMotion } from "@/lib/motion/gsap-config";
import { cn } from "@/lib/utils";

const DIE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"] as const;

/**
 * Flat 2D Monopoly board — turn loop with smooth pawn travel.
 */
export function MonopolyDemo({ className }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = root.current;
    if (!node || prefersReducedMotion()) return;

    const pawns = Array.from(
      node.querySelectorAll<HTMLElement>("[data-mnp-pawn]"),
    );
    const die = node.querySelector<HTMLElement>("[data-mnp-die]");
    const cells = Array.from(
      node.querySelectorAll<HTMLElement>("[data-mnp-cell]"),
    );
    const banner = node.querySelector<HTMLElement>("[data-mnp-banner]");
    const positions = perimeterPoints(40);
    const seatIndex = [0, 10, 20, 30];

    pawns.forEach((pawn, seat) => {
      const point = positions[seatIndex[seat]];
      gsap.set(pawn, {
        left: `${point.x}%`,
        top: `${point.y}%`,
        xPercent: -50,
        yPercent: -50,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        force3D: true,
      });
    });

    let cancelled = false;
    const master = gsap.timeline({ repeat: -1, repeatDelay: 0.45 });

    const clearCellGlow = () => {
      cells.forEach((cell) => {
        gsap.set(cell, { backgroundColor: "rgba(26,33,30,1)" });
      });
    };

    master.add(() => {
      seatIndex[0] = 0;
      seatIndex[1] = 10;
      seatIndex[2] = 20;
      seatIndex[3] = 30;
      pawns.forEach((pawn, seat) => {
        const point = positions[seatIndex[seat]];
        gsap.set(pawn, {
          left: `${point.x}%`,
          top: `${point.y}%`,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
        });
      });
      clearCellGlow();
      if (banner) banner.textContent = "MONOPOLY";
    });

    const rollDie = (value: number) => {
      if (!die) return;
      master.to(die, {
        keyframes: [
          { x: -4, rotation: -14, duration: 0.06 },
          { x: 5, rotation: 12, duration: 0.06 },
          { x: -5, rotation: -16, duration: 0.06 },
          { x: 4, rotation: 10, duration: 0.06 },
          { x: 0, rotation: 0, duration: 0.08 },
        ],
        ease: "power1.inOut",
        onUpdate: () => {
          die.textContent = DIE_FACES[Math.floor(Math.random() * 6)];
        },
      });
      master.add(() => {
        die.textContent = DIE_FACES[value - 1];
      });
      master.to(die, {
        scale: 1.18,
        duration: 0.16,
        yoyo: true,
        repeat: 1,
        ease: "power2.out",
      });
    };

    const movePawn = (pawn: HTMLElement, from: number, steps: number) => {
      for (let s = 1; s <= steps; s += 1) {
        const idx = (from + s) % positions.length;
        const next = positions[idx];
        const cell = cells[idx];

        master.add(() => {
          if (cell) {
            gsap.to(cell, {
              backgroundColor: "rgba(62,201,176,0.55)",
              duration: 0.12,
              ease: "power1.out",
            });
          }
        });

        // Smooth glide between tiles + soft hop arc
        master.to(pawn, {
          left: `${next.x}%`,
          top: `${next.y}%`,
          duration: 0.28,
          ease: "power2.inOut",
        });
        master.to(
          pawn,
          {
            y: -10,
            scaleY: 1.08,
            scaleX: 0.94,
            duration: 0.14,
            ease: "power2.out",
            yoyo: true,
            repeat: 1,
          },
          "<",
        );

        if (cell) {
          master.to(
            cell,
            {
              backgroundColor: "rgba(26,33,30,1)",
              duration: 0.2,
              ease: "power1.in",
            },
            ">-0.08",
          );
        }
      }
    };

    for (let seat = 0; seat < 4; seat += 1) {
      const pawn = pawns[seat];
      if (!pawn) continue;

      const roll = 2 + ((seat * 3 + 1) % 5);

      master.add(() => {
        if (cancelled) return;
        clearCellGlow();
        pawns.forEach((p, i) => {
          gsap.to(p, {
            opacity: i === seat ? 1 : 0.4,
            duration: 0.25,
            ease: "power2.out",
          });
        });
        if (banner) {
          banner.textContent = `P${seat + 1} · ${roll}`;
          gsap.fromTo(
            banner,
            { opacity: 0, y: 6 },
            { opacity: 1, y: 0, duration: 0.28, ease: "power2.out" },
          );
        }
      });

      rollDie(roll);
      movePawn(pawn, seatIndex[seat], roll);
      seatIndex[seat] = (seatIndex[seat] + roll) % positions.length;
      master.to({}, { duration: 0.3 });
    }

    master.add(() => {
      pawns.forEach((p) => {
        gsap.to(p, { opacity: 1, duration: 0.25, ease: "power2.out" });
      });
      if (banner) banner.textContent = "MONOPOLY";
      clearCellGlow();
    });

    return () => {
      cancelled = true;
      master.kill();
      clearCellGlow();
    };
  }, []);

  return (
    <div
      ref={root}
      className={cn(
        "relative aspect-square w-full overflow-hidden border-2 border-monopoly/60 bg-ink shadow-pixel-lg",
        className,
      )}
      aria-hidden
    >
      <div className="absolute inset-[17%] border-2 border-monopoly/40 bg-surface" />
      <p
        data-mnp-banner
        className="absolute inset-0 z-[1] flex items-center justify-center font-pixel text-[clamp(8px,1.7vw,13px)] text-monopoly text-shadow-pixel"
      >
        MONOPOLY
      </p>

      {perimeterPoints(40).map((point, index) => (
        <span
          key={index}
          data-mnp-cell
          className="absolute size-[5.5%] border border-monopoly/40 bg-surface-raised"
          style={{
            left: `${point.x}%`,
            top: `${point.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}

      {[1, 2, 3, 4].map((seat) => (
        <div
          key={seat}
          data-mnp-pawn
          className="absolute z-10 w-[10%] will-change-transform drop-shadow-[2px_2px_0_rgba(0,0,0,0.7)]"
        >
          <PixelArt sprite={pawnSprite(seat)} />
        </div>
      ))}

      <div
        data-mnp-die
        className="absolute bottom-[18%] left-1/2 z-20 -translate-x-1/2 border-2 border-edge-bright bg-surface px-2 py-1 font-pixel text-lg text-parchment shadow-pixel-sm will-change-transform"
      >
        ⚄
      </div>
    </div>
  );
}

/**
 * Flat 2D Ludo board — continuous smooth race around the cross.
 */
export function LudoDemo({ className }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = root.current;
    if (!node || prefersReducedMotion()) return;

    const racer = node.querySelector<HTMLElement>("[data-lud-racer]");
    const idle = Array.from(
      node.querySelectorAll<HTMLElement>("[data-lud-idle]"),
    );
    const pads = Array.from(
      node.querySelectorAll<HTMLElement>("[data-lud-pad]"),
    );
    const sparks = Array.from(
      node.querySelectorAll<HTMLElement>("[data-lud-spark]"),
    );
    const home = node.querySelector<HTMLElement>("[data-lud-home]");
    const cleanups: Array<() => void> = [];
    const loop = ludoLoopPoints();

    idle.forEach((pawn, i) => {
      const bob = gsap.to(pawn, {
        y: -5,
        duration: 0.9 + i * 0.12,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        delay: i * 0.2,
      });
      cleanups.push(() => bob.kill());
    });

    pads.forEach((pad, i) => {
      const pulse = gsap.to(pad, {
        opacity: 0.55,
        duration: 1.1,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        delay: i * 0.22,
      });
      cleanups.push(() => pulse.kill());
    });

    if (racer) {
      gsap.set(racer, {
        left: `${loop[0].x}%`,
        top: `${loop[0].y}%`,
        xPercent: -50,
        yPercent: -50,
        opacity: 1,
        force3D: true,
      });

      const race = gsap.timeline({ repeat: -1, repeatDelay: 0.55 });

      race.to(racer, {
        scale: 1.12,
        duration: 0.22,
        yoyo: true,
        repeat: 1,
        ease: "power2.out",
      });

      for (let i = 1; i < loop.length; i += 1) {
        const spark = sparks[i % sparks.length];
        const next = loop[i];

        race.to(racer, {
          left: `${next.x}%`,
          top: `${next.y}%`,
          duration: 0.15,
          ease: "sine.inOut",
        });
        race.to(
          racer,
          {
            y: -8,
            duration: 0.075,
            ease: "power2.out",
            yoyo: true,
            repeat: 1,
          },
          "<",
        );

        if (spark && i % 2 === 0) {
          race.fromTo(
            spark,
            {
              left: `${next.x}%`,
              top: `${next.y}%`,
              opacity: 0.9,
              scale: 0.6,
            },
            {
              opacity: 0,
              scale: 1.8,
              duration: 0.45,
              ease: "power2.out",
            },
            "<0.02",
          );
        }
      }

      if (home) {
        race.to(home, {
          scale: 1.14,
          borderColor: "rgba(255,122,89,0.95)",
          duration: 0.22,
          yoyo: true,
          repeat: 3,
          ease: "power2.inOut",
        });
      }

      race.to(racer, {
        opacity: 0,
        scale: 0.85,
        duration: 0.3,
        ease: "power2.in",
      });
      race.set(racer, {
        left: `${loop[0].x}%`,
        top: `${loop[0].y}%`,
        scale: 1,
        opacity: 1,
        y: 0,
      });

      cleanups.push(() => race.kill());
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  const yards = [
    { x: 18, y: 82, seat: 1, tone: "bg-ludo/30 border-ludo/55" },
    { x: 18, y: 18, seat: 2, tone: "bg-monopoly/25 border-monopoly/50" },
    { x: 82, y: 18, seat: 4, tone: "bg-gold/20 border-gold/50" },
    { x: 82, y: 82, seat: 3, tone: "bg-danger/22 border-danger/50" },
  ];

  return (
    <div
      ref={root}
      className={cn(
        "relative aspect-square w-full overflow-hidden border-2 border-ludo/60 bg-ink shadow-pixel-lg",
        className,
      )}
      aria-hidden
    >
      <div className="absolute inset-x-[38%] inset-y-0 bg-surface" />
      <div className="absolute inset-x-0 inset-y-[38%] bg-surface" />
      <div
        data-lud-home
        className="absolute left-1/2 top-1/2 size-[16%] -translate-x-1/2 -translate-y-1/2 border-2 border-ludo/60 bg-ink"
      />
      <p className="absolute left-1/2 top-[46%] z-[1] -translate-x-1/2 font-pixel text-[clamp(8px,1.5vw,12px)] text-ludo text-shadow-pixel">
        LUDO
      </p>

      {ludoLoopPoints()
        .filter((_, i) => i % 2 === 0)
        .map((dot, index) => (
          <span
            key={index}
            className="absolute size-[3.5%] bg-ludo/25"
            style={{
              left: `${dot.x}%`,
              top: `${dot.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}

      {Array.from({ length: 8 }).map((_, i) => (
        <span
          key={`spark-${i}`}
          data-lud-spark
          className="pointer-events-none absolute z-20 size-2 rounded-sm bg-gold opacity-0"
          style={{ transform: "translate(-50%, -50%)" }}
        />
      ))}

      {yards.map((yard) => (
        <div
          key={yard.seat}
          data-lud-pad
          className={cn("absolute size-[22%] border-2", yard.tone)}
          style={{
            left: `${yard.x}%`,
            top: `${yard.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            data-lud-idle
            className="absolute left-1/2 top-1/2 w-[42%] -translate-x-1/2 -translate-y-1/2 will-change-transform"
          >
            <PixelArt sprite={pawnSprite(yard.seat)} />
          </div>
        </div>
      ))}

      <div
        data-lud-racer
        className="absolute z-30 w-[12%] will-change-transform drop-shadow-[2px_2px_0_rgba(0,0,0,0.75)]"
      >
        <PixelArt sprite={pawnSprite(1)} />
      </div>
    </div>
  );
}

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

/** Denser path for smoother Ludo travel. */
function ludoLoopPoints() {
  const pts: { x: number; y: number }[] = [];
  const push = (x: number, y: number) => pts.push({ x, y });
  const step = 3;

  for (let y = 78; y >= 42; y -= step) push(42, y);
  for (let x = 42; x >= 8; x -= step) push(x, 42);
  for (let y = 42; y >= 8; y -= step) push(8, y);
  for (let x = 8; x <= 42; x += step) push(x, 8);
  for (let y = 8; y <= 42; y += step) push(42, y);
  for (let x = 42; x <= 92; x += step) push(x, 42);
  for (let y = 42; y <= 92; y += step) push(92, y);
  for (let x = 92; x >= 58; x -= step) push(x, 92);
  for (let y = 92; y >= 58; y -= step) push(58, y);
  for (let x = 58; x >= 42; x -= step) push(x, 58);

  return pts;
}
