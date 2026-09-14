import { and, asc, eq } from "drizzle-orm";

import type { LudoRoomState } from "@/lib/mock/ludo";
import { getLudoRoom } from "@/lib/mock/ludo";
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
import { nextLudoSeat } from "@/server/services/ludo-capture.service";
import { MOCK_LUDO_LIVE } from "@/server/services/join-room.service";
import {
  LUDO_TURN_SECONDS,
  buildLudoState,
} from "@/server/services/ludo-start.service";

export type LudoTurnResult =
  | {
      ok: true;
      action: "leave" | "skip";
      seat: number;
      state: LudoRoomState;
      source: "database" | "mock";
    }
  | {
      ok: false;
      code:
        | "NOT_FOUND"
        | "NOT_YOUR_TURN"
        | "USER_NOT_FOUND"
        | "FINISHED"
        | "ALREADY_LEFT";
      message: string;
    };

function dbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Skip the active seat's turn (no legal move / timeout). Clears lastRoll and
 * advances to the next living player.
 */
export async function skipLudoTurn(
  roomRef: string,
  userId: string,
): Promise<LudoTurnResult> {
  if (!dbConfigured()) {
    return skipLudoMock(roomRef, userId);
  }

  const db = getDb();
  type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
  const result = await db.transaction(async (tx: Tx) => {
    const loaded = await loadMatch(tx, roomRef);
    if (!loaded.ok) return loaded;

    const { room, match, ludoMatch, players, pawnsBySeat } = loaded;
    const actor = players.find(
      (row: {
        userId: string;
        username: string;
        seat: number;
        status: "alive" | "finished";
      }) => row.userId === userId,
    );
    if (!actor) {
      return {
        ok: false as const,
        code: "USER_NOT_FOUND" as const,
        message: "You are not seated in this match.",
      };
    }
    if (actor.seat !== ludoMatch.activeSeat) {
      return {
        ok: false as const,
        code: "NOT_YOUR_TURN" as const,
        message: "Only the active seat can skip their turn.",
      };
    }

    const now = new Date();
    const draftPlayers = toStatePlayers(players, pawnsBySeat);
    const next = nextLudoSeat(draftPlayers, ludoMatch.activeSeat);
    const nextTurn = ludoMatch.turn + next.turnDelta;

    await tx
      .update(ludoMatches)
      .set({
        lastRoll: null,
        activeSeat: next.activeSeat,
        turn: nextTurn,
        turnEndsAt: new Date(now.getTime() + LUDO_TURN_SECONDS * 1000),
        updatedAt: now,
      })
      .where(eq(ludoMatches.matchId, match.id));

    await tx.insert(ludoLogs).values({
      matchId: match.id,
      seat: actor.seat,
      message: `${actor.username} skipped their turn.`,
      createdAt: now,
    });

    const state = await rebuildState(tx, room, match.id, next.activeSeat, nextTurn, now);
    return {
      ok: true as const,
      action: "skip" as const,
      seat: actor.seat,
      state,
      source: "database" as const,
    };
  });

  if (result.ok) {
    publishLudo({
      type: "action",
      roomId: result.state.roomId,
      action: "turn",
      seat: result.seat,
      state: result.state,
      detail: { skipped: true },
      source: "database",
    });
  }

  return result;
}

/**
 * Mark a player as left/finished (forfeit). Their pawns stay; they are skipped
 * in the turn order. If it was their turn, advance immediately.
 */
