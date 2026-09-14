"use client";

import { useState } from "react";

import { PixelButton } from "@/components/ui/pixel-button";
import { MOCK_NETWORK, type MockNetworkStatus } from "@/lib/mock/wallet";
import { cn } from "@/lib/utils";

const DISCONNECTED: MockNetworkStatus = {
  chain: "Robinhood Chain",
  connected: false,
  walletLabel: "No wallet connected",
  warning: "Connect a Robinhood Chain wallet before depositing or withdrawing.",
};

const WRONG_NETWORK: MockNetworkStatus = {
  chain: "Wrong network",
  connected: true,
  walletLabel: MOCK_NETWORK.walletLabel,
  warning:
    "Your wallet is on the wrong network. Switch to Robinhood Chain to move BOARD.",
};

/**
 * Mock network + wallet status strip with a demo toggle for warning states.
 */
export function NetworkStatusBanner({ className }: { className?: string }) {
  const [mode, setMode] = useState<"ok" | "disconnected" | "wrong">(
    "ok",
  );

  const status =
    mode === "ok"
      ? MOCK_NETWORK
      : mode === "disconnected"
        ? DISCONNECTED
        : WRONG_NETWORK;

  const tone = status.connected && !status.warning
    ? "ok"
    : status.connected
      ? "warn"
      : "bad";

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className={cn(
          "pixel-corners border-2 px-4 py-3",
          tone === "ok" && "border-success/40 bg-success/5",
          tone === "warn" && "border-gold/50 bg-gold/5",
          tone === "bad" && "border-danger/50 bg-danger/5",
        )}
        role="status"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-pixel text-[9px] uppercase tracking-wide text-parchment">
            {status.connected ? "Wallet connected" : "Wallet disconnected"}
          </p>
          <p
            className={cn(
              "font-pixel text-[8px] uppercase",
              tone === "ok" && "text-success",
              tone === "warn" && "text-gold",
              tone === "bad" && "text-danger",
            )}
          >
            {status.chain}
          </p>
        </div>
        <p className="mt-2 text-xs text-muted">{status.walletLabel}</p>
        {status.warning ? (
          <p
            role="alert"
            className={cn(
              "mt-3 text-sm leading-relaxed",
              tone === "bad" ? "text-danger" : "text-gold",
            )}
          >
            {status.warning}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Ready to deposit or withdraw on Robinhood Chain.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <PixelButton
          type="button"
          size="sm"
          variant={mode === "ok" ? "primary" : "outline"}
          onClick={() => setMode("ok")}
        >
          Connected
        </PixelButton>
        <PixelButton
          type="button"
          size="sm"
          variant={mode === "disconnected" ? "primary" : "outline"}
          onClick={() => setMode("disconnected")}
        >
          Disconnect demo
        </PixelButton>
        <PixelButton
          type="button"
          size="sm"
          variant={mode === "wrong" ? "primary" : "outline"}
          onClick={() => setMode("wrong")}
        >
          Wrong network
        </PixelButton>
      </div>
    </div>
  );
}
