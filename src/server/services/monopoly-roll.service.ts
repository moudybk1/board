import { asc, eq } from "drizzle-orm";

import { rollDice, type DiceRoll } from "@/lib/game/dice";
import { BOARD_TILE_COUNT, BOARD_TILES } from "@/lib/game/monopoly-board";
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
import { MONOPOLY_TURN_SECONDS } from "@/server/services/monopoly-start.service";
import { broadcastMonopolyAction } from "@/server/services/monopoly-sync.service";
import { settleMonopolyRent } from "@/server/services/monopoly-rent.service";

export type MonopolyRollResult =
  | {
      ok: true;
      dice: DiceRoll["dice"];
      total: number;
      isDouble: boolean;
      fromTile: number;
      toTile: number;
      tileName: string;
      tileKind: string;
      canBuy: boolean;
      /** Present when landing triggered an automatic rent settlement. */
      rent?: {
        due: number;
        paid: number;
        bankrupted: boolean;
        ownerSeat: number;
      };
      seat: number;
      state: MonopolyRoomState;
      source: "database" | "mock";
    }
  | {
      ok: false;
      code:
        | "NOT_FOUND"
        | "NOT_YOUR_TURN"
        | "ELIMINATED"
        | "FINISHED"
        | "USER_NOT_FOUND";
      message: string;
    };

function dbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Authoritative Monopoly roll: move the active seat's pawn, append log lines,
 * broadcast to SSE subscribers. Buy / rent settlement are separate endpoints.
 */
