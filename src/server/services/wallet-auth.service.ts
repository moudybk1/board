/**
 * Wallet-only auth: challenge + signature → find/create user → session.
 */
import { and, eq, ne } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { verifyMessage } from "viem";

import {
  ROBINHOOD_CHAIN_LABEL,
  shortenAddress,
} from "@/lib/wallet/chains";
import { buildWalletVerifyMessage } from "@/lib/wallet/siwe";
import { getDb } from "@/server/db";
import { sessions, userBalances, users, wallets } from "@/server/db/schema";
import {
  AuthError,
  mapUser,
  type AuthSessionResult,
  type AuthUserView,
} from "@/server/services/auth.service";
import {
  createSessionToken,
  hashSessionToken,
  sessionExpiryDate,
} from "@/server/lib/session-token";
import { isDbConfigured as dbConfigured } from "@/server/lib/db-config";

type Challenge = {
  nonce: string;
  expiresAt: number;
};

/** Address → pending login challenge (single-process; fine for launch/dev). */
const pendingChallenges = new Map<string, Challenge>();

/** Mock-mode sessions keyed by raw token. */
const mockWalletSessions = new Map<
  string,
  { user: AuthUserView; address: string }
>();

const CHALLENGE_TTL_MS = 10 * 60 * 1000;

function normalizeAddress(address: string): string {
  const trimmed = address.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    throw new AuthError("Invalid EVM wallet address.");
  }
  return trimmed.toLowerCase();
}

function usernameFromAddress(address: string): string {
  const hex = address.slice(2, 10).toLowerCase();
  return `w_${hex}`;
}

function displayNameFromAddress(address: string): string {
  return shortenAddress(address, 4);
}

function allowMockSignature() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_MOCK_WALLET_VERIFY === "true"
  );
}

async function assertSignature(input: {
  address: string;
  nonce: string;
  signature: string;
  message: string;
}) {
  const expected = buildWalletVerifyMessage({
    address: input.address,
    nonce: input.nonce,
  });
  if (input.message.trim() !== expected) {
    throw new AuthError("Signed message does not match login challenge.", 401);
  }

  if (allowMockSignature() && input.signature === "mock-signed") {
    return;
  }

  let valid = false;
  try {
    valid = await verifyMessage({
      address: input.address as `0x${string}`,
      message: input.message,
      signature: input.signature as `0x${string}`,
    });
  } catch {
    valid = false;
  }

  if (!valid) {
    throw new AuthError("Invalid wallet signature.", 401);
  }
}

async function insertSession(
  userId: string,
  meta: { userAgent?: string; ipAddress?: string },
) {
  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = sessionExpiryDate();
  const db = getDb();

  await db.insert(sessions).values({
    userId,
    tokenHash,
    userAgent: meta.userAgent ?? null,
    ipAddress: meta.ipAddress ?? null,
    expiresAt,
    lastSeenAt: new Date(),
  });

  return { token, expiresAt };
}

/**
 * Issue a one-time login challenge for an address.
 */
export function issueWalletLoginChallenge(addressRaw: string) {
  const address = normalizeAddress(addressRaw);
  const nonce = `board-${randomBytes(8).toString("hex")}`;
  pendingChallenges.set(address, {
    nonce,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });

  const message = buildWalletVerifyMessage({ address, nonce });
  return {
    address,
    nonce,
    message,
    chain: ROBINHOOD_CHAIN_LABEL,
    expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
  };
}

function consumeChallenge(address: string, message: string) {
  const challenge = pendingChallenges.get(address);
  if (!challenge || challenge.expiresAt < Date.now()) {
    pendingChallenges.delete(address);
    throw new AuthError("Login challenge expired. Request a new one.", 401);
  }

  const expected = buildWalletVerifyMessage({
    address,
    nonce: challenge.nonce,
  });
  if (message.trim() !== expected) {
    throw new AuthError("Signed message does not match login challenge.", 401);
  }

  pendingChallenges.delete(address);
  return challenge.nonce;
}

/**
 * Verify wallet signature, find or create the user, issue a session.
 */
