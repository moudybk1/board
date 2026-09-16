import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/server/db";
import { roomPlayers, rooms, users } from "@/server/db/schema";
import type { GameType, Room, RoomPlayer, RoomStatus } from "@/lib/types";
import { MOCK_ROOMS } from "@/lib/mock/lobby";
import { isDbConfigured as dbConfigured } from "@/server/lib/db-config";
import { formatRoomCode } from "@/server/db/repositories/rooms.repository";

export type ListRoomsQuery = {
  gameType?: GameType;
  /** When set, only rooms with this exact entry fee. */
  entryFee?: number;
  /** Default: waiting only. Pass `all` to include in-progress tables. */
  status?: RoomStatus | "all";
};

/**
 * Open (and optionally in-progress) rooms for the lobby, shaped like the
 * frontend `Room` type so the mock layer can be swapped out later.
 */
export async function listOpenRooms(
  query: ListRoomsQuery = {},
): Promise<Room[]> {
  if (!dbConfigured()) {
    return listFromMock(query);
  }

  const db = getDb();
  const statusFilter =
    query.status === "all"
      ? inArray(rooms.status, ["waiting", "playing"])
      : eq(rooms.status, query.status ?? "waiting");

  const filters = [statusFilter];
  if (query.gameType) filters.push(eq(rooms.gameType, query.gameType));
  if (query.entryFee !== undefined) {
    filters.push(eq(rooms.entryFee, String(query.entryFee)));
  }

  const rows = await db
    .select({
      id: rooms.id,
      gameType: rooms.gameType,
      entryFee: rooms.entryFee,
      maxPlayers: rooms.maxPlayers,
      status: rooms.status,
      createdAt: rooms.createdAt,
    })
    .from(rooms)
    .where(and(...filters))
    .orderBy(asc(rooms.createdAt));

  if (rows.length === 0) return [];

  const roomIds = rows.map((row) => row.id);
  const seats = await db
    .select({
      roomId: roomPlayers.roomId,
      userId: roomPlayers.userId,
      position: roomPlayers.position,
      status: roomPlayers.status,
      username: users.username,
      avatarUrl: users.avatarUrl,
    })
    .from(roomPlayers)
    .innerJoin(users, eq(users.id, roomPlayers.userId))
    .where(inArray(roomPlayers.roomId, roomIds))
    .orderBy(asc(roomPlayers.position));

  const seatsByRoom = new Map<string, RoomPlayer[]>();
  for (const seat of seats) {
    const list = seatsByRoom.get(seat.roomId) ?? [];
    list.push({
      id: seat.userId,
      username: seat.username,
      avatarUrl: seat.avatarUrl,
      position: seat.position,
      status: seat.status,
    });
    seatsByRoom.set(seat.roomId, list);
  }

  return rows.map((row) => ({
    id: formatRoomCode(row.id, row.gameType),
    gameType: row.gameType,
    entryFee: Number(row.entryFee),
    maxPlayers: row.maxPlayers,
    status: row.status,
    players: seatsByRoom.get(row.id) ?? [],
    createdAt: row.createdAt.toISOString(),
  }));
}

function listFromMock(query: ListRoomsQuery): Room[] {
  return MOCK_ROOMS.filter((room) => {
    if (query.gameType && room.gameType !== query.gameType) return false;
    if (query.entryFee !== undefined && room.entryFee !== query.entryFee) {
      return false;
    }
    if (query.status === "all") {
      return room.status === "waiting" || room.status === "playing";
    }
    const wanted = query.status ?? "waiting";
    return room.status === wanted;
  }).sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
}

/** Count of waiting rooms per entry-fee tier · used by the lobby filter chips. */
export async function countWaitingByEntryFee(gameType?: GameType) {
  if (!dbConfigured()) {
    const counts: Record<number, number> = {};
    for (const room of MOCK_ROOMS) {
      if (room.status !== "waiting") continue;
      if (gameType && room.gameType !== gameType) continue;
      counts[room.entryFee] = (counts[room.entryFee] ?? 0) + 1;
    }
    return counts;
  }

  const db = getDb();
  const filters = [eq(rooms.status, "waiting")];
  if (gameType) filters.push(eq(rooms.gameType, gameType));

  const rows = await db
    .select({
      entryFee: rooms.entryFee,
      count: sql<number>`count(*)::int`,
    })
    .from(rooms)
    .where(and(...filters))
    .groupBy(rooms.entryFee);

  const counts: Record<number, number> = {};
  for (const row of rows) {
    counts[Number(row.entryFee)] = Number(row.count);
  }
  return counts;
}
