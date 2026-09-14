import { asc, eq } from "drizzle-orm";

import {
  getMonopolyRoom,
  type MonopolyRoomState,
} from "@/lib/mock/monopoly";
import {
  PRIZE_FEE_RATE,
  netPrize,
  prizePool,
} from "@/lib/types";
import { MOCK_BALANCE } from "@/lib/mock/lobby";
import { getDb } from "@/server/db";
import {
  matches,
  monopolyLogs,
  monopolyMatches,
  monopolyPlayers,
  rooms,
  users,
} from "@/server/db/schema";
import { MOCK_MONOPOLY_LIVE } from "@/server/services/join-room.service";
import { broadcastMonopolyAction } from "@/server/services/monopoly-sync.service";
import { payMatchReward } from "@/server/services/reward-payout.service";

export type MonopolySettleResult =
  | {
      ok: true;
      winnerUserId: string;
      winnerSeat: number;
      winnerUsername: string;
      prizePool: number;
      fee: number;
      netPrize: number;
      balanceAfter: number | null;
      state: MonopolyRoomState;
      source: "database" | "mock";
    }
  | {
      ok: false;
      code: "NOT_FOUND" | "NOT_READY" | "ALREADY_SETTLED";
      message: string;
    };

function dbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * When one Monopoly player remains, settle the match: 2% fee, credit the
 * winner's platform balance with the net prize, mark room + match finished.
 */
export async function settleMonopolyWinner(
  roomRef: string,
): Promise<MonopolySettleResult> {
  if (!dbConfigured()) {
    return settleWinnerMock(roomRef);
  }

  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const roomRows = await tx.select().from(rooms);
    const room = roomRows.find(
      (row) =>
        row.id === roomRef ||
        formatRoomCode(row.id, row.gameType) === roomRef.toUpperCase(),
    );
    if (!room || room.gameType !== "monopoly") {
      return {
        ok: false as const,
        code: "NOT_FOUND" as const,
        message: "Monopoly room not found.",
      };
    }

    const [match] = await tx
      .select()
      .from(matches)
      .where(eq(matches.roomId, room.id))
      .limit(1)
      .for("update");

    if (!match) {
      return {
        ok: false as const,
        code: "NOT_FOUND" as const,
        message: "Match not found.",
      };
    }
    if (match.status === "settled") {
      return {
        ok: false as const,
        code: "ALREADY_SETTLED" as const,
        message: "Prize already distributed.",
      };
    }

    const players = await tx
      .select({
        userId: monopolyPlayers.userId,
        username: users.username,
        seat: monopolyPlayers.seat,
        cash: monopolyPlayers.cash,
        tile: monopolyPlayers.tile,
        status: monopolyPlayers.status,
      })
      .from(monopolyPlayers)
      .innerJoin(users, eq(users.id, monopolyPlayers.userId))
      .where(eq(monopolyPlayers.matchId, match.id))
      .orderBy(asc(monopolyPlayers.seat));

    const alive = players.filter((player) => player.status === "alive");
    if (alive.length !== 1) {
      return {
        ok: false as const,
        code: "NOT_READY" as const,
        message: "Need exactly one surviving player to settle.",
      };
    }

    const winner = alive[0];
    const pool = Number(match.prizePool);
    const now = new Date();

    const payout = await payMatchReward(tx, {
      matchId: match.id,
      roomId: room.id,
      winnerUserId: winner.userId,
      gameType: "monopoly",
      entryFee: Number(room.entryFee),
      seats: room.maxPlayers,
      grossPot: pool,
    });
    const fee = payout.feeAmount;
    const net = payout.netPayout;
    const balanceAfter = Number(
      (
        await tx
          .select({ balance: users.balance })
          .from(users)
          .where(eq(users.id, winner.userId))
          .limit(1)
      )[0]?.balance ?? net,
    );

    await tx
      .update(matches)
      .set({
        status: "settled",
        winnerUserId: winner.userId,
        endedAt: now,
      })
      .where(eq(matches.id, match.id));

    await tx
      .update(rooms)
      .set({ status: "finished" })
      .where(eq(rooms.id, room.id));

    await tx.insert(monopolyLogs).values({
      matchId: match.id,
      seat: winner.seat,
      message: `${winner.username} wins the room! Net prize ${net} BOARD (${fee} fee to treasury/burn).`,
      createdAt: now,
    });

    const [mono] = await tx
      .select()
      .from(monopolyMatches)
      .where(eq(monopolyMatches.matchId, match.id))
      .limit(1);

    const logs = await tx
      .select()
      .from(monopolyLogs)
      .where(eq(monopolyLogs.matchId, match.id))
      .orderBy(asc(monopolyLogs.createdAt));

    const state: MonopolyRoomState = {
      roomId: formatRoomCode(room.id, "monopoly"),
      entryFee: Number(room.entryFee),
      maxPlayers: room.maxPlayers,
      activeSeat: mono?.activeSeat ?? winner.seat,
      turn: mono?.turn ?? 1,
      turnSecondsLeft: 0,
      players: players.map((player) => ({
        id: player.userId,
        username: player.username,
        position: player.seat,
        status: player.status,
        cash: Number(player.cash),
        tile: player.tile,
        owned: 0,
        isYou: false,
      })),
      owners: {},
      log: logs
        .slice()
        .reverse()
        .map((entry) => ({
          id: entry.id,
          seat: entry.seat,
          message: entry.message,
        })),
    };

    return {
      ok: true as const,
      winnerUserId: winner.userId,
      winnerSeat: winner.seat,
      winnerUsername: winner.username,
      prizePool: pool,
      fee,
      netPrize: net,
      balanceAfter,
      state,
      source: "database" as const,
    };
  });

  if (result.ok) {
    broadcastMonopolyAction({
      roomId: result.state.roomId,
      action: "turn",
      seat: result.winnerSeat,
      state: result.state,
      detail: {
        settled: true,
        winnerUserId: result.winnerUserId,
        prizePool: result.prizePool,
        fee: result.fee,
        netPrize: result.netPrize,
      },
      source: "database",
    });
  }

  return result;
}

