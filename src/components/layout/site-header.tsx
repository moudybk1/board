"use client";

import Link from "next/link";

import { ProfileMenu } from "@/components/account/profile-menu";
import { SignInButton } from "@/components/account/sign-in-button";
import { AudioControlsPopover } from "@/components/audio/audio-controls-popover";
import { AudioMuteToggle } from "@/components/audio/audio-mute-toggle";
import { MusicToggle } from "@/components/audio/music-toggle";
import { BoardLogo } from "@/components/layout/board-logo";
import { BalanceWidget } from "@/components/wallet/balance-widget";
import { useAuthMe } from "@/hooks/use-auth-me";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/lobby", label: "Lobby" },
  { href: "/how-to", label: "Guide" },
  { href: "/settings", label: "Settings" },
] as const;

export function SiteHeader({ className }: { className?: string }) {
  const { authenticated, loading } = useAuthMe();

  return (
    <header
      className={cn(
        "sticky top-0 z-[40] px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4",
        className,
      )}
    >
      <div className="board-container">
        <div className="relative flex h-14 items-center rounded-[1.5rem] border-[3px] border-void bg-surface px-3 shadow-pixel sm:h-16 sm:px-4">
          <Link
            href="/"
            aria-label="BOARD home"
            className="relative z-10 flex min-w-0 shrink items-center py-1"
          >
            <BoardLogo className="text-sm tracking-tight sm:text-lg" />
          </Link>

          <nav
            aria-label="Primary desktop"
            className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 lg:flex"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-3.5 py-1.5 font-pixel text-sm font-bold uppercase tracking-wide text-muted transition-colors hover:bg-gold hover:text-void"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="relative z-10 ml-auto flex items-center gap-2 sm:gap-3">
            <AudioControlsPopover className="hidden sm:block" />
            <MusicToggle />
            <AudioMuteToggle />
            {authenticated ? (
              <BalanceWidget compact live className="hidden sm:inline-flex" />
            ) : null}

            {authenticated ? (
              <ProfileMenu />
            ) : (
              <SignInButton
                variant="primary"
                size="sm"
                className="px-3 text-xs sm:text-sm"
              >
                {loading ? "…" : "Sign in"}
              </SignInButton>
            )}
          </div>
        </div>
      </div>

      <nav
        aria-label="Primary"
        className="mt-2 flex justify-center gap-1.5 overflow-x-auto px-1 pb-1 lg:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="shrink-0 rounded-full border-[3px] border-void bg-surface px-3.5 py-1.5 font-pixel text-xs font-bold uppercase tracking-wide text-muted shadow-pixel-sm hover:bg-gold hover:text-void"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
