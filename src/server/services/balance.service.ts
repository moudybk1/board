import { and, eq, inArray, sql } from "drizzle-orm";

import { MOCK_BALANCE, MOCK_PLAYER } from "@/lib/mock/lobby";
import type { WalletBalance } from "@/lib/types";
import { getDb } from "@/server/db";
import { roomPlayers, rooms, userBalances, users } from "@/server/db/schema";

const DEFAULT_CHAIN = "Robinhood Chain";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function dbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export type BalanceResult = WalletBalance & {
  userId: string;
  username: string;
};

/**
 * BOARD balance for a user: spendable `available` from `user_balances`
 * (falling back to `users.balance`), plus `locked` = sum of entry fees for
 * rooms that are still waiting or playing.
 */
export async function getUserBalance(userId: string): Promise<BalanceResult | null> {
  if (!dbConfigured()) {
    if (userId !== MOCK_PLAYER.id && userId !== "me") return null;
    return {
      userId: MOCK_PLAYER.id,
      username: MOCK_PLAYER.username,
      available: MOCK_BALANCE.available,
      locked: MOCK_BALANCE.locked,
      chain: MOCK_BALANCE.chain,
      address: MOCK_BALANCE.address,
    };
  }

  const db = getDb();
  const [row] = await db
    .select({
      id: users.id,
      username: users.username,
      legacyBalance: users.balance,
      available: userBalances.available,
      chain: userBalances.chain,
      walletAddress: userBalances.walletAddress,
    })
    .from(users)
    .leftJoin(userBalances, eq(userBalances.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (!row) return null;

  const [lockedRow] = await db
    .select({
      locked: sql<string>`coalesce(sum(${rooms.entryFee}), 0)`,
    })
    .from(roomPlayers)
    .innerJoin(rooms, eq(rooms.id, roomPlayers.roomId))
    .where(
      and(
        eq(roomPlayers.userId, userId),
        inArray(rooms.status, ["waiting", "playing"]),
      ),
    );

  const available =
    row.available !== null && row.available !== undefined
      ? Number(row.available)
      : Number(row.legacyBalance);

  return {
    userId: row.id,
    username: row.username,
    available,
    locked: Number(lockedRow?.locked ?? 0),
    chain: row.chain ?? DEFAULT_CHAIN,
    address: row.walletAddress ?? ZERO_ADDRESS,
  };
}
