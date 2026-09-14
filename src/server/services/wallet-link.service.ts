/**
 * Link + verify chain wallets (Robinhood Chain) for an account.
 */
import { and, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";

import { MOCK_ACCOUNT } from "@/lib/mock/account";
import { getDb } from "@/server/db";
import { userBalances, wallets } from "@/server/db/schema";

function dbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export class WalletLinkError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "WalletLinkError";
    this.status = status;
  }
}

const DEFAULT_CHAIN = "Robinhood Chain";

export type WalletView = {
  id: string;
  address: string;
  chain: string;
  isPrimary: boolean;
  verified: boolean;
  verifiedAt: string | null;
  verifyNonce: string | null;
  label: string | null;
};

function mapWallet(row: typeof wallets.$inferSelect): WalletView {
  return {
    id: row.id,
    address: row.address,
    chain: row.chain,
    isPrimary: row.isPrimary,
    verified: Boolean(row.verifiedAt),
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    verifyNonce: row.verifyNonce,
    label: row.label,
  };
}

function normalizeAddress(address: string): string {
  const trimmed = address.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    throw new WalletLinkError("Invalid EVM wallet address.");
  }
  return trimmed.toLowerCase();
}

/**
 * Attach a wallet address and issue a verification nonce (SIWE-style stub).
 */
export async function connectWallet(input: {
  userId: string;
  address: string;
  chain?: string;
  label?: string;
  makePrimary?: boolean;
}): Promise<{ wallet: WalletView; source: "database" | "mock" }> {
  const address = normalizeAddress(input.address);
  const chain = input.chain?.trim() || DEFAULT_CHAIN;
  const nonce = `board-${randomBytes(8).toString("hex")}`;

  if (!dbConfigured()) {
    return {
      wallet: {
        id: "wal_mock",
        address,
        chain,
        isPrimary: true,
        verified: false,
        verifiedAt: null,
        verifyNonce: nonce,
        label: input.label ?? null,
      },
      source: "mock",
    };
  }

  const db = getDb();
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(wallets)
      .where(and(eq(wallets.chain, chain), eq(wallets.address, address)))
      .limit(1);

    if (existing && existing.userId !== input.userId) {
      throw new WalletLinkError("Wallet already linked to another account.", 409);
    }

    const makePrimary = input.makePrimary !== false;
    if (makePrimary) {
      await tx
        .update(wallets)
        .set({ isPrimary: false, updatedAt: now })
        .where(eq(wallets.userId, input.userId));
    }

    if (existing) {
      const [updated] = await tx
        .update(wallets)
        .set({
          verifyNonce: nonce,
          isPrimary: makePrimary || existing.isPrimary,
          label: input.label ?? existing.label,
          updatedAt: now,
        })
        .where(eq(wallets.id, existing.id))
        .returning();
      return { wallet: mapWallet(updated), source: "database" as const };
    }

    const [created] = await tx
      .insert(wallets)
      .values({
        userId: input.userId,
        address,
        chain,
        isPrimary: makePrimary,
        verifyNonce: nonce,
        label: input.label ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return { wallet: mapWallet(created), source: "database" as const };
  });
}

/**
 * Verify wallet ownership. Until RPC/SIWE lands, accept:
 * - `signature === verifyNonce`, or
 * - `signature === "mock-signed"`.
 */
export async function verifyWallet(input: {
  userId: string;
  walletId?: string;
  address?: string;
  signature: string;
}): Promise<{ wallet: WalletView; source: "database" | "mock" }> {
  const signature = input.signature.trim();
  if (!signature) {
    throw new WalletLinkError("signature is required.");
  }

  if (!dbConfigured()) {
    const address = input.address
      ? normalizeAddress(input.address)
      : MOCK_ACCOUNT.walletAddress.toLowerCase();
    return {
      wallet: {
        id: input.walletId ?? "wal_mock",
        address,
        chain: DEFAULT_CHAIN,
        isPrimary: true,
        verified: true,
        verifiedAt: new Date().toISOString(),
        verifyNonce: null,
        label: null,
      },
      source: "mock",
    };
  }

  const db = getDb();

  return db.transaction(async (tx) => {
    let row: typeof wallets.$inferSelect | undefined;

    if (input.walletId) {
      const [found] = await tx
        .select()
        .from(wallets)
        .where(
          and(eq(wallets.id, input.walletId), eq(wallets.userId, input.userId)),
        )
        .limit(1);
      row = found;
    } else if (input.address) {
      const address = normalizeAddress(input.address);
      const [found] = await tx
        .select()
        .from(wallets)
        .where(
          and(
            eq(wallets.userId, input.userId),
            eq(wallets.address, address),
          ),
        )
        .limit(1);
      row = found;
    }

    if (!row) {
      throw new WalletLinkError("Wallet not found.", 404);
    }

    const ok =
      signature === "mock-signed" ||
      (row.verifyNonce !== null && signature === row.verifyNonce);

    if (!ok) {
      throw new WalletLinkError("Invalid wallet signature.", 401);
    }

    const now = new Date();
    const [updated] = await tx
      .update(wallets)
      .set({
        verifiedAt: now,
        verifyNonce: null,
        updatedAt: now,
      })
      .where(eq(wallets.id, row.id))
      .returning();

    if (updated.isPrimary) {
      await tx
        .insert(userBalances)
        .values({
          userId: input.userId,
          available: "0",
          chain: updated.chain,
          walletAddress: updated.address,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userBalances.userId,
          set: {
            walletAddress: updated.address,
            chain: updated.chain,
            updatedAt: now,
          },
        });
    }

    return { wallet: mapWallet(updated), source: "database" as const };
  });
}

export async function listWallets(userId: string) {
  if (!dbConfigured()) {
    return {
      wallets: [
        {
          id: "wal_mock",
          address: MOCK_ACCOUNT.walletAddress.toLowerCase(),
          chain: MOCK_ACCOUNT.chain,
          isPrimary: true,
          verified: MOCK_ACCOUNT.walletConnected,
          verifiedAt: MOCK_ACCOUNT.walletConnected
            ? MOCK_ACCOUNT.joinedAt
            : null,
          verifyNonce: null,
          label: null,
        } satisfies WalletView,
      ],
      source: "mock" as const,
    };
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, userId));

  return {
    wallets: rows.map(mapWallet),
    source: "database" as const,
  };
}
