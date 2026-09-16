import { and, eq } from "drizzle-orm";

import type { LudoRoomState } from "@/lib/mock/ludo";
import { prizePool, type Room } from "@/lib/types";
import { getDb } from "@/server/db";
import { matches, roomPlayers, rooms, users } from "@/server/db/schema";
import { notifyRoomsChanged } from "@/server/realtime/rooms-hub";
import { publishLudo } from "@/server/realtime/ludo-hub";
import {
  MOCK_LUDO_LIVE,
  MOCK_ROOM_READY,
} from "@/server/services/join-room.service";
import {
  seedLudoMatch,
  startLudoMock,
} from "@/server/services/ludo-start.service";
import { MOCK_PLAYER, MOCK_ROOMS } from "@/lib/mock/lobby";
import { isDbConfigured as dbConfigured } from "@/server/lib/db-config";
import {
  findRoomByRef,
  formatRoomCode,
} from "@/server/db/repositories/rooms.repository";

export type ReadyRoomResult =
  | {
      ok: true;
      room: Room;
      ready: Record<string, boolean>;
      started: boolean;
      ludo?: LudoRoomState;
      source: "database" | "mock";
    }
  | {
      ok: false;
      code:
        | "NOT_FOUND"
        | "NOT_OPEN"
        | "NOT_SEATED"
        | "WRONG_GAME"
        | "ALREADY_STARTED"
        | "USER_NOT_FOUND";
      message: string;
    };

/**
 * Mark the caller ready in a waiting Ludo room. When every seat is filled and
 * every seated player is ready, the match kicks off and Ludo state is seeded.
 */
export async function readyLudoRoom(
  roomRef: string,
  userId: string,
): Promise<ReadyRoomResult> {
  if (!dbConfigured()) {
    return readyLudoRoomMock(roomRef, userId);
  }

  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const room = await findRoomByRef(tx, roomRef);

    if (!room || room.gameType !== "ludo") {
      return {
        ok: false as const,
        code: room ? ("WRONG_GAME" as const) : ("NOT_FOUND" as const),
        message: room
          ? "This endpoint only readies Ludo rooms."
          : "Room not found.",
      };
    }

    if (room.status === "playing" || room.status === "finished") {
      return {
        ok: false as const,
        code: "ALREADY_STARTED" as const,
        message: "Room has already started.",
      };
    }

    const [seat] = await tx
      .select()
      .from(roomPlayers)
      .where(
        and(eq(roomPlayers.roomId, room.id), eq(roomPlayers.userId, userId)),
      )
      .limit(1);

    if (!seat) {
      return {
        ok: false as const,
        code: "NOT_SEATED" as const,
        message: "Join the room before marking ready.",
      };
    }

    await tx
      .update(roomPlayers)
      .set({ ready: true })
      .where(eq(roomPlayers.id, seat.id));

    const seats = await tx
      .select({
        id: users.id,
        username: users.username,
        avatarUrl: users.avatarUrl,
        position: roomPlayers.position,
        status: roomPlayers.status,
        ready: roomPlayers.ready,
      })
      .from(roomPlayers)
      .innerJoin(users, eq(users.id, roomPlayers.userId))
      .where(eq(roomPlayers.roomId, room.id))
      .orderBy(roomPlayers.position);

    const ready: Record<string, boolean> = {};
    for (const row of seats) ready[row.id] = row.ready;

    const full = seats.length >= room.maxPlayers;
    const allReady = full && seats.every((row) => row.ready);

    let started = false;
    let ludo: LudoRoomState | undefined;

    if (allReady) {
      started = true;
      await tx
        .update(rooms)
        .set({ status: "playing" })
        .where(eq(rooms.id, room.id));

      const [match] = await tx
        .insert(matches)
        .values({
          roomId: room.id,
          gameType: "ludo",
          prizePool: prizePool({
            entryFee: Number(room.entryFee),
            maxPlayers: room.maxPlayers,
          }).toFixed(2),
          status: "ongoing",
        })
        .returning();

      if (match) {
        ludo = await seedLudoMatch(tx, {
          matchId: match.id,
          roomCode: formatRoomCode(room.id, "ludo"),
          entryFee: Number(room.entryFee),
          maxPlayers: room.maxPlayers,
          seats: seats.map((row) => ({
            userId: row.id,
            username: row.username,
            seat: row.position,
          })),
        });
      }
    }

    return {
      ok: true as const,
      room: {
        id: formatRoomCode(room.id, "ludo"),
        gameType: "ludo" as const,
        entryFee: Number(room.entryFee),
        maxPlayers: room.maxPlayers,
        status: (started ? "playing" : "waiting") as Room["status"],
        players: seats.map(({ id, username, avatarUrl, position, status }) => ({
          id,
          username,
          avatarUrl,
          position,
          status,
        })),
        createdAt: room.createdAt.toISOString(),
      },
      ready,
      started,
      ludo,
      source: "database" as const,
    };
  });

  if (result.ok) {
    notifyRoomsChanged();
    publishLudo({
      type: "action",
      roomId: result.room.id,
      action: result.started ? "start" : "ready",
      seat:
        result.room.players.find((player) => player.id === userId)?.position ??
        null,
      room: result.room,
      ready: result.ready,
      state: result.ludo,
      source: result.source,
    });
  }

  return result;
}

