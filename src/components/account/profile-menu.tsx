"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDisconnect } from "wagmi";

import { PixelButton } from "@/components/ui/pixel-button";
import { useAuthMe } from "@/hooks/use-auth-me";
import { usePlatformWallet } from "@/hooks/use-platform-wallet";
import { clearBoardSession } from "@/lib/auth/session";
import { playSfx } from "@/lib/audio/audio-manager";
import {
  formatAge,
  formatBoard,
  formatBoardCompact,
  cn,
} from "@/lib/utils";
import { shortenAddress } from "@/lib/wallet/chains";

type RecentWin = {
  id: string;
  gameType: "monopoly" | "ludo" | string;
  netPayout: number;
  settledAt: string;
  status: string;
};

/**
 * Profile avatar button + dropdown: balance, recent games, sign out.
 */
export function ProfileMenu({ className }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { disconnect } = useDisconnect();
  const { user, wallet, loading: authLoading, refresh } = useAuthMe();
  const { balance, loading: balanceLoading } = usePlatformWallet({
    enabled: true,
    pollMs: 30_000,
  });

  const [open, setOpen] = useState(false);
  const [wins, setWins] = useState<RecentWin[]>([]);
  const [winsLoading, setWinsLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const address = wallet?.address;
  const label = address ? shortenAddress(address) : "Account";
  const available = balance?.available ?? user?.balance ?? 0;
  const locked = balance?.locked ?? 0;

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setWinsLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/wins", { credentials: "include" });
        if (!res.ok) throw new Error("wins");
        const json = (await res.json()) as { wins?: RecentWin[] };
        if (!cancelled) setWins((json.wins ?? []).slice(0, 4));
      } catch {
        if (!cancelled) setWins([]);
      } finally {
        if (!cancelled) setWinsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function signOut() {
    setSigningOut(true);
    playSfx("ui_click");
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch {
      // still clear local
    }
    clearBoardSession();
    try {
      disconnect();
    } catch {
      // ignore
    }
    await refresh();
    setOpen(false);
    setSigningOut(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div ref={root} className={cn("relative", className)}>
      <button
        type="button"
        aria-label="Open profile menu"
        aria-expanded={open}
        aria-haspopup="menu"
        title={authLoading ? "Account" : label}
        onClick={() => {
          playSfx("ui_click");
          setOpen((v) => !v);
        }}
        className="pixel-corners inline-flex max-w-[10.5rem] items-center justify-center border-2 border-gold-deep bg-gold px-3 py-2 font-pixel text-[8px] uppercase text-void shadow-pixel transition-[transform,box-shadow,background-color] duration-100 hover:bg-gold/85 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none sm:text-[9px]"
      >
        <span className="truncate">
          {authLoading ? "…" : label}
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-[55] w-[min(18.5rem,calc(100vw-1.5rem))] border-2 border-edge-bright bg-ink shadow-pixel-lg"
        >
          <div className="border-b-2 border-edge px-3 py-3">
            <p className="font-pixel text-[8px] uppercase tracking-wider text-gold">
              Profile
            </p>
            <p className="mt-2 break-all font-mono text-[10px] text-parchment">
              {address ? shortenAddress(address, 6) : "—"}
            </p>
            {user?.username ? (
              <p className="mt-1 font-pixel text-[8px] uppercase text-faint">
                {user.username}
              </p>
            ) : null}
          </div>

          <div className="border-b-2 border-edge px-3 py-3">
            <p className="font-pixel text-[8px] uppercase tracking-wider text-faint">
              Balance
            </p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <p className="font-pixel text-[8px] uppercase text-muted">
                  Available
                </p>
                <p className="mt-1 font-pixel text-[12px] text-gold">
                  {balanceLoading && balance == null
                    ? "…"
                    : formatBoardCompact(available)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-pixel text-[8px] uppercase text-muted">
                  Locked
                </p>
                <p className="mt-1 font-pixel text-[10px] text-parchment">
                  {formatBoardCompact(locked)}
                </p>
              </div>
            </div>
            <p className="mt-2 font-pixel text-[8px] uppercase text-faint">
              Available to stake
            </p>
          </div>

          <div className="border-b-2 border-edge px-3 py-3">
            <p className="font-pixel text-[8px] uppercase tracking-wider text-faint">
              Game history
            </p>

            {winsLoading ? (
              <p className="mt-3 font-pixel text-[8px] uppercase text-muted">
                Loading…
              </p>
            ) : wins.length === 0 ? (
              <p className="mt-3 text-[10px] leading-relaxed text-muted">
                No wins yet. Sit a table in the lobby.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {wins.map((win) => (
                  <li
                    key={win.id}
                    className="flex items-center justify-between gap-2 border border-edge bg-surface/40 px-2 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block font-pixel text-[8px] uppercase text-parchment">
                        {win.gameType}
                      </span>
                      <span className="mt-1 block font-pixel text-[7px] uppercase text-faint">
                        {formatAge(win.settledAt, Date.now())}
                      </span>
                    </span>
                    <span className="shrink-0 font-pixel text-[9px] text-gold">
                      +{formatBoard(win.netPayout)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2 p-3">
            <Link
              href="/account"
              role="menuitem"
              className="pixel-corners inline-flex items-center justify-center border-2 border-edge-bright bg-transparent px-3 py-2 font-pixel text-[9px] uppercase text-parchment shadow-pixel-sm hover:bg-surface-hover"
              onClick={() => {
                playSfx("ui_click");
                setOpen(false);
              }}
            >
              Full account
            </Link>
            <PixelButton
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={signingOut}
              onClick={() => void signOut()}
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </PixelButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
