"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchJson, HttpError } from "@/lib/fetch-json";

export type AuthMeUser = {
  id: string;
  username: string;
  email: string | null;
  avatarId: string | null;
  balance: number;
};

export type AuthMeWallet = {
  address: string;
  chain: string;
  verified: boolean;
};

export type AuthMeResult = {
  authenticated: boolean;
  user?: AuthMeUser;
  wallet?: AuthMeWallet | null;
};

const SIGNED_OUT: AuthMeResult = { authenticated: false };

/** Read the session. A 401 means signed out, which is not an error to show. */
async function loadAuthMe(): Promise<AuthMeResult> {
  try {
    return await fetchJson<AuthMeResult>("/api/auth/me");
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) return SIGNED_OUT;
    throw error;
  }
}

/** Current BOARD session (wallet-only). */
export function useAuthMe() {
  const [data, setData] = useState<AuthMeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await loadAuthMe();
      setData(result);
      setError(null);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Session error");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // State is written in the async continuation and dropped after unmount, so
    // the effect body itself never calls setState.
    let cancelled = false;

    void (async () => {
      try {
        const result = await loadAuthMe();
        if (cancelled) return;
        setData(result);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Session error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    data,
    user: data?.authenticated ? (data.user ?? null) : null,
    wallet: data?.authenticated ? (data.wallet ?? null) : null,
    authenticated: Boolean(data?.authenticated),
    loading,
    error,
    refresh,
  };
}
