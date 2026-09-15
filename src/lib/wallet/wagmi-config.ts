import { http, createConfig, createStorage, cookieStorage } from "wagmi";
import { injected, metaMask, walletConnect } from "wagmi/connectors";
import { robinhood, robinhoodTestnet } from "viem/chains";

import {
  getBoardChain,
  getBoardChainEnv,
  getBoardRpcUrl,
} from "@/lib/wallet/chains";

function buildConnectors() {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";

  const connectors = [
    metaMask({
      dappMetadata: {
        name: "BOARD",
        url: appUrl,
        iconUrl: `${appUrl}/board-logo.png`,
      },
    }),
    injected({
      shimDisconnect: true,
      target: {
        id: "okx",
        name: "OKX Wallet",
        // OKX injects `window.okxwallet` (not always on ethereum).
        provider: ((win: unknown) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (win as any)?.okxwallet) as never,
      },
    }),
    injected({
      shimDisconnect: true,
      target: {
        id: "rabby",
        name: "Rabby",
        provider: ((win: unknown) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const eth = (win as any)?.ethereum;
          if (!eth) return undefined;
          if (eth.isRabby) return eth;
          return eth.providers?.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (p: any) => p?.isRabby,
          );
        }) as never,
      },
    }),
    injected({
      shimDisconnect: true,
      target: {
        id: "browser",
        name: "Browser Wallet",
        provider: ((win: unknown) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (win as any)?.ethereum) as never,
      },
    }),
  ];

  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();
  if (projectId) {
    connectors.push(
      walletConnect({
        projectId,
        metadata: {
          name: "BOARD",
          description: "Play classic board games, win real tokens",
          url: appUrl,
          icons: [`${appUrl}/board-logo.png`],
        },
        showQrModal: true,
      }),
    );
  }

  return connectors;
}

const primary = getBoardChain();
const secondary =
  getBoardChainEnv() === "testnet" ? robinhood : robinhoodTestnet;

const primaryRpc = getBoardRpcUrl();
const secondaryRpc =
  getBoardChainEnv() === "testnet"
    ? "https://rpc.mainnet.chain.robinhood.com"
    : "https://rpc.testnet.chain.robinhood.com";

/**
 * Shared wagmi config (safe for server cookie hydration + client providers).
 * Both Robinhood networks are registered; PRIMARY is selected via NEXT_PUBLIC_CHAIN_ENV.
 */
export const wagmiConfig = createConfig({
  chains: [primary, secondary],
  connectors: buildConnectors(),
  transports: {
    [robinhood.id]: http(
      getBoardChainEnv() === "mainnet" ? primaryRpc : secondaryRpc,
    ),
    [robinhoodTestnet.id]: http(
      getBoardChainEnv() === "testnet" ? primaryRpc : secondaryRpc,
    ),
  },
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});
