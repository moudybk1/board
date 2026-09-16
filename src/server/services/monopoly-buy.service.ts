import { and, asc, eq } from "drizzle-orm";

import { BOARD_TILES } from "@/lib/game/monopoly-board";
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
  users,
} from "@/server/db/schema";
import { MOCK_MONOPOLY_LIVE } from "@/server/services/join-room.service";
import { broadcastMonopolyAction } from "@/server/services/monopoly-sync.service";
import { isDbConfigured as dbConfigured } from "@/server/lib/db-config";
import {
  findRoomByRef,
  formatRoomCode,
} from "@/server/db/repositories/rooms.repository";

export type MonopolyBuyResult =
  | {
      ok: true;
      tileIndex: number;
      tileName: string;
      price: number;
      seat: number;
      cashAfter: number;
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
        | "USER_NOT_FOUND"
        | "NOT_BUYABLE"
        | "ALREADY_OWNED"
        | "NOT_ON_TILE"
        | "INSUFFICIENT_CASH";
      message: string;
      shortfall?: number;
    };

/**
 * Buy the country (or other priced tile) the active seat is standing on.
 * Deducts in-game cash and records ownership · not the wallet balance.
 */
export async function buyMonopolyProperty(
  roomRef: string,
  userId: string,
  tileIndex?: number,
): Promise<MonopolyBuyResult> {
  if (!dbConfigured()) {
    return buyMonopolyMock(roomRef, userId, tileIndex);
  }

  const db = getDb();

  const result = await db.transaction(async (tx) => {
    const room = await findRoomByRef(tx, roomRef);

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

    const buyer = playerRows.find((row) => row.userId === userId);
    if (!buyer) {
      return {
        ok: false as const,
        code: "USER_NOT_FOUND" as const,
        message: "You are not seated in this match.",
      };
    }
    if (buyer.status !== "alive") {
      return {
        ok: false as const,
        code: "ELIMINATED" as const,
        message: "Eliminated players cannot buy.",
      };
    }
    if (buyer.seat !== mono.activeSeat) {
      return {
        ok: false as const,
        code: "NOT_YOUR_TURN" as const,
        message: "It is not your turn.",
      };
    }

    const targetTile = tileIndex ?? buyer.tile;
    if (targetTile !== buyer.tile) {
      return {
        ok: false as const,
        code: "NOT_ON_TILE" as const,
        message: "You can only buy the tile you are on.",
      };
    }

    const tile = BOARD_TILES[targetTile];
    if (!tile || tile.kind !== "country" || tile.price == null) {
      return {
        ok: false as const,
        code: "NOT_BUYABLE" as const,
        message: "This tile cannot be bought.",
      };
    }

    const [existing] = await tx
      .select()
      .from(monopolyProperties)
      .where(
        and(
          eq(monopolyProperties.matchId, match.id),
          eq(monopolyProperties.tileIndex, targetTile),
        ),
      )
      .limit(1);

    if (existing) {
      return {
        ok: false as const,
        code: "ALREADY_OWNED" as const,
        message: "This country is already owned.",
      };
    }

    const cash = Number(buyer.cash);
    if (cash < tile.price) {
      return {
        ok: false as const,
        code: "INSUFFICIENT_CASH" as const,
        message: "Not enough cash to buy this country.",
        shortfall: tile.price - cash,
      };
    }

    const cashAfter = cash - tile.price;
    const now = new Date();

    await tx
      .update(monopolyPlayers)
      .set({ cash: cashAfter.toFixed(2) })
      .where(eq(monopolyPlayers.id, buyer.id));

    await tx.insert(monopolyProperties).values({
      matchId: match.id,
      tileIndex: targetTile,
      ownerSeat: buyer.seat,
    });

    await tx.insert(monopolyLogs).values({
      matchId: match.id,
      seat: buyer.seat,
      message: `${buyer.username} bought ${tile.name} for ${tile.price}.`,
      createdAt: now,
    });

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

    const state: MonopolyRoomState = {
      roomId: formatRoomCode(room.id, "monopoly"),
      entryFee: Number(room.entryFee),
      maxPlayers: room.maxPlayers,
      activeSeat: mono.activeSeat,
      turn: mono.turn,
      turnSecondsLeft: Math.max(
        0,
        Math.ceil((mono.turnEndsAt.getTime() - Date.now()) / 1000),
      ),
      players: playerRows.map((player) => {
        const owned = Object.values(owners).filter(
          (seat) => seat === player.seat,
        ).length;
        return {
          id: player.userId,
          username: player.username,
          position: player.seat,
          status: player.status,
          cash:
            player.userId === userId ? cashAfter : Number(player.cash),
          tile: player.tile,
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

    return {
      ok: true as const,
      tileIndex: targetTile,
      tileName: tile.name,
      price: tile.price,
      seat: buyer.seat,
      cashAfter,
      state,
      source: "database" as const,
    };
  });

  if (result.ok) {
    broadcastMonopolyAction({
      roomId: result.state.roomId,
      action: "buy",
      seat: result.seat,
      state: result.state,
      detail: {
        tileIndex: result.tileIndex,
        tileName: result.tileName,
        price: result.price,
        cashAfter: result.cashAfter,
      },
      source: "database",
    });
  }

  return result;
}

function buyMonopolyMock(
  roomRef: string,
  userId: string,
  tileIndex?: number,
): MonopolyBuyResult {
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

  const buyer = state.players.find((player) => player.id === userId);
  if (!buyer) {
    return {
      ok: false,
      code: "USER_NOT_FOUND",
      message: "You are not seated in this match.",
    };
  }
  if (buyer.status !== "alive") {
    return {
      ok: false,
      code: "ELIMINATED",
      message: "Eliminated players cannot buy.",
    };
  }
  if (buyer.position !== state.activeSeat) {
    return {
      ok: false,
      code: "NOT_YOUR_TURN",
      message: "It is not your turn.",
    };
  }

  const targetTile = tileIndex ?? buyer.tile;
  if (targetTile !== buyer.tile) {
    return {
      ok: false,
      code: "NOT_ON_TILE",
      message: "You can only buy the tile you are on.",
    };
  }

  const tile = BOARD_TILES[targetTile];
  if (!tile || tile.kind !== "country" || tile.price == null) {
    return {
      ok: false,
      code: "NOT_BUYABLE",
      message: "This tile cannot be bought.",
    };
  }

  if (state.owners[targetTile] !== undefined) {
    return {
      ok: false,
      code: "ALREADY_OWNED",
      message: "This country is already owned.",
    };
  }

  if (buyer.cash < tile.price) {
    return {
      ok: false,
      code: "INSUFFICIENT_CASH",
      message: "Not enough cash to buy this country.",
      shortfall: tile.price - buyer.cash,
    };
  }

  const cashAfter = buyer.cash - tile.price;
  const who = buyer.isYou ? "You" : buyer.username;

  state = {
    ...state,
    owners: { ...state.owners, [targetTile]: buyer.position },
    players: state.players.map((player) =>
      player.position === buyer.position
        ? {
            ...player,
            cash: cashAfter,
            owned: player.owned + 1,
          }
        : player,
    ),
    log: [
      {
        id: `buy-${Date.now()}`,
        seat: buyer.position,
        message: `${who} bought ${tile.name} for ${tile.price}.`,
      },
      ...state.log,
    ],
  };

  MOCK_MONOPOLY_LIVE.set(state.roomId, state);

  broadcastMonopolyAction({
    roomId: state.roomId,
    action: "buy",
    seat: buyer.position,
    state,
    detail: {
      tileIndex: targetTile,
      tileName: tile.name,
      price: tile.price,
      cashAfter,
    },
    source: "mock",
  });

  return {
    ok: true,
    tileIndex: targetTile,
    tileName: tile.name,
    price: tile.price,
    seat: buyer.position,
    cashAfter,
    state,
    source: "mock",
  };
}

