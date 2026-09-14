import type { Metadata } from "next";

import { SiteHeader } from "@/components/layout/site-header";
import { WalletBoard } from "@/components/wallet/wallet-board";

export const metadata: Metadata = {
  title: "Deposit & Withdraw | BOARD",
  description:
    "Deposit BOARD tokens to your platform balance or withdraw winnings on Robinhood Chain.",
};

export default function WalletPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <WalletBoard />
      </main>
    </>
  );
}
