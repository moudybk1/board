import type { Metadata } from "next";
import Link from "next/link";

import { ProductShell } from "@/components/layout/product-shell";
import { HeroStat, PageHero } from "@/components/layout/page-hero";
import { SettingsBoard } from "@/components/settings/settings-board";
import { PixelButtonLink } from "@/components/ui/pixel-button";

export const metadata: Metadata = {
  title: "Settings | BOARD",
  description: "Display and sound preferences for the BOARD cartoon table.",
};

export default function SettingsPage() {
  return (
    <ProductShell accent="mint">
      <PageHero
        title="Settings"
        support="Motion, confetti dots, SFX, and music - saved on this device."
        meta={
          <>
            <HeroStat label="Scope" value="This device" />
            <HeroStat label="Look" value="Cartoon" />
          </>
        }
        actions={
          <PixelButtonLink href="/account" variant="ghost" size="md">
            Wallet account
          </PixelButtonLink>
        }
        stage={
          <div className="rounded-[1.25rem] border-[3px] border-void bg-cream p-4 sm:p-5">
            <p className="font-pixel text-xs font-bold uppercase tracking-wide text-gold-deep">
              Tips
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
              <li>Reduce motion softens dice hops and idle bobbing.</li>
              <li>Confetti dots sprinkle candy over the playground.</li>
              <li>
                Also on{" "}
                <Link href="/account" className="font-bold text-gold-deep hover:underline">
                  Account
                </Link>
                .
              </li>
            </ul>
          </div>
        }
      />

      <div data-reveal>
        <SettingsBoard />
      </div>
    </ProductShell>
  );
}