export async function rollMonopoly(
  roomRef: string,
  userId: string,
): Promise<MonopolyRollResult> {
  if (!dbConfigured()) {
    return rollMonopolyMock(roomRef, userId);
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
      .limit(1);

    if (!match || match.status !== "ongoing") {
      return {
        ok: false as const,
        code: "FINISHED" as const,
        message: "This match is not in progress.",
      };
    }

    const [mono] = await tx
      .select()
      .from(monopolyMatches)
      .where(eq(monopolyMatches.matchId, match.id))
      .limit(1)
      .for("update");

    if (!mono) {
      return {
        ok: false as const,
        code: "NOT_FOUND" as const,
        message: "Monopoly match state missing.",
      };
    }

    const playerRows = await tx
      .select({
        id: monopolyPlayers.id,
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

    const roller = playerRows.find((row) => row.userId === userId);
    if (!roller) {
      return {
        ok: false as const,
        code: "USER_NOT_FOUND" as const,
        message: "You are not seated in this match.",
      };
    }

    const alive = playerRows.filter((row) => row.status === "alive");
    if (alive.length <= 1) {
      return {
        ok: false as const,
        code: "FINISHED" as const,
        message: "Match already has a winner.",
      };
    }

    if (roller.status !== "alive") {
      return {
        ok: false as const,
        code: "ELIMINATED" as const,
        message: "Eliminated players cannot roll.",
      };
    }

    if (roller.seat !== mono.activeSeat) {
      return {
        ok: false as const,
        code: "NOT_YOUR_TURN" as const,
        message: "It is not your turn.",
      };
    }

    const diceResult = rollDice();
    const fromTile = roller.tile;
    const toTile = (fromTile + diceResult.total) % BOARD_TILE_COUNT;
    const tile = BOARD_TILES[toTile];
    const now = new Date();
    const turnEndsAt = new Date(now.getTime() + MONOPOLY_TURN_SECONDS * 1000);

    await tx
      .update(monopolyPlayers)
      .set({ tile: toTile })
      .where(eq(monopolyPlayers.id, roller.id));

    const rollMsg = `${roller.username} rolled ${diceResult.dice[0]} and ${diceResult.dice[1]}.`;
    const landMsg = `${roller.username} landed on ${tile.name}.`;

    await tx.insert(monopolyLogs).values([
      {
        matchId: match.id,
        seat: roller.seat,
        message: rollMsg,
        createdAt: now,
      },
      {
        matchId: match.id,
        seat: roller.seat,
        message: landMsg,
        createdAt: new Date(now.getTime() + 1),
      },
    ]);

    await tx
      .update(monopolyMatches)
      .set({ turnEndsAt, updatedAt: now })
      .where(eq(monopolyMatches.matchId, match.id));

    const props = await tx
      .select()
      .from(monopolyProperties)
      .where(eq(monopolyProperties.matchId, match.id));

    const logs = await tx
      .select()
      .from(monopolyLogs)
      .where(eq(monopolyLogs.matchId, match.id))
      .orderBy(asc(monopolyLogs.createdAt));

    const owners: Record<number, number> = {};
    for (const prop of props) owners[prop.tileIndex] = prop.ownerSeat;

    const roomCode = formatRoomCode(room.id, "monopoly");
    const state: MonopolyRoomState = {
      roomId: roomCode,
      entryFee: Number(room.entryFee),
      maxPlayers: room.maxPlayers,
      activeSeat: mono.activeSeat,
      turn: mono.turn,
      turnSecondsLeft: MONOPOLY_TURN_SECONDS,
      players: playerRows.map((player) => {
        const tileIndex = player.userId === userId ? toTile : player.tile;
        const owned = Object.values(owners).filter(
          (seat) => seat === player.seat,
        ).length;
        return {
          id: player.userId,
          username: player.username,
          position: player.seat,
          status: player.status,
          cash: Number(player.cash),
          tile: tileIndex,
          owned,
          isYou: false,
        };
      }),
      owners,
      log: logs
        .slice()
        .reverse()
        .map((entry) => ({
          id: entry.id,
          seat: entry.seat,
          message: entry.message,
        })),
    };

    const canBuy =
      tile.kind === "country" && state.owners[toTile] === undefined;

    return {
      ok: true as const,
      dice: diceResult.dice,
      total: diceResult.total,
      isDouble: diceResult.isDouble,
      fromTile,
      toTile,
      tileName: tile.name,
      tileKind: tile.kind,
      canBuy,
      seat: roller.seat,
      state,
      source: "database" as const,
    };
  });

  if (result.ok) {
    const ownerSeat = result.state.owners[result.toTile];
    if (
      result.tileKind === "country" &&
      ownerSeat !== undefined &&
      ownerSeat !== result.seat
    ) {
      const settled = await settleMonopolyRent(
        roomRef,
        userId,
        result.toTile,
      );
      if (settled.ok) {
        broadcastMonopolyAction({
          roomId: result.state.roomId,
          action: "roll",
          seat: result.seat,
          state: settled.state,
          detail: {
            dice: result.dice,
            total: result.total,
            isDouble: result.isDouble,
            fromTile: result.fromTile,
            toTile: result.toTile,
            canBuy: false,
            rent: {
              due: settled.due,
              paid: settled.paid,
              bankrupted: settled.bankrupted,
              ownerSeat: settled.ownerSeat,
            },
          },
          source: "database",
        });
        return {
          ...result,
          canBuy: false,
          rent: {
            due: settled.due,
            paid: settled.paid,
            bankrupted: settled.bankrupted,
            ownerSeat: settled.ownerSeat,
          },
          state: settled.state,
        };
      }
    }

    broadcastMonopolyAction({
      roomId: result.state.roomId,
      action: "roll",
      seat: result.seat,
      state: result.state,
      detail: {
        dice: result.dice,
        total: result.total,
        isDouble: result.isDouble,
        fromTile: result.fromTile,
        toTile: result.toTile,
        canBuy: result.canBuy,
      },
      source: "database",
    });
  }

  return result;
}

async function rollMonopolyMock(
  roomRef: string,
  userId: string,
): Promise<MonopolyRollResult> {
  const key = roomRef.toUpperCase();
  let state =
    MOCK_MONOPOLY_LIVE.get(key) ??
    MOCK_MONOPOLY_LIVE.get(roomRef) ??
    (key.startsWith("MNP-") ? structuredClone(getMonopolyRoom(key)) : null);

  if (!state) {
    return { ok: false, code: "NOT_FOUND", message: "Monopoly room not found." };
  }

  MOCK_MONOPOLY_LIVE.set(state.roomId, state);

  const alive = state.players.filter((player) => player.status === "alive");
  if (alive.length <= 1) {
    return {
      ok: false,
      code: "FINISHED",
      message: "Match already has a winner.",
    };
  }

  const roller = state.players.find((player) => player.id === userId);
  if (!roller) {
    return {
      ok: false,
      code: "USER_NOT_FOUND",
      message: "You are not seated in this match.",
    };
  }
  if (roller.status !== "alive") {
    return {
      ok: false,
      code: "ELIMINATED",
      message: "Eliminated players cannot roll.",
    };
  }
  if (roller.position !== state.activeSeat) {
    return {
      ok: false,
      code: "NOT_YOUR_TURN",
      message: "It is not your turn.",
    };
  }

  const diceResult = rollDice();
  const fromTile = roller.tile;
  const toTile = (fromTile + diceResult.total) % BOARD_TILE_COUNT;
  const tile = BOARD_TILES[toTile];
  const who = roller.isYou ? "You" : roller.username;

  state = {
    ...state,
    turnSecondsLeft: MONOPOLY_TURN_SECONDS,
    players: state.players.map((player) =>
      player.position === roller.position
        ? { ...player, tile: toTile }
        : player,
    ),
    log: [
      {
        id: `land-${Date.now()}`,
        seat: roller.position,
        message: `${who} landed on ${tile.name}.`,
      },
      {
        id: `roll-${Date.now() - 1}`,
        seat: roller.position,
        message: `${who} rolled ${diceResult.dice[0]} and ${diceResult.dice[1]}.`,
      },
      ...state.log,
    ],
  };

  MOCK_MONOPOLY_LIVE.set(state.roomId, state);

  const canBuy =
    tile.kind === "country" && state.owners[toTile] === undefined;
  const ownerSeat = state.owners[toTile];

  if (
    tile.kind === "country" &&
    ownerSeat !== undefined &&
    ownerSeat !== roller.position
  ) {
    const settled = await settleMonopolyRent(roomRef, userId, toTile);
    if (settled.ok) {
      broadcastMonopolyAction({
        roomId: settled.state.roomId,
        action: "roll",
        seat: roller.position,
        state: settled.state,
        detail: {
          dice: diceResult.dice,
          total: diceResult.total,
          isDouble: diceResult.isDouble,
          fromTile,
          toTile,
          canBuy: false,
          rent: {
            due: settled.due,
            paid: settled.paid,
            bankrupted: settled.bankrupted,
            ownerSeat: settled.ownerSeat,
          },
        },
        source: "mock",
      });
      return {
        ok: true,
        dice: diceResult.dice,
        total: diceResult.total,
        isDouble: diceResult.isDouble,
        fromTile,
        toTile,
        tileName: tile.name,
        tileKind: tile.kind,
        canBuy: false,
        rent: {
          due: settled.due,
          paid: settled.paid,
          bankrupted: settled.bankrupted,
          ownerSeat: settled.ownerSeat,
        },
        seat: roller.position,
        state: settled.state,
        source: "mock",
      };
    }
  }

  broadcastMonopolyAction({
    roomId: state.roomId,
    action: "roll",
    seat: roller.position,
    state,
    detail: {
      dice: diceResult.dice,
      total: diceResult.total,
      isDouble: diceResult.isDouble,
      fromTile,
      toTile,
      canBuy,
    },
    source: "mock",
  });

  return {
    ok: true,
    dice: diceResult.dice,
    total: diceResult.total,
    isDouble: diceResult.isDouble,
    fromTile,
    toTile,
    tileName: tile.name,
    tileKind: tile.kind,
    canBuy,
    seat: roller.position,
    state,
    source: "mock",
  };
}

function formatRoomCode(id: string, gameType: "monopoly" | "ludo") {
  const prefix = gameType === "monopoly" ? "MNP" : "LUD";
  const short = id.replace(/-/g, "").slice(0, 4).toUpperCase();
  return `${prefix}-${short}`;
}