export async function loginWithWallet(input: {
  address: string;
  signature: string;
  message: string;
  userAgent?: string;
  ipAddress?: string;
}): Promise<
  AuthSessionResult & {
    wallet: { address: string; chain: string; verified: boolean };
  }
> {
  const address = normalizeAddress(input.address);
  const signature = input.signature.trim();
  if (!signature) {
    throw new AuthError("signature is required.");
  }

  const nonce = consumeChallenge(address, input.message);
  await assertSignature({
    address,
    nonce,
    signature,
    message: input.message,
  });

  if (!dbConfigured()) {
    const token = `mock_${createSessionToken()}`;
    const expiresAt = sessionExpiryDate();
    const user: AuthUserView = {
      id: `wal_${address.slice(2, 10)}`,
      username: usernameFromAddress(address),
      email: null,
      avatarId: "pawn-gold",
      balance: 0,
    };
    mockWalletSessions.set(token, { user, address });
    return {
      user,
      session: {
        token,
        expiresAt: expiresAt.toISOString(),
      },
      source: "mock",
      wallet: {
        address,
        chain: ROBINHOOD_CHAIN_LABEL,
        verified: true,
      },
    };
  }

  const db = getDb();
  const now = new Date();
  const chain = ROBINHOOD_CHAIN_LABEL;

  const result = await db.transaction(async (tx) => {
    const [existingWallet] = await tx
      .select()
      .from(wallets)
      .where(and(eq(wallets.chain, chain), eq(wallets.address, address)))
      .limit(1);

    let userRow: typeof users.$inferSelect;

    if (existingWallet) {
      const [found] = await tx
        .select()
        .from(users)
        .where(eq(users.id, existingWallet.userId))
        .limit(1);
      if (!found) {
        throw new AuthError("Wallet linked to a missing account.", 500);
      }
      userRow = found;

      await tx
        .update(wallets)
        .set({ isPrimary: false, updatedAt: now })
        .where(
          and(
            eq(wallets.userId, userRow.id),
            ne(wallets.id, existingWallet.id),
          ),
        );

      await tx
        .update(wallets)
        .set({
          verifiedAt: now,
          verifyNonce: null,
          isPrimary: true,
          updatedAt: now,
        })
        .where(eq(wallets.id, existingWallet.id));
    } else {
      const baseName = usernameFromAddress(address);
      let username = baseName;
      for (let i = 0; i < 5; i++) {
        const [clash] = await tx
          .select({ id: users.id })
          .from(users)
          .where(eq(users.username, username))
          .limit(1);
        if (!clash) break;
        username = `${baseName}_${randomBytes(2).toString("hex")}`;
      }

      const [created] = await tx
        .insert(users)
        .values({
          username,
          email: null,
          passwordHash: null,
          avatarId: "pawn-gold",
          balance: "0",
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      userRow = created;

      await tx.insert(userBalances).values({
        userId: created.id,
        available: "0",
        chain,
        walletAddress: address,
        updatedAt: now,
      });

      await tx.insert(wallets).values({
        userId: created.id,
        address,
        chain,
        isPrimary: true,
        verifiedAt: now,
        verifyNonce: null,
        label: displayNameFromAddress(address),
        createdAt: now,
        updatedAt: now,
      });
    }

    await tx
      .insert(userBalances)
      .values({
        userId: userRow.id,
        available: "0",
        chain,
        walletAddress: address,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userBalances.userId,
        set: {
          walletAddress: address,
          chain,
          updatedAt: now,
        },
      });

    return userRow;
  });

  const session = await insertSession(result.id, input);

  return {
    user: mapUser(result),
    session: {
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
    },
    source: "database",
    wallet: {
      address,
      chain,
      verified: true,
    },
  };
}

/**
 * Resolve mock wallet sessions created without DATABASE_URL.
 */
export function resolveMockWalletSession(token: string) {
  return mockWalletSessions.get(token) ?? null;
}

export function clearMockWalletSession(token: string) {
  mockWalletSessions.delete(token);
}
