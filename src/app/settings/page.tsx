import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";
import { SettingsBoard } from "@/components/settings/settings-board";
import { PixelHeading, PixelLabel } from "@/components/ui";

export const metadata: Metadata = {
  title: "Settings | BOARD",
  description: "Display and sound preferences for the BOARD pixel client.",
};

export default function SettingsPage() {
  return (
    <div className="board-atmosphere flex min-h-full flex-col">
      <SiteHeader />
      <main className="board-container flex-1 py-8 sm:py-10">
        <div className="mb-8 max-w-2xl">
          <PixelLabel>Preferences</PixelLabel>
          <PixelHeading as="h1" size="xl" className="mt-2">
            Settings
          </PixelHeading>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Tune motion, CRT scanlines, sound effects, and background music.
            Changes stay on this device.
          </p>
          <p className="mt-2 text-xs text-faint">
            Also reachable from{" "}
            <Link href="/account" className="text-gold hover:underline">
              Account
            </Link>
            .
          </p>
        </div>
        <SettingsBoard />
      </main>
    </div>
  );
}
