import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";
import { WalletConnectPanel } from "@/components/account/wallet-connect-panel";
import { PixelButtonLink } from "@/components/ui/pixel-button";

export const metadata: Metadata = {
  title: "Connect wallet | BOARD",
  description:
    "Connect a Robinhood Chain wallet to deposit and withdraw BOARD tokens.",
};

export default function AccountWalletPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg flex-1 space-y-8 px-4 py-10 sm:px-6 sm:py-14">
        <nav className="font-pixel text-[9px] uppercase tracking-wide text-faint">
          <Link href="/account" className="hover:text-gold">
            Account
          </Link>
          <span className="mx-2 text-edge-bright" aria-hidden>
            /
          </span>
          <span className="text-muted">Wallet</span>
        </nav>

        <header>
          <h1 className="font-pixel text-lg text-parchment text-shadow-pixel">
            Connect wallet
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Link your chain wallet so deposits and withdraws know where BOARD
            should move.
          </p>
        </header>

        <WalletConnectPanel />

        <PixelButtonLink href="/wallet" variant="secondary" size="md">
          Open deposit & withdraw
        </PixelButtonLink>
      </main>
    </>
  );
}
