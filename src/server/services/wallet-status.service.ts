import { MOCK_NETWORK, MOCK_WALLET_BALANCE } from "@/lib/mock/wallet";
import { getUserBalance } from "@/server/services/balance.service";
import { getRoomEconomyConfig } from "@/server/services/economy.service";

function dbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export type NetworkStatus = {
  chain: string;
  expectedChain: string;
  connected: boolean;
  walletAddress: string | null;
  warning: string | null;
};

export type WalletStatusResult = {
  balance: {
    available: number;
    locked: number;
    chain: string;
    address: string;
  };
  network: NetworkStatus;
  user: { id: string; username: string };
  source: "database" | "mock";
};

/**
 * Combined balance + network/wallet readiness check for the wallet UI.
 */
export async function getWalletStatus(
  userId: string,
): Promise<WalletStatusResult | null> {
  const balance = await getUserBalance(userId);
  if (!balance) return null;

  const economy = getRoomEconomyConfig();
  const expectedChain = economy.chain;

  const connected = Boolean(
    balance.address &&
      balance.address !== "0x0000000000000000000000000000000000000000",
  );

  let warning: string | null = null;
  if (!connected) {
    warning =
      "Connect a Robinhood Chain wallet before depositing or withdrawing.";
  } else if (balance.chain !== expectedChain) {
    warning = `Your wallet is on ${balance.chain}. Switch to ${expectedChain} to move BOARD.`;
  }

  // Mock mode always reports the curated network banner state when connected.
  const network: NetworkStatus = !dbConfigured()
    ? {
        chain: MOCK_NETWORK.chain,
        expectedChain,
        connected: MOCK_NETWORK.connected,
        walletAddress: MOCK_WALLET_BALANCE.address,
        warning: MOCK_NETWORK.warning,
      }
    : {
        chain: balance.chain,
        expectedChain,
        connected,
        walletAddress: connected ? balance.address : null,
        warning,
      };

  return {
    balance: {
      available: balance.available,
      locked: balance.locked,
      chain: balance.chain,
      address: balance.address,
    },
    network,
    user: { id: balance.userId, username: balance.username },
    source: dbConfigured() ? "database" : "mock",
  };
}
