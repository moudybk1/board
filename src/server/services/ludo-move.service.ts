import type { DieValue } from "@/lib/game/dice";
import { movablePawns } from "@/lib/game/ludo-rules";
import {
  getLudoRoom,
  type LudoPawn,
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
  applyLudoCaptures,
  grantsLudoExtraTurn,
  nextLudoSeat,
} from "@/server/services/ludo-capture.service";
import { maybeSettleAfterLudoWin } from "@/server/services/ludo-settle.service";
import { resetLudoSixStreak } from "@/server/services/ludo-roll.service";
import {
  LUDO_TURN_SECONDS,
  buildLudoState,
} from "@/server/services/ludo-start.service";
import { and, asc, eq } from "drizzle-orm";
import { findCaptures } from "@/lib/game/ludo-rules";

export type LudoMoveResult =
  | {
      ok: true;
      pawnId: string;
      seat: number;
      roll: DieValue;
      captures: { victimSeat: number; victimPawnId: string }[];
      extraTurn: boolean;
      won: boolean;
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
        | "NO_ROLL"
        | "ILLEGAL_MOVE";
      message: string;
    };

function dbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Apply a legal Ludo pawn move for the active seat using the stored lastRoll.
 * Validates against `movablePawns`, applies captures, grants an extra turn on
 * a 6 or a capture.
 */
