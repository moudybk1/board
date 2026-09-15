"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import Link from "next/link";

import { LudoDemo, MonopolyDemo } from "@/components/welcome/game-demos";
import { PixelButtonLink } from "@/components/ui/pixel-button";
import { WELCOME_HIGHLIGHTS } from "@/lib/mock/welcome";
import { prefersReducedMotion } from "@/lib/motion/gsap-config";
import { cn } from "@/lib/utils";

const MODES = [
  {
    id: "monopoly",
    title: "Monopoly",
    tag: "World Tour",
    accent: "text-monopoly border-monopoly/50",
    body: "Buy cities, collect rent, bankrupt the table. Pawns hop the perimeter one tile at a time.",
    href: "/lobby",
    Demo: MonopolyDemo,
  },
  {
    id: "ludo",
    title: "Ludo",
    tag: "Four colours",
    accent: "text-ludo border-ludo/50",
    body: "Roll a 6 to leave the yard. Capture rivals, stack blockades, race every pawn home.",
    href: "/lobby",
    Demo: LudoDemo,
  },
] as const;

/**
 * Asymmetric game-mode showcase with live board loops (not a three-card grid).
 */
export function WelcomeHighlights({ className }: { className?: string }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = root.current;
    if (!node || prefersReducedMotion()) return;

    const rows = node.querySelectorAll<HTMLElement>("[data-mode-row]");
    const tween = gsap.fromTo(
      rows,
      { opacity: 0, y: 24 },
      {
        opacity: 1,
        y: 0,
        duration: 0.55,
        stagger: 0.12,
        ease: "power2.out",
        scrollTrigger: undefined,
      },
    );

    return () => {
      tween.kill();
    };
  }, []);

  return (
    <section
      ref={root}
      aria-labelledby="welcome-modes"
      className={cn("border-t border-edge bg-void/40 py-16 sm:py-24", className)}
    >
      <div className="board-container">
        <div className="mb-12 flex flex-col gap-4 sm:mb-16 sm:flex-row sm:items-end sm:justify-between">
          <h2
            id="welcome-modes"
            className="max-w-[18ch] text-sm leading-snug text-parchment sm:text-base"
          >
            Two tables. Same pot fight.
          </h2>
          <p className="max-w-[40ch] text-[9px] leading-relaxed text-muted sm:text-[10px]">
            Four seats, one survivor. Watch the boards breathe, then take a
            chair in the lobby.
          </p>
        </div>

        <div className="space-y-16 sm:space-y-24">
          {MODES.map((mode, index) => (
            <article
              key={mode.id}
              data-mode-row
              className={cn(
                "grid items-center gap-10 overflow-visible lg:grid-cols-2 lg:gap-14",
                index % 2 === 1 && "lg:[&>*:first-child]:order-2",
              )}
            >
              <div className="relative mx-auto w-full max-w-sm lg:max-w-md">
                <div className="relative overflow-visible rounded-none border-2 border-edge-bright bg-void/50 p-4 shadow-pixel-lg pixel-inset sm:p-5">
                  <div
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute inset-x-8 bottom-3 h-8 rounded-[100%] blur-xl",
                      mode.id === "monopoly" ? "bg-monopoly/30" : "bg-ludo/30",
                    )}
                  />
                  <mode.Demo className="relative z-[1]" />
                </div>
                <span
                  className={cn(
                    "absolute -bottom-3 left-6 z-10 border-2 bg-ink px-3 py-1 font-pixel text-[9px] uppercase shadow-pixel-sm",
                    mode.accent,
                  )}
                >
                  {mode.tag}
                </span>
              </div>

              <div className="max-w-md">
                <h3
                  className={cn(
                    "font-pixel text-xs sm:text-sm",
                    mode.id === "monopoly" ? "text-monopoly" : "text-ludo",
                  )}
                >
                  {mode.title}
                </h3>
                <p className="mt-4 text-[9px] leading-relaxed text-muted sm:text-[10px]">
                  {mode.body}
                </p>
                <PixelButtonLink
                  href={mode.href}
                  variant={mode.id === "monopoly" ? "monopoly" : "ludo"}
                  size="md"
                  className="mt-6"
                >
                  Play {mode.title}
                </PixelButtonLink>
              </div>
            </article>
          ))}
        </div>

        <ul className="mt-20 grid gap-6 border-t border-edge pt-10 sm:grid-cols-3">
          {WELCOME_HIGHLIGHTS.map((item) => (
            <li key={item.id}>
              <h3 className="text-[10px] uppercase tracking-wider text-gold">
                {item.title}
              </h3>
              <p className="mt-2 text-[9px] leading-relaxed text-muted">
                {item.body}
              </p>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-center text-[9px] text-faint">
          New here?{" "}
          <Link href="/how-to" className="text-gold underline-offset-4 hover:underline">
            How to play
          </Link>
          {" · "}
          <Link href="/rules" className="text-gold underline-offset-4 hover:underline">
            House rules
          </Link>
        </p>
      </div>
    </section>
  );
}
