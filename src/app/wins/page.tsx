import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";
import { WinHistoryList } from "@/components/wins/win-history-list";
import { PixelButtonLink } from "@/components/ui/pixel-button";

export const metadata: Metadata = {
  title: "Win history | BOARD",
  description:
    "Past room settlements with net payout after the 2% fee, treasury, and burn.",
};

export default function WinsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <nav className="mb-8 font-pixel text-[9px] uppercase tracking-wide text-faint">
          <Link href="/" className="hover:text-gold">
            Welcome
          </Link>
          <span className="mx-2 text-edge-bright" aria-hidden>
            /
          </span>
          <span className="text-muted">Wins</span>
        </nav>

        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-pixel text-[9px] uppercase tracking-widest text-gold">
              Prizes
            </p>
            <h1 className="mt-3 font-pixel text-lg text-parchment text-shadow-pixel sm:text-xl">
              Win history
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
              Settled rooms with net BOARD after the platform fee. Open a row
              for the full treasury / burn split.
            </p>
          </div>
          <PixelButtonLink href="/result" variant="secondary" size="sm">
            Latest result
          </PixelButtonLink>
        </header>

        <WinHistoryList />
      </main>
    </>
  );
}
