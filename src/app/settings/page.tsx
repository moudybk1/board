import type { Metadata } from "next";
import Link from "next/link";

import { ProductShell } from "@/components/layout/product-shell";
import { HeroStat, PageHero } from "@/components/layout/page-hero";
import { SettingsBoard } from "@/components/settings/settings-board";
import { PixelButtonLink } from "@/components/ui/pixel-button";

export const metadata: Metadata = {
  title: "Settings | BOARD",
  description: "Display and sound preferences for the BOARD pixel client.",
};

export default function SettingsPage() {
  return (
    <ProductShell accent="mint">
      <PageHero
        title="Settings"
        support="Motion, CRT scanlines, SFX, and music — saved on this device."
        meta={
          <>
            <HeroStat label="Scope" value="This device" />
            <HeroStat label="Look" value="Phosphor" />
          </>
        }
        actions={
          <PixelButtonLink href="/account" variant="ghost" size="md">
            Wallet account
          </PixelButtonLink>
        }
        stage={
          <div className="border-2 border-edge-bright bg-ink/85 p-4 pixel-inset sm:p-5">
            <p className="font-pixel text-[8px] uppercase tracking-widest text-gold">
              Tips
            </p>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
              <li>Reduce motion softens dice hops and idle bobbing.</li>
              <li>Scanlines recreate the CRT cabinet look.</li>
              <li>
                Also on{" "}
                <Link href="/account" className="text-gold hover:underline">
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
