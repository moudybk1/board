import { and, asc, eq } from "drizzle-orm";

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
  users,
} from "@/server/db/schema";
import { MOCK_LUDO_LIVE } from "@/server/services/join-room.service";
import { buildLudoState } from "@/server/services/ludo-start.service";
import { isDbConfigured as dbConfigured } from "@/server/lib/db-config";
import {
  findRoomByRef,
  formatRoomCode,
} from "@/server/db/repositories/rooms.repository";

/**
 * Resolve the live Ludo board for a lobby room code (or UUID).
 */
export async function getLudoState(
  roomRef: string,
): Promise<{ state: LudoRoomState; source: "database" | "mock" } | null> {
  const key = roomRef.toUpperCase();

  if (!dbConfigured()) {
    const live = MOCK_LUDO_LIVE.get(key) ?? MOCK_LUDO_LIVE.get(roomRef);
    if (live) return { state: live, source: "mock" };
    if (key.startsWith("LUD-") || key === "LUD-WIN") {
      return { state: getLudoRoom(key), source: "mock" };
    }
    return null;
  }

  const db = getDb();
  const room = await findRoomByRef(db, roomRef);

  if (!room || room.gameType !== "ludo") return null;

  const [match] = await db
    .select()
    .from(matches)
    .where(and(eq(matches.roomId, room.id), eq(matches.gameType, "ludo")))
    .limit(1);

  if (!match) return null;

  const [ludoMatch] = await db
    .select()
    .from(ludoMatches)
    .where(eq(ludoMatches.matchId, match.id))
    .limit(1);

  if (!ludoMatch) return null;

  const players = await db
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

  const pawnRows = await db
    .select()
    .from(ludoPawns)
    .where(eq(ludoPawns.matchId, match.id));

  const logs = await db
    .select()
    .from(ludoLogs)
    .where(eq(ludoLogs.matchId, match.id))
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
  for (const player of players) {
    statusBySeat[player.seat] = player.status;
  }

  const state = buildLudoState({
    roomId: formatRoomCode(room.id, "ludo"),
    entryFee: Number(room.entryFee),
    maxPlayers: room.maxPlayers,
    activeSeat: ludoMatch.activeSeat,
    turn: ludoMatch.turn,
    turnEndsAt: ludoMatch.turnEndsAt,
    lastRoll: ludoMatch.lastRoll,
    seats: players.map((player) => ({
      userId: player.userId,
      username: player.username,
      seat: player.seat,
    })),
    pawnsBySeat,
    statusBySeat,
    log: logs
      .slice()
      .reverse()
      .map((entry) => ({
        id: entry.id,
        seat: entry.seat,
        message: entry.message,
      })),
  });

  return { state, source: "database" };
}

