"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchJson } from "@/lib/fetch-json";
import type { WalletBalance } from "@/lib/types";
import type { WalletStatusResult } from "@/server/services/wallet-status.service";

export type PlatformWalletStatus = WalletStatusResult;

type UsePlatformWalletOptions = {
  pollMs?: number;
  enabled?: boolean;
};

/** Shortest polling interval worth setting up a timer for. */
const MIN_POLL_MS = 1_000;

const FAILED_MESSAGE = "Failed to load wallet status.";

/** Load platform ledger balance + linked-wallet status from GET /api/wallet. */
export function usePlatformWallet(options: UsePlatformWalletOptions = {}) {
  const { pollMs = 0, enabled = true } = options;
  const [data, setData] = useState<PlatformWalletStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(true);

  const refresh = useCallback(async () => {
    if (!enabled) return null;
    try {
      const json = await fetchJson<PlatformWalletStatus>("/api/wallet");
      setData(json);
      setError(null);
      return json;
    } catch (err) {
      setError(err instanceof Error ? err.message : FAILED_MESSAGE);
      return null;
    } finally {
      setPending(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    // State is written in the async continuation and dropped after unmount, so
    // the effect body itself never calls setState.
    let cancelled = false;

    const load = async () => {
      try {
        const json = await fetchJson<PlatformWalletStatus>("/api/wallet");
        if (cancelled) return;
        setData(json);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : FAILED_MESSAGE);
      } finally {
        if (!cancelled) setPending(false);
      }
    };

    void load();

    if (!pollMs || pollMs < MIN_POLL_MS) {
      return () => {
        cancelled = true;
      };
    }

    const id = window.setInterval(() => void load(), pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pollMs, enabled]);

  const balance: WalletBalance | null = data
    ? {
        available: data.balance.available,
        locked: data.balance.locked,
        chain: data.balance.chain,
        address: data.balance.address,
      }
    : null;

  // Derived rather than stored: a disabled hook never loads, so it is never
  // loading. Setting that in an effect was a redundant render.
  return { data, balance, error, loading: enabled && pending, refresh };
}
