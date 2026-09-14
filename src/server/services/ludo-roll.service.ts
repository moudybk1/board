import { asc, eq } from "drizzle-orm";

import { randomDie, type DieValue } from "@/lib/game/dice";
import {
  movablePawns,
  nextActiveSeat,
  registerNonSixRoll,
  registerSixRoll,
} from "@/lib/game/ludo-rules";
import {
  getLudoRoom,
  type LudoRoomState,
} from "@/lib/mock/ludo";
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
import {
  LUDO_TURN_SECONDS,
  buildLudoState,
} from "@/server/services/ludo-start.service";

/** Consecutive 6s in the current turn, keyed by room / match id. */
export const ludoSixStreak = new Map<string, number>();

export function resetLudoSixStreak(roomKey: string) {
  ludoSixStreak.set(roomKey, 0);
}

export type LudoLegalMove = {
  pawnId: string;
  pawnIndex: number;
  nextStatus: "yard" | "track" | "home" | "finished";
  nextSteps: number;
};

export type LudoRollResult =
  | {
      ok: true;
      roll: DieValue;
      seat: number;
      legalMoves: LudoLegalMove[];
      state: LudoRoomState;
      source: "database" | "mock";
    }
  | {
      ok: false;
      code:
        | "NOT_FOUND"
        | "NOT_YOUR_TURN"
        | "FINISHED"
        | "USER_NOT_FOUND"
        | "ALREADY_ROLLED";
      message: string;
    };

function dbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Authoritative single-die roll for Ludo. Stores `lastRoll` and returns the
 * legal pawn moves so the client can pick (or auto-move when only one).
 */
