import type { Metadata } from "next";

import { SiteHeader } from "@/components/layout/site-header";
import { WinResultBoard } from "@/components/wins/win-result-board";
import { MOCK_WIN_RESULT } from "@/lib/mock/wins";

export const metadata: Metadata = {
  title: "Match result | BOARD",
  description:
    "Winner payout after the 2% fee: treasury share, burn, and net BOARD credited.",
};

export default function ResultPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col px-4 py-10 sm:px-6 sm:py-14">
        <WinResultBoard result={MOCK_WIN_RESULT} />
      </main>
    </>
  );
}