function readyLudoRoomMock(
  roomRef: string,
  userId: string,
): ReadyRoomResult {
  if (userId !== MOCK_PLAYER.id && userId !== "me") {
    return {
      ok: false,
      code: "USER_NOT_FOUND",
      message: "User not found.",
    };
  }

  const room = MOCK_ROOMS.find(
    (entry) => entry.id.toUpperCase() === roomRef.toUpperCase(),
  );
  if (!room) {
    return { ok: false, code: "NOT_FOUND", message: "Room not found." };
  }
  if (room.gameType !== "ludo") {
    return {
      ok: false,
      code: "WRONG_GAME",
      message: "This endpoint only readies Ludo rooms.",
    };
  }
  if (room.status !== "waiting") {
    return {
      ok: false,
      code: "ALREADY_STARTED",
      message: "Room has already started.",
    };
  }
  if (!room.players.some((player) => player.id === MOCK_PLAYER.id)) {
    return {
      ok: false,
      code: "NOT_SEATED",
      message: "Join the room before marking ready.",
    };
  }

  let readyMap = MOCK_ROOM_READY.get(room.id);
  if (!readyMap) {
    readyMap = new Map();
    MOCK_ROOM_READY.set(room.id, readyMap);
  }
  for (const player of room.players) {
    if (!readyMap.has(player.id)) {
      readyMap.set(player.id, player.id !== MOCK_PLAYER.id);
    }
  }
  readyMap.set(MOCK_PLAYER.id, true);

  const ready: Record<string, boolean> = {};
  for (const player of room.players) {
    ready[player.id] = readyMap.get(player.id) ?? false;
  }

  const full = room.players.length >= room.maxPlayers;
  const allReady = full && room.players.every((player) => ready[player.id]);

  let started = false;
  let ludo: LudoRoomState | undefined;

  if (allReady) {
    started = true;
    room.status = "playing";
    ludo = startLudoMock(
      room.id,
      room.entryFee,
      room.maxPlayers,
      room.players.map((player) => ({
        userId: player.id,
        username: player.username,
        seat: player.position,
      })),
    );
    MOCK_LUDO_LIVE.set(room.id, ludo);
  }

  const payload: ReadyRoomResult = {
    ok: true,
    room: { ...room },
    ready,
    started,
    ludo,
    source: "mock",
  };

  publishLudo({
    type: "action",
    roomId: room.id,
    action: started ? "start" : "ready",
    seat:
      room.players.find((player) => player.id === MOCK_PLAYER.id)?.position ??
      null,
    room: payload.ok ? payload.room : undefined,
    ready,
    state: ludo,
    source: "mock",
  });
  notifyRoomsChanged();

  return payload;
}

