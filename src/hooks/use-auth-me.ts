"use client";

import { useCallback, useEffect, useState } from "react";

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

/**
 * Current BOARD session (wallet-only). Polls lightly after login.
 */
export function useAuthMe() {
  const [data, setData] = useState<AuthMeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.status === 401) {
        setData({ authenticated: false });
        setError(null);
        return { authenticated: false } as AuthMeResult;
      }
      if (!res.ok) {
        throw new Error("Failed to load session.");
      }
      const json = (await res.json()) as AuthMeResult;
      setData(json);
      setError(null);
      return json;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Session error");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    data,
    user: data?.authenticated ? data.user ?? null : null,
    wallet: data?.authenticated ? data.wallet ?? null : null,
    authenticated: Boolean(data?.authenticated),
    loading,
    error,
    refresh,
  };
}
