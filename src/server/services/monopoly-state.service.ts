import { and, asc, eq } from "drizzle-orm";

import {
  getMonopolyRoom,
  type MonopolyRoomState,
} from "@/lib/mock/monopoly";
import { getDb } from "@/server/db";
import {
  matches,
  monopolyLogs,
  monopolyMatches,
  monopolyPlayers,
  monopolyProperties,
  rooms,
  users,
} from "@/server/db/schema";
import { MOCK_MONOPOLY_LIVE } from "@/server/services/join-room.service";
import { buildMonopolyState } from "@/server/services/monopoly-start.service";

function dbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Resolve the live Monopoly board for a lobby room code (or UUID).
 * Prefers in-memory mock live state, then static mock snapshot, then DB.
 */
export async function getMonopolyState(
  roomRef: string,
): Promise<{ state: MonopolyRoomState; source: "database" | "mock" } | null> {
  const key = roomRef.toUpperCase();

  if (!dbConfigured()) {
    const live = MOCK_MONOPOLY_LIVE.get(key) ?? MOCK_MONOPOLY_LIVE.get(roomRef);
    if (live) return { state: live, source: "mock" };
    // Static demo boards for any MNP-* code the UI already knows.
    if (key.startsWith("MNP-") || key === "MNP-WIN") {
      return { state: getMonopolyRoom(key), source: "mock" };
    }
    return null;
  }

  const db = getDb();
  const roomRows = await db.select().from(rooms);
  const room = roomRows.find(
    (row) =>
      row.id === roomRef ||
      formatRoomCode(row.id, row.gameType) === key,
  );

  if (!room || room.gameType !== "monopoly") return null;

  const [match] = await db
    .select()
    .from(matches)
    .where(and(eq(matches.roomId, room.id), eq(matches.gameType, "monopoly")))
    .limit(1);

  if (!match) {
    // Waiting room · no Monopoly match yet.
    return null;
  }

  const [mono] = await db
    .select()
    .from(monopolyMatches)
    .where(eq(monopolyMatches.matchId, match.id))
    .limit(1);

  if (!mono) return null;

  const players = await db
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

  const props = await db
    .select()
    .from(monopolyProperties)
    .where(eq(monopolyProperties.matchId, match.id));

  const logs = await db
    .select()
    .from(monopolyLogs)
    .where(eq(monopolyLogs.matchId, match.id))
    .orderBy(asc(monopolyLogs.createdAt));

  const owners: Record<number, number> = {};
  for (const prop of props) {
    owners[prop.tileIndex] = prop.ownerSeat;
  }

  const cashBySeat: Record<number, number> = {};
  const tileBySeat: Record<number, number> = {};
  const statusBySeat: Record<
    number,
    "alive" | "eliminated" | "finished"
  > = {};
  for (const player of players) {
    cashBySeat[player.seat] = Number(player.cash);
    tileBySeat[player.seat] = player.tile;
    statusBySeat[player.seat] = player.status;
  }

  const state = buildMonopolyState({
    roomId: formatRoomCode(room.id, "monopoly"),
    entryFee: Number(room.entryFee),
    maxPlayers: room.maxPlayers,
    activeSeat: mono.activeSeat,
    turn: mono.turn,
    turnEndsAt: mono.turnEndsAt,
    seats: players.map((player) => ({
      userId: player.userId,
      username: player.username,
      seat: player.seat,
    })),
    owners,
    cashBySeat,
    tileBySeat,
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

function formatRoomCode(id: string, gameType: "monopoly" | "ludo") {
  const prefix = gameType === "monopoly" ? "MNP" : "LUD";
  const short = id.replace(/-/g, "").slice(0, 4).toUpperCase();
  return `${prefix}-${short}`;
}
