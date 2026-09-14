"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PixelButton } from "@/components/ui/pixel-button";
import { clearBoardSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

/**
 * Sign out · clears mock session storage and returns to the welcome page.
 */
export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  function logout() {
    setBusy(true);
    clearBoardSession();
    window.setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 200);
  }

  return (
    <PixelButton
      type="button"
      variant="outline"
      size="md"
      className={cn(className)}
      disabled={busy}
      onClick={logout}
    >
      {busy ? "Signing out…" : "Sign out"}
    </PixelButton>
  );
}
