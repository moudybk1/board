import { asc, eq } from "drizzle-orm";

import { MOCK_BALANCE, MOCK_PLAYER } from "@/lib/mock/lobby";
import {
  getLudoRoom,
  type LudoRoomState,
} from "@/lib/mock/ludo";
import {
  PRIZE_FEE_RATE,
  netPrize,
  prizePool,
} from "@/lib/types";
import { getDb } from "@/server/db";
import {
  ludoLogs,
  ludoMatches,
  ludoPawns,
  ludoPlayers,
  matches,
  rooms,
  users,
} from "@/server/db/schema";
import { publishLudo } from "@/server/realtime/ludo-hub";
import { MOCK_LUDO_LIVE } from "@/server/services/join-room.service";
import { buildLudoState } from "@/server/services/ludo-start.service";
import { payMatchReward } from "@/server/services/reward-payout.service";

export type LudoSettleResult =
  | {
      ok: true;
      winnerUserId: string;
      winnerSeat: number;
      winnerUsername: string;
      prizePool: number;
      fee: number;
      netPrize: number;
      balanceAfter: number | null;
      state: LudoRoomState;
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

/** True when every pawn for this seat is finished. */
export function hasFinishedAllPawns(state: LudoRoomState, seat: number) {
  const player = state.players.find((entry) => entry.position === seat);
  if (!player) return false;
  return (
    player.pawns.length > 0 &&
    player.pawns.every((pawn) => pawn.status === "finished")
  );
}

/** First seat (if any) that has all four pawns home. */
export function detectLudoWinner(state: LudoRoomState) {
  const winner = state.players.find(
    (player) =>
      player.pawns.length > 0 &&
      player.pawns.every((pawn) => pawn.status === "finished"),
  );
  if (!winner) return null;
  return {
    userId: winner.id,
    seat: winner.position,
    username: winner.username,
  };
}

/**
 * Settle a Ludo match once a player has finished all pawns: 2% fee, credit
 * the winner's platform balance, mark room + match finished.
 */
export async function settleLudoWinner(
  roomRef: string,
): Promise<LudoSettleResult> {
  if (!dbConfigured()) {
    return settleLudoMock(roomRef);
  }

  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const roomRows = await tx.select().from(rooms);
    const room = roomRows.find(
      (row) =>
        row.id === roomRef ||
        formatRoomCode(row.id, row.gameType) === roomRef.toUpperCase(),
    );
    if (!room || room.gameType !== "ludo") {
      return {
        ok: false as const,
        code: "NOT_FOUND" as const,
        message: "Ludo room not found.",
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
        userId: ludoPlayers.userId,
        username: users.username,
        seat: ludoPlayers.seat,
        status: ludoPlayers.status,
      })
      .from(ludoPlayers)
      .innerJoin(users, eq(users.id, ludoPlayers.userId))
      .where(eq(ludoPlayers.matchId, match.id))
      .orderBy(asc(ludoPlayers.seat));

    const pawnRows = await tx
      .select()
      .from(ludoPawns)
      .where(eq(ludoPawns.matchId, match.id));

    const pawnsBySeat: Record<
      number,
      { id: string; index: number; status: "yard" | "track" | "home" | "finished"; steps: number }[]
    > = {};
    for (const pawn of pawnRows) {
      const list = pawnsBySeat[pawn.seat] ?? [];
      list.push({
        id: `p${pawn.seat}-${pawn.pawnIndex}`,
        index: pawn.pawnIndex,
        status: pawn.status,
        steps: pawn.steps,
      });
      pawnsBySeat[pawn.seat] = list;
    }

    const winner = players.find((player) => {
      const pawns = pawnsBySeat[player.seat] ?? [];
      return (
        pawns.length > 0 && pawns.every((pawn) => pawn.status === "finished")
      );
    });

    if (!winner) {
      return {
        ok: false as const,
        code: "NOT_READY" as const,
        message: "No player has finished all pawns yet.",
      };
    }

    const pool = Number(match.prizePool);
    const now = new Date();

    const payout = await payMatchReward(tx, {
      matchId: match.id,
      roomId: room.id,
      winnerUserId: winner.userId,
      gameType: "ludo",
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

    await tx
      .update(ludoPlayers)
      .set({ status: "finished" })
      .where(eq(ludoPlayers.userId, winner.userId));

    await tx.insert(ludoLogs).values({
      matchId: match.id,
      seat: winner.seat,
      message: `${winner.username} wins the room! Net prize ${net} BOARD (${fee} fee to treasury/burn).`,
      createdAt: now,
    });

    const [ludoMatch] = await tx
      .select()
      .from(ludoMatches)
      .where(eq(ludoMatches.matchId, match.id))
      .limit(1);

    const logs = await tx
      .select()
      .from(ludoLogs)
      .where(eq(ludoLogs.matchId, match.id))
      .orderBy(asc(ludoLogs.createdAt));

    const statusBySeat: Record<number, "alive" | "finished"> = {};
    for (const player of players) {
      statusBySeat[player.seat] =
        player.seat === winner.seat ? "finished" : player.status;
    }
    statusBySeat[winner.seat] = "finished";

    const state = buildLudoState({
      roomId: formatRoomCode(room.id, "ludo"),
      entryFee: Number(room.entryFee),
      maxPlayers: room.maxPlayers,
      activeSeat: ludoMatch?.activeSeat ?? winner.seat,
      turn: ludoMatch?.turn ?? 1,
      turnEndsAt: now,
      lastRoll: null,
      seats: players.map((player) => ({
        userId: player.userId,
        username: player.username,
        seat: player.seat,
      })),
      pawnsBySeat,
      statusBySeat,
      now,
      log: logs
        .slice()
        .reverse()
        .map((entry) => ({
          id: entry.id,
          seat: entry.seat,
          message: entry.message,
        })),
    });

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
    publishLudo({
      type: "action",
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

function settleLudoMock(roomRef: string): LudoSettleResult {
  const key = roomRef.toUpperCase();
  let state =
    MOCK_LUDO_LIVE.get(key) ??
    MOCK_LUDO_LIVE.get(roomRef) ??
    (key.startsWith("LUD-") ? structuredClone(getLudoRoom(key)) : null);

  if (!state) {
    return { ok: false, code: "NOT_FOUND", message: "Ludo room not found." };
  }

  if (state.log.some((entry) => entry.message.includes("Net prize"))) {
    return {
      ok: false,
      code: "ALREADY_SETTLED",
      message: "Prize already distributed.",
    };
  }

  const winner = detectLudoWinner(state);
  if (!winner) {
    return {
      ok: false,
      code: "NOT_READY",
      message: "No player has finished all pawns yet.",
    };
  }

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
  if (winner.userId === MOCK_PLAYER.id || winner.userId === "u_me") {
    MOCK_BALANCE.available += net;
    MOCK_BALANCE.locked = Math.max(0, MOCK_BALANCE.locked - state.entryFee);
    balanceAfter = MOCK_BALANCE.available;
  }

  const winnerPlayer = state.players.find((p) => p.position === winner.seat);
  const who = winnerPlayer?.isYou ? "You" : winner.username;

  state = {
    ...state,
    turnSecondsLeft: 0,
    lastRoll: null,
    players: state.players.map((player) =>
      player.position === winner.seat
        ? { ...player, status: "finished" as const }
        : player,
    ),
    log: [
      {
        id: `win-settle-${Date.now()}`,
        seat: winner.seat,
        message: `${who} win${winnerPlayer?.isYou ? "" : "s"} the room! Net prize ${net} BOARD (${fee} fee burned to treasury).`,
      },
      ...state.log,
    ],
  };

  MOCK_LUDO_LIVE.set(state.roomId, state);

  publishLudo({
    type: "action",
    roomId: state.roomId,
    action: "turn",
    seat: winner.seat,
    state,
    detail: {
      settled: true,
      winnerUserId: winner.userId,
      prizePool: pool,
      fee,
      netPrize: net,
    },
    source: "mock",
  });

  return {
    ok: true,
    winnerUserId: winner.userId,
    winnerSeat: winner.seat,
    winnerUsername: winner.username,
    prizePool: pool,
    fee,
    netPrize: net,
    balanceAfter,
    state,
    source: "mock",
  };
}

/** Auto-settle after a move that finished all pawns. */
export async function maybeSettleAfterLudoWin(state: LudoRoomState) {
  if (!detectLudoWinner(state)) return null;
  return settleLudoWinner(state.roomId);
}

function formatRoomCode(id: string, gameType: "monopoly" | "ludo") {
  const prefix = gameType === "monopoly" ? "MNP" : "LUD";
  const short = id.replace(/-/g, "").slice(0, 4).toUpperCase();
  return `${prefix}-${short}`;
}
