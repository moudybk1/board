/**
 * Register / login with server-side sessions (Akun & Dompet).
 */
import { and, eq, gt, isNull } from "drizzle-orm";

import { MOCK_ACCOUNT } from "@/lib/mock/account";
import { MOCK_PLAYER } from "@/lib/mock/lobby";
import { getDb } from "@/server/db";
import { sessions, userBalances, users } from "@/server/db/schema";
import { hashPassword, verifyPassword } from "@/server/lib/password";
import {
  createSessionToken,
  hashSessionToken,
  sessionExpiryDate,
} from "@/server/lib/session-token";

function dbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export type AuthUserView = {
  id: string;
  username: string;
  email: string | null;
  avatarId: string | null;
  balance: number;
};

export type AuthSessionResult = {
  user: AuthUserView;
  session: {
    token: string;
    expiresAt: string;
  };
  source: "database" | "mock";
};

export type RegisterInput = {
  email: string;
  username: string;
  password: string;
  userAgent?: string;
  ipAddress?: string;
};

export type LoginInput = {
  email: string;
  password: string;
  userAgent?: string;
  ipAddress?: string;
};

function mapUser(row: typeof users.$inferSelect): AuthUserView {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    avatarId: row.avatarId,
    balance: Number(row.balance),
  };
}

function validateCredentials(email: string, password: string, username?: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new AuthError("A valid email is required.");
  }
  if (password.length < 8) {
    throw new AuthError("Password must be at least 8 characters.");
  }
  if (username !== undefined) {
    const name = username.trim();
    if (name.length < 3 || name.length > 24) {
      throw new AuthError("Username must be 3-24 characters.");
    }
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      throw new AuthError("Username may only use letters, numbers, and _.");
    }
  }
  return { email: normalizedEmail, username: username?.trim() };
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
 * Create a player account + primary session.
 */
export async function registerUser(
  input: RegisterInput,
): Promise<AuthSessionResult> {
  const { email, username } = validateCredentials(
    input.email,
    input.password,
    input.username,
  );
  if (!username) {
    throw new AuthError("Username is required.");
  }

  if (!dbConfigured()) {
    const expiresAt = sessionExpiryDate();
    return {
      user: {
        id: MOCK_PLAYER.id,
        username,
        email,
        avatarId: MOCK_ACCOUNT.avatarId,
        balance: 0,
      },
      session: {
        token: `mock_${createSessionToken()}`,
        expiresAt: expiresAt.toISOString(),
      },
      source: "mock",
    };
  }

  const db = getDb();
  const passwordHash = hashPassword(input.password);
  const now = new Date();

  try {
    const user = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({
          username,
          email,
          passwordHash,
          avatarId: "pawn-gold",
          balance: "0",
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      await tx.insert(userBalances).values({
        userId: created.id,
        available: "0",
        updatedAt: now,
      });

      return created;
    });

    const session = await insertSession(user.id, input);
    return {
      user: mapUser(user),
      session: {
        token: session.token,
        expiresAt: session.expiresAt.toISOString(),
      },
      source: "database",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (
      message.includes("users_email_unique") ||
      message.includes("users_username_unique")
    ) {
      throw new AuthError("Email or username is already taken.", 409);
    }
    throw error;
  }
}

/**
 * Sign in with email + password and issue a new session.
 */
export async function loginUser(input: LoginInput): Promise<AuthSessionResult> {
  const { email } = validateCredentials(input.email, input.password);

  if (!dbConfigured()) {
    const expiresAt = sessionExpiryDate();
    return {
      user: {
        id: MOCK_PLAYER.id,
        username: MOCK_ACCOUNT.username,
        email,
        avatarId: MOCK_ACCOUNT.avatarId,
        balance: 0,
      },
      session: {
        token: `mock_${createSessionToken()}`,
        expiresAt: expiresAt.toISOString(),
      },
      source: "mock",
    };
  }

  const db = getDb();
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!row?.passwordHash || !verifyPassword(input.password, row.passwordHash)) {
    throw new AuthError("Invalid email or password.", 401);
  }

  const session = await insertSession(row.id, input);
  return {
    user: mapUser(row),
    session: {
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
    },
    source: "database",
  };
}

/**
 * Resolve an active session from a raw token (cookie / Bearer / header).
 */
export async function resolveSessionToken(token: string | null | undefined) {
  if (!token?.trim()) return null;
  const raw = token.trim();

  if (!dbConfigured()) {
    if (!raw.startsWith("mock_")) return null;

    const { resolveMockWalletSession } = await import(
      "@/server/services/wallet-auth.service"
    );
    const walletSession = resolveMockWalletSession(raw);
    if (walletSession) {
      return {
        user: walletSession.user,
        sessionId: "mock-wallet-session",
        source: "mock" as const,
      };
    }

    return {
      user: {
        id: MOCK_PLAYER.id,
        username: MOCK_ACCOUNT.username,
        email: MOCK_ACCOUNT.email,
        avatarId: MOCK_ACCOUNT.avatarId,
        balance: 0,
      },
      sessionId: "mock-session",
      source: "mock" as const,
    };
  }

  const tokenHash = hashSessionToken(raw);
  const db = getDb();
  const now = new Date();

  const [row] = await db
    .select({
      session: sessions,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now),
      ),
    )
    .limit(1);

  if (!row) return null;

  await db
    .update(sessions)
    .set({ lastSeenAt: now })
    .where(eq(sessions.id, row.session.id));

  return {
    user: mapUser(row.user),
    sessionId: row.session.id,
    source: "database" as const,
  };
}
