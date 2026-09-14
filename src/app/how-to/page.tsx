import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";
import { HowToSteps } from "@/components/welcome/how-to-steps";
import { WinGoalCompare } from "@/components/welcome/win-goal-compare";
import { HOW_TO_INTRO } from "@/lib/mock/how-to";

export const metadata: Metadata = {
  title: "How to play | BOARD",
  description:
    "Numbered guide: deposit BOARD, pick Monopoly or Ludo, join a four-player room, and win the pot minus a 2% fee.",
};

export default function HowToPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14 md:max-w-4xl">
        <nav className="mb-8 font-pixel text-[9px] uppercase tracking-wide text-faint">
          <Link href="/" className="hover:text-gold">
            Welcome
          </Link>
          <span className="mx-2 text-edge-bright" aria-hidden>
            /
          </span>
          <span className="text-muted">How to play</span>
        </nav>

        <header className="mb-10 border-b-2 border-edge pb-8">
          <p className="font-pixel text-[9px] uppercase tracking-widest text-gold">
            Guide
          </p>
          <h1 className="mt-3 font-pixel text-lg text-parchment text-shadow-pixel sm:text-xl">
            {HOW_TO_INTRO.title}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
            {HOW_TO_INTRO.support}
          </p>
        </header>

        <HowToSteps />
        <WinGoalCompare className="mt-12" />
      </main>
    </>
  );
}
