"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, type State } from "wagmi";

import { wagmiConfig } from "@/lib/wallet/wagmi-config";

type WalletProvidersProps = {
  children: React.ReactNode;
  initialState?: State;
};

/**
 * Client providers for chain wallet connection (wagmi + react-query).
 */
export function WalletProviders({
  children,
  initialState,
}: WalletProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