export async function moveLudoPawn(
  roomRef: string,
  userId: string,
  pawnId: string,
): Promise<LudoMoveResult> {
  if (!dbConfigured()) {
    return moveLudoMock(roomRef, userId, pawnId);
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

    if (ludoMatch.lastRoll === null) {
      return {
        ok: false as const,
        code: "NO_ROLL" as const,
        message: "Roll the die before moving.",
      };
    }

    const roll = ludoMatch.lastRoll as DieValue;

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

    const mover = playerRows.find((row) => row.userId === userId);
    if (!mover) {
      return {
        ok: false as const,
        code: "USER_NOT_FOUND" as const,
        message: "You are not seated in this match.",
      };
    }
    if (mover.seat !== ludoMatch.activeSeat) {
      return {
        ok: false as const,
        code: "NOT_YOUR_TURN" as const,
        message: "It is not your turn.",
      };
    }

    const pawnRows = await tx
      .select()
      .from(ludoPawns)
      .where(eq(ludoPawns.matchId, match.id));

    const pawnsBySeat = groupPawns(pawnRows);
    const statusBySeat: Record<number, "alive" | "finished"> = {};
    for (const player of playerRows) statusBySeat[player.seat] = player.status;

    const draft = buildLudoState({
      roomId: formatRoomCode(room.id, "ludo"),
      entryFee: Number(room.entryFee),
      maxPlayers: room.maxPlayers,
      activeSeat: ludoMatch.activeSeat,
      turn: ludoMatch.turn,
      turnEndsAt: ludoMatch.turnEndsAt,
      lastRoll: roll,
      seats: playerRows.map((player) => ({
        userId: player.userId,
        username: player.username,
        seat: player.seat,
      })),
      pawnsBySeat,
      statusBySeat,
    });

    const moverState = draft.players.find((p) => p.position === mover.seat)!;
    const legal = movablePawns(draft, moverState, roll);
    const chosen = legal.find((move) => move.pawnId === pawnId);
    if (!chosen) {
      return {
        ok: false as const,
        code: "ILLEGAL_MOVE" as const,
        message: "That pawn cannot move with this roll.",
      };
    }

    const captures = findCaptures(draft, mover.seat, chosen.next);
    const now = new Date();
    const extraTurn = grantsLudoExtraTurn(
      roll,
      chosen.next,
      captures.length > 0,
    );

    const pawnIndex = chosen.next.index;
    await tx
      .update(ludoPawns)
      .set({
        status: chosen.next.status,
        steps: chosen.next.steps,
      })
      .where(
        and(
          eq(ludoPawns.matchId, match.id),
          eq(ludoPawns.seat, mover.seat),
          eq(ludoPawns.pawnIndex, pawnIndex),
        ),
      );

    for (const hit of captures) {
      const victimIndex = Number(hit.victimPawnId.split("-").pop());
      await tx
        .update(ludoPawns)
        .set({ status: "yard", steps: 0 })
        .where(
          and(
            eq(ludoPawns.matchId, match.id),
            eq(ludoPawns.seat, hit.victimSeat),
            eq(ludoPawns.pawnIndex, victimIndex),
          ),
        );
    }

    const moverPawns = (pawnsBySeat[mover.seat] ?? []).map((pawn) =>
      pawn.id === pawnId ? chosen.next : pawn,
    );
    const won = moverPawns.every((pawn) => pawn.status === "finished");
    if (won) {
      await tx
        .update(ludoPlayers)
        .set({ status: "finished" })
        .where(
          and(
            eq(ludoPlayers.matchId, match.id),
            eq(ludoPlayers.userId, userId),
          ),
        );
    }

    let nextSeat = ludoMatch.activeSeat;
    let nextTurn = ludoMatch.turn;
    if (!extraTurn) {
      const draftAfterMove = {
        ...draft,
        players: draft.players.map((player) => {
          if (player.position !== mover.seat) return player;
          const nextPawns = player.pawns.map((pawn) =>
            pawn.id === pawnId ? chosen.next : pawn,
          );
          return {
            ...player,
            pawns: nextPawns,
            status: nextPawns.every((pawn) => pawn.status === "finished")
              ? ("finished" as const)
              : player.status,
          };
        }),
      };
      const next = nextLudoSeat(draftAfterMove.players, ludoMatch.activeSeat);
      nextSeat = next.activeSeat;
      nextTurn = ludoMatch.turn + next.turnDelta;
      resetLudoSixStreak(match.id);
    }

    await tx
      .update(ludoMatches)
      .set({
        lastRoll: null,
        activeSeat: nextSeat,
        turn: nextTurn,
        turnEndsAt: new Date(now.getTime() + LUDO_TURN_SECONDS * 1000),
        updatedAt: now,
      })
      .where(eq(ludoMatches.matchId, match.id));

    await tx.insert(ludoLogs).values({
      matchId: match.id,
      seat: mover.seat,
      message: `${mover.username} moved a pawn.`,
      createdAt: now,
    });

    for (const hit of captures) {
      const victim = playerRows.find((row) => row.seat === hit.victimSeat);
      await tx.insert(ludoLogs).values({
        matchId: match.id,
        seat: mover.seat,
        message: `${mover.username} captured ${victim?.username ?? "a rival"}'s pawn!`,
        createdAt: new Date(now.getTime() + 1),
      });
    }

    if (extraTurn) {
      await tx.insert(ludoLogs).values({
        matchId: match.id,
        seat: mover.seat,
        message:
          captures.length > 0
            ? `${mover.username} captured · roll again.`
            : `${mover.username} rolled a 6 · roll again.`,
        createdAt: new Date(now.getTime() + 2),
      });
    }

    // Reload pawns for response state
    const refreshedPawns = await tx
      .select()
      .from(ludoPawns)
      .where(eq(ludoPawns.matchId, match.id));
    const refreshedPlayers = await tx
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

    const logs = await tx
      .select()
      .from(ludoLogs)
      .where(eq(ludoLogs.matchId, match.id))
      .orderBy(asc(ludoLogs.createdAt));

    const nextStatus: Record<number, "alive" | "finished"> = {};
    for (const player of refreshedPlayers) {
      nextStatus[player.seat] = player.status;
    }

    const state = buildLudoState({
      roomId: formatRoomCode(room.id, "ludo"),
      entryFee: Number(room.entryFee),
      maxPlayers: room.maxPlayers,
      activeSeat: nextSeat,
      turn: nextTurn,
      turnEndsAt: new Date(now.getTime() + LUDO_TURN_SECONDS * 1000),
      lastRoll: null,
      seats: refreshedPlayers.map((player) => ({
        userId: player.userId,
        username: player.username,
        seat: player.seat,
      })),
      pawnsBySeat: groupPawns(refreshedPawns),
      statusBySeat: nextStatus,
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
      pawnId,
      seat: mover.seat,
      roll,
      captures: captures.map((hit) => ({
        victimSeat: hit.victimSeat,
        victimPawnId: hit.victimPawnId,
      })),
      extraTurn,
      won,
      state,
      source: "database" as const,
    };
  });

  if (result.ok) {
    publishLudo({
      type: "action",
      roomId: result.state.roomId,
      action: result.captures.length > 0 ? "capture" : "move",
      seat: result.seat,
      state: result.state,
      detail: {
        pawnId: result.pawnId,
        roll: result.roll,
        captures: result.captures,
        extraTurn: result.extraTurn,
        won: result.won,
      },
      source: "database",
    });

    if (result.won) {
      await maybeSettleAfterLudoWin(result.state);
    }
  }

  return result;
}

