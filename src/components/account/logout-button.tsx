"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDisconnect } from "wagmi";

import { PixelButton } from "@/components/ui/pixel-button";
import { clearBoardSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

/**
 * Sign out · revokes server session, clears client keys, disconnects wallet.
 */
export function LogoutButton({
  className,
  onLoggedOut,
}: {
  className?: string;
  onLoggedOut?: () => void;
}) {
  const router = useRouter();
  const { disconnect } = useDisconnect();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch {
      // still clear local state
    }
    clearBoardSession();
    try {
      disconnect();
    } catch {
      // ignore
    }
    onLoggedOut?.();
    router.push("/");
    router.refresh();
    setBusy(false);
  }

  return (
    <PixelButton
      type="button"
      variant="outline"
      size="md"
      className={cn(className)}
      disabled={busy}
      onClick={() => void logout()}
    >
      {busy ? "Signing out…" : "Sign out"}
    </PixelButton>
  );
}