export async function leaveLudoMatch(
  roomRef: string,
  userId: string,
): Promise<LudoTurnResult> {
  if (!dbConfigured()) {
    return leaveLudoMock(roomRef, userId);
  }

  const db = getDb();
  type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
  const result = await db.transaction(async (tx: Tx) => {
    const loaded = await loadMatch(tx, roomRef);
    if (!loaded.ok) return loaded;

    const { room, match, ludoMatch, players, pawnsBySeat } = loaded;
    const actor = players.find(
      (row: {
        userId: string;
        username: string;
        seat: number;
        status: "alive" | "finished";
      }) => row.userId === userId,
    );
    if (!actor) {
      return {
        ok: false as const,
        code: "USER_NOT_FOUND" as const,
        message: "You are not seated in this match.",
      };
    }
    if (actor.status === "finished") {
      return {
        ok: false as const,
        code: "ALREADY_LEFT" as const,
        message: "You have already left this match.",
      };
    }

    const now = new Date();
    await tx
      .update(ludoPlayers)
      .set({ status: "finished" })
      .where(
        and(
          eq(ludoPlayers.matchId, match.id),
          eq(ludoPlayers.userId, userId),
        ),
      );

    await tx.insert(ludoLogs).values({
      matchId: match.id,
      seat: actor.seat,
      message: `${actor.username} left the match.`,
      createdAt: now,
    });

    let nextSeat = ludoMatch.activeSeat;
    let nextTurn = ludoMatch.turn;
    const wasActive = actor.seat === ludoMatch.activeSeat;

    const draftPlayers = toStatePlayers(players, pawnsBySeat).map((player) =>
      player.position === actor.seat
        ? { ...player, status: "finished" as const }
        : player,
    );

    if (wasActive) {
      const next = nextLudoSeat(draftPlayers, ludoMatch.activeSeat);
      nextSeat = next.activeSeat;
      nextTurn = ludoMatch.turn + next.turnDelta;
    }

    await tx
      .update(ludoMatches)
      .set({
        lastRoll: wasActive ? null : ludoMatch.lastRoll,
        activeSeat: nextSeat,
        turn: nextTurn,
        turnEndsAt: new Date(now.getTime() + LUDO_TURN_SECONDS * 1000),
        updatedAt: now,
      })
      .where(eq(ludoMatches.matchId, match.id));

    const state = await rebuildState(tx, room, match.id, nextSeat, nextTurn, now);
    return {
      ok: true as const,
      action: "leave" as const,
      seat: actor.seat,
      state,
      source: "database" as const,
    };
  });

  if (result.ok) {
    publishLudo({
      type: "action",
      roomId: result.state.roomId,
      action: "turn",
      seat: result.seat,
      state: result.state,
      detail: { left: true },
      source: "database",
    });
  }

  return result;
}

function skipLudoMock(roomRef: string, userId: string): LudoTurnResult {
  const state = loadMock(roomRef);
  if (!state) {
    return { ok: false, code: "NOT_FOUND", message: "Ludo room not found." };
  }

  const actor = state.players.find((player) => player.id === userId);
  if (!actor) {
    return {
      ok: false,
      code: "USER_NOT_FOUND",
      message: "You are not seated in this match.",
    };
  }
  if (actor.position !== state.activeSeat) {
    return {
      ok: false,
      code: "NOT_YOUR_TURN",
      message: "Only the active seat can skip their turn.",
    };
  }

  const who = actor.isYou ? "You" : actor.username;
  const next = nextLudoSeat(state.players, state.activeSeat);
  const nextState: LudoRoomState = {
    ...state,
    lastRoll: null,
    activeSeat: next.activeSeat,
    turn: state.turn + next.turnDelta,
    turnSecondsLeft: LUDO_TURN_SECONDS,
    log: [
      {
        id: `skip-${Date.now()}`,
        seat: actor.position,
        message: `${who} skipped their turn.`,
      },
      ...state.log,
    ],
  };

  MOCK_LUDO_LIVE.set(nextState.roomId, nextState);
  publishLudo({
    type: "action",
    roomId: nextState.roomId,
    action: "turn",
    seat: actor.position,
    state: nextState,
    detail: { skipped: true },
    source: "mock",
  });

  return {
    ok: true,
    action: "skip",
    seat: actor.position,
    state: nextState,
    source: "mock",
  };
}

function leaveLudoMock(roomRef: string, userId: string): LudoTurnResult {
  const state = loadMock(roomRef);
  if (!state) {
    return { ok: false, code: "NOT_FOUND", message: "Ludo room not found." };
  }

  const actor = state.players.find((player) => player.id === userId);
  if (!actor) {
    return {
      ok: false,
      code: "USER_NOT_FOUND",
      message: "You are not seated in this match.",
    };
  }
  if (actor.status === "finished") {
    return {
      ok: false,
      code: "ALREADY_LEFT",
      message: "You have already left this match.",
    };
  }

  const who = actor.isYou ? "You" : actor.username;
  const players = state.players.map((player) =>
    player.id === userId
      ? { ...player, status: "finished" as const }
      : player,
  );

  let activeSeat = state.activeSeat;
  let turn = state.turn;
  let lastRoll = state.lastRoll;
  if (actor.position === state.activeSeat) {
    const next = nextLudoSeat(players, state.activeSeat);
    activeSeat = next.activeSeat;
    turn += next.turnDelta;
    lastRoll = null;
  }

  const nextState: LudoRoomState = {
    ...state,
    players,
    activeSeat,
    turn,
    lastRoll,
    turnSecondsLeft: LUDO_TURN_SECONDS,
    log: [
      {
        id: `leave-${Date.now()}`,
        seat: actor.position,
        message: `${who} left the match.`,
      },
      ...state.log,
    ],
  };

  MOCK_LUDO_LIVE.set(nextState.roomId, nextState);
  publishLudo({
    type: "action",
    roomId: nextState.roomId,
    action: "turn",
    seat: actor.position,
    state: nextState,
    detail: { left: true },
    source: "mock",
  });

  return {
    ok: true,
    action: "leave",
    seat: actor.position,
    state: nextState,
    source: "mock",
  };
}