function moveLudoMock(
  roomRef: string,
  userId: string,
  pawnId: string,
): LudoMoveResult {
  const key = roomRef.toUpperCase();
  let state =
    MOCK_LUDO_LIVE.get(key) ??
    MOCK_LUDO_LIVE.get(roomRef) ??
    (key.startsWith("LUD-") ? structuredClone(getLudoRoom(key)) : null);

  if (!state) {
    return { ok: false, code: "NOT_FOUND", message: "Ludo room not found." };
  }
  const board = state;
  MOCK_LUDO_LIVE.set(board.roomId, board);

  if (board.lastRoll === null) {
    return {
      ok: false,
      code: "NO_ROLL",
      message: "Roll the die before moving.",
    };
  }

  const roll = board.lastRoll as DieValue;
  const mover = board.players.find((player) => player.id === userId);
  if (!mover) {
    return {
      ok: false,
      code: "USER_NOT_FOUND",
      message: "You are not seated in this match.",
    };
  }
  if (mover.position !== board.activeSeat) {
    return {
      ok: false,
      code: "NOT_YOUR_TURN",
      message: "It is not your turn.",
    };
  }

  const legal = movablePawns(board, mover, roll);
  const chosen = legal.find((move) => move.pawnId === pawnId);
  if (!chosen) {
    return {
      ok: false,
      code: "ILLEGAL_MOVE",
      message: "That pawn cannot move with this roll.",
    };
  }

  const { players: afterCaptures, captures } = applyLudoCaptures(
    {
      ...board,
      players: board.players.map((player) =>
        player.position === mover.position
          ? {
              ...player,
              pawns: player.pawns.map((pawn) =>
                pawn.id === pawnId ? chosen.next : pawn,
              ),
            }
          : player,
      ),
    },
    mover.position,
    chosen.next,
  );

  const players = afterCaptures.map((player) => {
    if (player.position !== mover.position) return player;
    return {
      ...player,
      status: player.pawns.every((pawn) => pawn.status === "finished")
        ? ("finished" as const)
        : player.status,
    };
  });

  const updatedMover = players.find((p) => p.position === mover.position)!;
  const won = updatedMover.status === "finished";
  const extraTurn = grantsLudoExtraTurn(
    roll,
    chosen.next,
    captures.length > 0,
  );

  let activeSeat = board.activeSeat;
  let turn = board.turn;
  if (!extraTurn) {
    const next = nextLudoSeat(players, board.activeSeat);
    activeSeat = next.activeSeat;
    turn += next.turnDelta;
    resetLudoSixStreak(board.roomId);
  }

  const who = mover.isYou ? "You" : mover.username;

  const log = [
    ...captures.map((hit, index) => {
      const victim = board.players.find((p) => p.position === hit.victimSeat);
      return {
        id: `cap-${Date.now()}-${index}`,
        seat: mover.position,
        message: `${who} captured ${victim?.username ?? "a rival"}'s pawn!`,
      };
    }),
    {
      id: `move-${Date.now()}`,
      seat: mover.position,
      message: `${who} moved a pawn.`,
    },
    ...board.log,
  ];

  if (won) {
    log.unshift({
      id: `win-${Date.now()}`,
      seat: mover.position,
      message: `${who} win${mover.isYou ? "" : "s"} the room!`,
    });
  } else if (extraTurn) {
    log.unshift({
      id: `extra-${Date.now()}`,
      seat: mover.position,
      message:
        captures.length > 0
          ? `${who} captured · roll again.`
          : `${who} rolled a 6 · roll again.`,
    });
  }

  state = {
    ...board,
    players,
    activeSeat,
    turn,
    lastRoll: null,
    turnSecondsLeft: LUDO_TURN_SECONDS,
    log,
  };

  MOCK_LUDO_LIVE.set(state.roomId, state);

  publishLudo({
    type: "action",
    roomId: state.roomId,
    action: captures.length > 0 ? "capture" : "move",
    seat: mover.position,
    state,
    detail: {
      pawnId,
      roll,
      captures: captures.map((hit) => ({
        victimSeat: hit.victimSeat,
        victimPawnId: hit.victimPawnId,
      })),
      extraTurn,
      won,
    },
    source: "mock",
  });

  const payload = {
    ok: true as const,
    pawnId,
    seat: mover.position,
    roll,
    captures: captures.map((hit) => ({
      victimSeat: hit.victimSeat,
      victimPawnId: hit.victimPawnId,
    })),
    extraTurn,
    won,
    state,
    source: "mock" as const,
  };

  if (won) {
    void maybeSettleAfterLudoWin(state);
  }

  return payload;
}

function groupPawns(
  rows: {
    seat: number;
    pawnIndex: number;
    status: LudoPawn["status"];
    steps: number;
  }[],
) {
  const pawnsBySeat: Record<number, LudoPawn[]> = {};
  for (const pawn of rows) {
    const list = pawnsBySeat[pawn.seat] ?? [];
    list.push({
      id: `p${pawn.seat}-${pawn.pawnIndex}`,
      index: pawn.pawnIndex,
      status: pawn.status,
      steps: pawn.steps,
    });
    pawnsBySeat[pawn.seat] = list;
  }
  return pawnsBySeat;
}

function formatRoomCode(id: string, gameType: "monopoly" | "ludo") {
  const prefix = gameType === "monopoly" ? "MNP" : "LUD";
  const short = id.replace(/-/g, "").slice(0, 4).toUpperCase();
  return `${prefix}-${short}`;
}