export async function rollLudo(
  roomRef: string,
  userId: string,
): Promise<LudoRollResult> {
  if (!dbConfigured()) {
    return rollLudoMock(roomRef, userId);
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

    if (ludoMatch.lastRoll !== null) {
      return {
        ok: false as const,
        code: "ALREADY_ROLLED" as const,
        message: "Move a pawn (or end the turn) before rolling again.",
      };
    }

    const playerRows = await tx
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

    const roller = playerRows.find((row) => row.userId === userId);
    if (!roller) {
      return {
        ok: false as const,
        code: "USER_NOT_FOUND" as const,
        message: "You are not seated in this match.",
      };
    }
    if (roller.status === "finished") {
      return {
        ok: false as const,
        code: "FINISHED" as const,
        message: "Finished players cannot roll.",
      };
    }
    if (roller.seat !== ludoMatch.activeSeat) {
      return {
        ok: false as const,
        code: "NOT_YOUR_TURN" as const,
        message: "It is not your turn.",
      };
    }

    const roll = randomDie();
    const now = new Date();
    const turnEndsAt = new Date(now.getTime() + LUDO_TURN_SECONDS * 1000);
    const streakKey = match.id;

    if (roll === 6) {
      const { nextCount, voided } = registerSixRoll(
        ludoSixStreak.get(streakKey) ?? 0,
      );
      ludoSixStreak.set(streakKey, nextCount);
      if (voided) {
        // Build a minimal draft to advance the seat.
        const pawnRowsEarly = await tx
          .select()
          .from(ludoPawns)
          .where(eq(ludoPawns.matchId, match.id));
        const pawnsBySeatEarly: Record<
          number,
          {
            id: string;
            index: number;
            status: "yard" | "track" | "home" | "finished";
            steps: number;
          }[]
        > = {};
        for (const pawn of pawnRowsEarly) {
          const list = pawnsBySeatEarly[pawn.seat] ?? [];
          list.push({
            id: `p${pawn.seat}-${pawn.pawnIndex}`,
            index: pawn.pawnIndex,
            status: pawn.status,
            steps: pawn.steps,
          });
          pawnsBySeatEarly[pawn.seat] = list;
        }
        const draftEarly = buildLudoState({
          roomId: formatRoomCode(room.id, "ludo"),
          entryFee: Number(room.entryFee),
          maxPlayers: room.maxPlayers,
          activeSeat: ludoMatch.activeSeat,
          turn: ludoMatch.turn,
          turnEndsAt,
          lastRoll: null,
          seats: playerRows.map((player) => ({
            userId: player.userId,
            username: player.username,
            seat: player.seat,
          })),
          pawnsBySeat: pawnsBySeatEarly,
          statusBySeat: Object.fromEntries(
            playerRows.map((p) => [p.seat, p.status]),
          ),
          now,
          log: [],
        });
        const next = nextActiveSeat(draftEarly.players, ludoMatch.activeSeat);
        await tx
          .update(ludoMatches)
          .set({
            lastRoll: null,
            activeSeat: next.activeSeat,
            turn: ludoMatch.turn + next.turnDelta,
            turnEndsAt,
            updatedAt: now,
          })
          .where(eq(ludoMatches.matchId, match.id));
        await tx.insert(ludoLogs).values({
          matchId: match.id,
          seat: roller.seat,
          message: `${roller.username} rolled a third 6 · turn forfeited.`,
          createdAt: now,
        });
        const state = {
          ...draftEarly,
          activeSeat: next.activeSeat,
          turn: ludoMatch.turn + next.turnDelta,
          lastRoll: null,
        };
        return {
          ok: true as const,
          roll,
          seat: roller.seat,
          legalMoves: [] as LudoLegalMove[],
          state,
          source: "database" as const,
        };
      }
    } else {
      ludoSixStreak.set(streakKey, registerNonSixRoll().nextCount);
    }

    await tx
      .update(ludoMatches)
      .set({ lastRoll: roll, turnEndsAt, updatedAt: now })
      .where(eq(ludoMatches.matchId, match.id));

    await tx.insert(ludoLogs).values({
      matchId: match.id,
      seat: roller.seat,
      message: `${roller.username} rolled a ${roll}.`,
      createdAt: now,
    });

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

    const statusBySeat: Record<number, "alive" | "finished"> = {};
    for (const player of playerRows) {
      statusBySeat[player.seat] = player.status;
    }

    const logs = await tx
      .select()
      .from(ludoLogs)
      .where(eq(ludoLogs.matchId, match.id))
      .orderBy(asc(ludoLogs.createdAt));

    const state = buildLudoState({
      roomId: formatRoomCode(room.id, "ludo"),
      entryFee: Number(room.entryFee),
      maxPlayers: room.maxPlayers,
      activeSeat: ludoMatch.activeSeat,
      turn: ludoMatch.turn,
      turnEndsAt,
      lastRoll: roll,
      seats: playerRows.map((player) => ({
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

    const rollerState = state.players.find((p) => p.position === roller.seat)!;
    const legalMoves = movablePawns(state, rollerState, roll).map((move) => ({
      pawnId: move.pawnId,
      pawnIndex: move.next.index,
      nextStatus: move.next.status,
      nextSteps: move.next.steps,
    }));

    if (legalMoves.length === 0) {
      await tx.insert(ludoLogs).values({
        matchId: match.id,
        seat: roller.seat,
        message: `${roller.username} has no legal moves.`,
        createdAt: new Date(now.getTime() + 1),
      });
    }

    return {
      ok: true as const,
      roll,
      seat: roller.seat,
      legalMoves,
      state,
      source: "database" as const,
    };
  });

  if (result.ok) {
    publishLudo({
      type: "action",
      roomId: result.state.roomId,
      action: "roll",
      seat: result.seat,
      state: result.state,
      detail: {
        roll: result.roll,
        legalMoves: result.legalMoves,
      },
      source: "database",
    });
  }

  return result;
}

function rollLudoMock(roomRef: string, userId: string): LudoRollResult {
  const key = roomRef.toUpperCase();
  let state =
    MOCK_LUDO_LIVE.get(key) ??
    MOCK_LUDO_LIVE.get(roomRef) ??
    (key.startsWith("LUD-") ? structuredClone(getLudoRoom(key)) : null);

  if (!state) {
    return { ok: false, code: "NOT_FOUND", message: "Ludo room not found." };
  }

  MOCK_LUDO_LIVE.set(state.roomId, state);

  const roller = state.players.find((player) => player.id === userId);
  if (!roller) {
    return {
      ok: false,
      code: "USER_NOT_FOUND",
      message: "You are not seated in this match.",
    };
  }
  if (roller.position !== state.activeSeat) {
    return {
      ok: false,
      code: "NOT_YOUR_TURN",
      message: "It is not your turn.",
    };
  }
  if (state.lastRoll !== null) {
    return {
      ok: false,
      code: "ALREADY_ROLLED",
      message: "Move a pawn (or end the turn) before rolling again.",
    };
  }

  const roll = randomDie();
  const who = roller.isYou ? "You" : roller.username;
  const streakKey = state.roomId;

  if (roll === 6) {
    const { nextCount, voided } = registerSixRoll(
      ludoSixStreak.get(streakKey) ?? 0,
    );
    ludoSixStreak.set(streakKey, nextCount);
    if (voided) {
      const next = nextActiveSeat(state.players, state.activeSeat);
      state = {
        ...state,
        lastRoll: null,
        activeSeat: next.activeSeat,
        turn: state.turn + next.turnDelta,
        turnSecondsLeft: LUDO_TURN_SECONDS,
        log: [
          {
            id: `six3-${Date.now()}`,
            seat: roller.position,
            message: `${who} rolled a third 6 · turn forfeited.`,
          },
          ...state.log,
        ],
      };
      MOCK_LUDO_LIVE.set(state.roomId, state);
      publishLudo({
        type: "action",
        roomId: state.roomId,
        action: "roll",
        seat: roller.position,
        state,
        detail: { roll, legalMoves: [], voided: true },
        source: "mock",
      });
      return {
        ok: true,
        roll,
        seat: roller.position,
        legalMoves: [],
        state,
        source: "mock",
      };
    }
  } else {
    ludoSixStreak.set(streakKey, registerNonSixRoll().nextCount);
  }

  const legalPreview = movablePawns(state, roller, roll);
  const legalMoves: LudoLegalMove[] = legalPreview.map((move) => ({
    pawnId: move.pawnId,
    pawnIndex: move.next.index,
    nextStatus: move.next.status,
    nextSteps: move.next.steps,
  }));

  state = {
    ...state,
    lastRoll: roll,
    turnSecondsLeft: LUDO_TURN_SECONDS,
    log: [
      ...(legalMoves.length === 0
        ? [
            {
              id: `nomove-${Date.now()}`,
              seat: roller.position,
              message: `${who} ${roller.isYou ? "have" : "has"} no legal moves.`,
            },
          ]
        : []),
      {
        id: `roll-${Date.now()}`,
        seat: roller.position,
        message: `${who} rolled a ${roll}.`,
      },
      ...state.log,
    ],
  };

  MOCK_LUDO_LIVE.set(state.roomId, state);

  publishLudo({
    type: "action",
    roomId: state.roomId,
    action: "roll",
    seat: roller.position,
    state,
    detail: { roll, legalMoves },
    source: "mock",
  });

  return {
    ok: true,
    roll,
    seat: roller.position,
    legalMoves,
    state,
    source: "mock",
  };
}

function formatRoomCode(id: string, gameType: "monopoly" | "ludo") {
  const prefix = gameType === "monopoly" ? "MNP" : "LUD";
  const short = id.replace(/-/g, "").slice(0, 4).toUpperCase();
  return `${prefix}-${short}`;
}
