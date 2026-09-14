import type { Metadata } from "next";

import { SiteHeader } from "@/components/layout/site-header";
import { OnboardingPath } from "@/components/welcome/onboarding-path";
import { TokenRoadmapSection } from "@/components/welcome/token-roadmap-section";
import { WelcomeHero } from "@/components/welcome/welcome-hero";
import { WelcomeHighlights } from "@/components/welcome/welcome-highlights";

export const metadata: Metadata = {
  title: "BOARD | Pixel Monopoly & Ludo with real pots",
  description:
    "Roll, buy, capture, cash out. Four-player Monopoly and Ludo in phosphor pixel art on Robinhood Chain.",
};

export default function Home() {
  return (
    <div className="board-atmosphere flex min-h-full flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <WelcomeHero />
        <WelcomeHighlights />
        <OnboardingPath />
        <TokenRoadmapSection />
      </main>
    </div>
  );
}