function loadMock(roomRef: string) {
  const key = roomRef.toUpperCase();
  const live =
    MOCK_LUDO_LIVE.get(key) ??
    MOCK_LUDO_LIVE.get(roomRef) ??
    (key.startsWith("LUD-") ? structuredClone(getLudoRoom(key)) : null);
  if (live) MOCK_LUDO_LIVE.set(live.roomId, live);
  return live;
}

type DbTx = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];

async function loadMatch(tx: DbTx, roomRef: string) {
  const roomRows = await tx.select().from(rooms);
  const room = roomRows.find(
    (row: { id: string; gameType: string }) =>
      row.id === roomRef ||
      formatRoomCode(row.id, row.gameType as "monopoly" | "ludo") ===
        roomRef.toUpperCase(),
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
    .limit(1);
  if (!match || match.status !== "ongoing") {
    return {
      ok: false as const,
      code: "FINISHED" as const,
      message: "This match is not in progress.",
    };
  }

  const [ludoMatch] = await tx
    .select()
    .from(ludoMatches)
    .where(eq(ludoMatches.matchId, match.id))
    .limit(1)
    .for("update");
  if (!ludoMatch) {
    return {
      ok: false as const,
      code: "NOT_FOUND" as const,
      message: "Ludo match state missing.",
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
    {
      id: string;
      index: number;
      status: "yard" | "track" | "home" | "finished";
      steps: number;
    }[]
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

  return {
    ok: true as const,
    room,
    match,
    ludoMatch,
    players,
    pawnsBySeat,
  };
}

function toStatePlayers(
  players: {
    userId: string;
    username: string;
    seat: number;
    status: "alive" | "finished";
  }[],
  pawnsBySeat: Record<
    number,
    {
      id: string;
      index: number;
      status: "yard" | "track" | "home" | "finished";
      steps: number;
    }[]
  >,
) {
  return players.map((player) => ({
    id: player.userId,
    username: player.username,
    position: player.seat,
    status: player.status,
    pawns: pawnsBySeat[player.seat] ?? [],
    isYou: false,
  }));
}

async function rebuildState(
  tx: DbTx,
  room: { id: string; entryFee: string | number; maxPlayers: number },
  matchId: string,
  activeSeat: number,
  turn: number,
  now: Date,
) {
  const players = await tx
    .select({
      userId: ludoPlayers.userId,
      username: users.username,
      seat: ludoPlayers.seat,
      status: ludoPlayers.status,
    })
    .from(ludoPlayers)
    .innerJoin(users, eq(users.id, ludoPlayers.userId))
    .where(eq(ludoPlayers.matchId, matchId))
    .orderBy(asc(ludoPlayers.seat));

  const pawnRows = await tx
    .select()
    .from(ludoPawns)
    .where(eq(ludoPawns.matchId, matchId));

  const logs = await tx
    .select()
    .from(ludoLogs)
    .where(eq(ludoLogs.matchId, matchId))
    .orderBy(asc(ludoLogs.createdAt));

  const pawnsBySeat: Record<
    number,
    {
      id: string;
      index: number;
      status: "yard" | "track" | "home" | "finished";
      steps: number;
    }[]
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

  const statusBySeat: Record<number, "alive" | "finished"> = {};
  for (const player of players) statusBySeat[player.seat] = player.status;

  return buildLudoState({
    roomId: formatRoomCode(room.id, "ludo"),
    entryFee: Number(room.entryFee),
    maxPlayers: room.maxPlayers,
    activeSeat,
    turn,
    turnEndsAt: new Date(now.getTime() + LUDO_TURN_SECONDS * 1000),
    lastRoll: null,
    seats: players.map(
      (player: {
        userId: string;
        username: string;
        seat: number;
      }) => ({
        userId: player.userId,
        username: player.username,
        seat: player.seat,
      }),
    ),
    pawnsBySeat,
    statusBySeat,
    now,
    log: logs
      .slice()
      .reverse()
      .map((entry: { id: string; seat: number | null; message: string }) => ({
        id: entry.id,
        seat: entry.seat,
        message: entry.message,
      })),
  });
}

function formatRoomCode(id: string, gameType: "monopoly" | "ludo") {
  const prefix = gameType === "monopoly" ? "MNP" : "LUD";
  const short = id.replace(/-/g, "").slice(0, 4).toUpperCase();
  return `${prefix}-${short}`;
}
