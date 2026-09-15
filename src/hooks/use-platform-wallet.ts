"use client";

import { useCallback, useEffect, useState } from "react";

import type { WalletBalance } from "@/lib/types";
import type { WalletStatusResult } from "@/server/services/wallet-status.service";

export type PlatformWalletStatus = WalletStatusResult;

type UsePlatformWalletOptions = {
  pollMs?: number;
  enabled?: boolean;
};

/**
 * Load platform ledger balance + linked-wallet status from GET /api/wallet.
 */
export function usePlatformWallet(options: UsePlatformWalletOptions = {}) {
  const { pollMs = 0, enabled = true } = options;
  const [data, setData] = useState<PlatformWalletStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);

  const refresh = useCallback(async () => {
    if (!enabled) return null;
    try {
      const res = await fetch("/api/wallet", { credentials: "include" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error || `Wallet status failed (${res.status})`);
      }
      const json = (await res.json()) as PlatformWalletStatus;
      setData(json);
      setError(null);
      return json;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load wallet status.";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void refresh();
    if (!pollMs || pollMs < 1_000) return;
    const id = window.setInterval(() => void refresh(), pollMs);
    return () => window.clearInterval(id);
  }, [refresh, pollMs, enabled]);

  const balance: WalletBalance | null = data
    ? {
        available: data.balance.available,
        locked: data.balance.locked,
        chain: data.balance.chain,
        address: data.balance.address,
      }
    : null;

  return { data, balance, error, loading, refresh };
}