function settleWinnerMock(roomRef: string): MonopolySettleResult {
  const key = roomRef.toUpperCase();
  let state =
    MOCK_MONOPOLY_LIVE.get(key) ??
    MOCK_MONOPOLY_LIVE.get(roomRef) ??
    (key.startsWith("MNP-") ? structuredClone(getMonopolyRoom(key)) : null);

  if (!state) {
    return { ok: false, code: "NOT_FOUND", message: "Monopoly room not found." };
  }

  const alive = state.players.filter((player) => player.status === "alive");
  if (alive.length !== 1) {
    return {
      ok: false,
      code: "NOT_READY",
      message: "Need exactly one surviving player to settle.",
    };
  }

  // Idempotency: if the top log already announces a win payout, skip.
  if (state.log.some((entry) => entry.message.includes("Net prize"))) {
    return {
      ok: false,
      code: "ALREADY_SETTLED",
      message: "Prize already distributed.",
    };
  }

  const winner = alive[0];
  const pool = prizePool({
    entryFee: state.entryFee,
    maxPlayers: state.maxPlayers,
  });
  const fee = Math.round(pool * PRIZE_FEE_RATE * 100) / 100;
  const net = netPrize({
    entryFee: state.entryFee,
    maxPlayers: state.maxPlayers,
  });

  let balanceAfter: number | null = null;
  if (winner.id === "u_me" || winner.isYou) {
    MOCK_BALANCE.available += net;
    MOCK_BALANCE.locked = Math.max(0, MOCK_BALANCE.locked - state.entryFee);
    balanceAfter = MOCK_BALANCE.available;
  }

  state = {
    ...state,
    turnSecondsLeft: 0,
    log: [
      {
        id: `win-${Date.now()}`,
        seat: winner.position,
        message: `${winner.isYou ? "You" : winner.username} win${
          winner.isYou ? "" : "s"
        } the room! Net prize ${net} BOARD (${fee} fee burned to treasury).`,
      },
      ...state.log,
    ],
  };

  MOCK_MONOPOLY_LIVE.set(state.roomId, state);

  broadcastMonopolyAction({
    roomId: state.roomId,
    action: "turn",
    seat: winner.position,
    state,
    detail: {
      settled: true,
      winnerUserId: winner.id,
      prizePool: pool,
      fee,
      netPrize: net,
    },
    source: "mock",
  });

  return {
    ok: true,
    winnerUserId: winner.id,
    winnerSeat: winner.position,
    winnerUsername: winner.username,
    prizePool: pool,
    fee,
    netPrize: net,
    balanceAfter,
    state,
    source: "mock",
  };
}

function formatRoomCode(id: string, gameType: "monopoly" | "ludo") {
  const prefix = gameType === "monopoly" ? "MNP" : "LUD";
  const short = id.replace(/-/g, "").slice(0, 4).toUpperCase();
  return `${prefix}-${short}`;
}

/** Auto-settle when rent leaves a single survivor. */
export async function maybeSettleAfterRent(state: MonopolyRoomState) {
  const alive = state.players.filter((player) => player.status === "alive");
  if (alive.length !== 1) return null;
  return settleMonopolyWinner(state.roomId);
}
