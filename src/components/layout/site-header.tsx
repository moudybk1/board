import Link from "next/link";

import { AudioControlsPopover } from "@/components/audio/audio-controls-popover";
import { AudioMuteToggle } from "@/components/audio/audio-mute-toggle";
import { MusicToggle } from "@/components/audio/music-toggle";
import { BoardLogo } from "@/components/layout/board-logo";
import { BalanceWidget } from "@/components/wallet/balance-widget";
import { PixelButtonLink } from "@/components/ui/pixel-button";
import { MOCK_PLAYER } from "@/lib/mock/lobby";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/lobby", label: "Lobby" },
  { href: "/wallet", label: "Wallet" },
  { href: "/wins", label: "Wins" },
  { href: "/how-to", label: "Guide" },
  { href: "/settings", label: "Settings" },
] as const;

export function SiteHeader({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-[40] border-b border-edge bg-ink/90 pt-[env(safe-area-inset-top)] backdrop-blur-sm",
        className,
      )}
    >
      <div className="board-container flex h-14 items-center gap-3 sm:h-16 sm:gap-5">
        <Link href="/" aria-label="BOARD home" className="min-w-0 shrink">
          <BoardLogo className="text-[10px] sm:text-sm" />
        </Link>

        <nav className="ml-1 hidden items-center gap-0.5 lg:flex">
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

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <AudioControlsPopover className="hidden sm:block" />
          <MusicToggle />
          <AudioMuteToggle />
          <BalanceWidget compact className="hidden sm:inline-flex" />

          <PixelButtonLink
            href="/wallet"
            variant="primary"
            size="sm"
            className="px-3 text-[8px] sm:text-[9px]"
          >
            Deposit
          </PixelButtonLink>

          <Link
            href="/account"
            aria-label="Open account"
            className="grid size-8 shrink-0 place-items-center border border-edge-bright bg-surface-raised font-mono text-[10px] text-gold sm:size-9"
            title={MOCK_PLAYER.username}
          >
            {MOCK_PLAYER.username.slice(0, 2).toUpperCase()}
          </Link>
        </div>
      </div>

      <nav
        aria-label="Primary"
        className="flex gap-1 overflow-x-auto border-t border-edge px-3 py-2 lg:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
