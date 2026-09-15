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
        "sticky top-0 z-[40] border-b border-edge bg-ink/90 pt-[env(safe-area-inset-top)] backdrop-blur-sm",
        className,
      )}
    >
      <div className="board-container relative flex h-14 items-center sm:h-16">
        <Link
          href="/"
          aria-label="BOARD home"
          className="relative z-10 flex min-w-0 shrink items-center py-1"
        >
          <BoardLogo className="text-[11px] tracking-[0.12em] sm:text-sm" />
        </Link>

        <nav
          aria-label="Primary desktop"
          className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 lg:flex"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-muted transition-colors hover:text-parchment"
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
              className="px-3 text-[8px] sm:text-[9px]"
            >
              {loading ? "…" : "Sign in"}
            </SignInButton>
          )}
        </div>
      </div>

      <nav
        aria-label="Primary"
        className="flex justify-center gap-1 overflow-x-auto border-t border-edge px-3 py-2 lg:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="shrink-0 border border-edge bg-surface/50 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide text-muted hover:border-edge-bright hover:text-parchment"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
