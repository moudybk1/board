import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";
import { BalanceWidget } from "@/components/wallet/balance-widget";
import { NetworkStatusBanner } from "@/components/wallet/network-status-banner";
import { PixelButtonLink } from "@/components/ui/pixel-button";
import {
  PixelPanel,
  PixelPanelHeader,
  PixelPanelTitle,
} from "@/components/ui/pixel-panel";
import { MOCK_ACCOUNT, PIXEL_AVATARS } from "@/lib/mock/account";
import { LogoutButton } from "@/components/account/logout-button";

export const metadata: Metadata = {
  title: "Account & wallet | BOARD",
  description:
    "Manage your BOARD profile, connected wallet, balance, and session.",
};

export default function AccountPage() {
  const account = MOCK_ACCOUNT;
  const avatar =
    PIXEL_AVATARS.find((item) => item.id === account.avatarId) ??
    PIXEL_AVATARS[0];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-10 sm:px-6 sm:py-14">
        <header>
          <p className="font-pixel text-[9px] uppercase tracking-widest text-gold">
            Account
          </p>
          <h1 className="mt-3 font-pixel text-lg text-parchment text-shadow-pixel sm:text-xl">
            Account & wallet
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Profile, Robinhood Chain wallet, and platform balance in one place.
          </p>
        </header>

        <PixelPanel tone="raised" className="overflow-hidden">
          <PixelPanelHeader>
            <PixelPanelTitle>Profile</PixelPanelTitle>
            <Link
              href="/account/profile"
              className="font-pixel text-[8px] uppercase text-gold hover:underline"
            >
              Edit →
            </Link>
          </PixelPanelHeader>
          <div className="flex items-center gap-4 p-5">
            <span
              aria-hidden
              className="pixel-corners grid size-14 place-items-center border-2 border-edge-bright font-pixel text-sm text-void"
              style={{ backgroundColor: avatar.tint }}
            >
              {account.username.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <p className="font-pixel text-sm text-parchment">
                {account.username}
              </p>
              <p className="mt-1 text-xs text-muted">{account.email}</p>
              <p className="mt-2 font-pixel text-[8px] uppercase text-faint">
                {avatar.label}
              </p>
            </div>
          </div>
        </PixelPanel>

        <NetworkStatusBanner />

        <BalanceWidget />

        <div className="grid gap-3 sm:grid-cols-2">
          <PixelButtonLink href="/wallet" size="lg" className="justify-center">
            Deposit & withdraw
          </PixelButtonLink>
          <PixelButtonLink
            href="/account/wallet"
            variant="secondary"
            size="lg"
            className="justify-center"
          >
            Connect wallet
          </PixelButtonLink>
          <PixelButtonLink
            href="/wins"
            variant="outline"
            size="md"
            className="justify-center"
          >
            Win history
          </PixelButtonLink>
          <PixelButtonLink
            href="/auth/login"
            variant="outline"
            size="md"
            className="justify-center"
          >
            Sign in
          </PixelButtonLink>
        </div>

        <div className="border-t-2 border-edge pt-6">
          <LogoutButton />
        </div>
      </main>
    </>
  );
}
