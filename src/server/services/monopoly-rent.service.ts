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
  rooms,
  users,
} from "@/server/db/schema";
import { MOCK_MONOPOLY_LIVE } from "@/server/services/join-room.service";
import { broadcastMonopolyAction } from "@/server/services/monopoly-sync.service";
import { maybeSettleAfterRent } from "@/server/services/monopoly-settle.service";

export type MonopolyRentResult =
  | {
      ok: true;
      tileIndex: number;
      tileName: string;
      due: number;
      paid: number;
      bankrupted: boolean;
      payerSeat: number;
      ownerSeat: number;
      state: MonopolyRoomState;
      source: "database" | "mock";
    }
  | {
      ok: false;
      code:
        | "NOT_FOUND"
        | "FINISHED"
        | "USER_NOT_FOUND"
        | "NO_RENT"
        | "NOT_ON_TILE"
        | "ELIMINATED";
      message: string;
    };

function dbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Charge rent when a player lands on an opponent's country. Pays what they
 * can; if they cannot cover the full rent (or cash hits 0) they are eliminated.
 */
export async function settleMonopolyRent(
  roomRef: string,
  userId: string,
  tileIndex?: number,
): Promise<MonopolyRentResult> {
  if (!dbConfigured()) {
    return settleRentMock(roomRef, userId, tileIndex);
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

    const payer = playerRows.find((row) => row.userId === userId);
    if (!payer) {
      return {
        ok: false as const,
        code: "USER_NOT_FOUND" as const,
        message: "You are not seated in this match.",
      };
    }
    if (payer.status !== "alive") {
      return {
        ok: false as const,
        code: "ELIMINATED" as const,
        message: "Eliminated players cannot pay rent.",
      };
    }

    const target = tileIndex ?? payer.tile;
    if (target !== payer.tile) {
      return {
        ok: false as const,
        code: "NOT_ON_TILE" as const,
        message: "Rent is only due on the tile you occupy.",
      };
    }

    const [prop] = await tx
      .select()
      .from(monopolyProperties)
      .where(
        and(
          eq(monopolyProperties.matchId, match.id),
          eq(monopolyProperties.tileIndex, target),
        ),
      )
      .limit(1);

    if (!prop || prop.ownerSeat === payer.seat) {
      return {
        ok: false as const,
        code: "NO_RENT" as const,
        message: "No rent is due on this tile.",
      };
    }

    const owner = playerRows.find((row) => row.seat === prop.ownerSeat);
    if (!owner || owner.status !== "alive") {
      return {
        ok: false as const,
        code: "NO_RENT" as const,
        message: "No living owner to collect rent.",
      };
    }

    const tile = BOARD_TILES[target];
    const due = tile.rent ?? 0;
    if (due <= 0) {
      return {
        ok: false as const,
        code: "NO_RENT" as const,
        message: "This tile has no rent.",
      };
    }

    const payerCash = Number(payer.cash);
    const paid = Math.min(due, payerCash);
    const bankrupted = paid < due || payerCash - paid <= 0;
    const now = new Date();

    await tx
      .update(monopolyPlayers)
      .set({
        cash: (payerCash - paid).toFixed(2),
        status: bankrupted ? "eliminated" : "alive",
      })
      .where(eq(monopolyPlayers.id, payer.id));

    await tx
      .update(monopolyPlayers)
      .set({ cash: (Number(owner.cash) + paid).toFixed(2) })
      .where(eq(monopolyPlayers.id, owner.id));

    if (bankrupted) {
      // Free the bankrupt seat's titles so they return to the market.
      await tx
        .delete(monopolyProperties)
        .where(
          and(
            eq(monopolyProperties.matchId, match.id),
            eq(monopolyProperties.ownerSeat, payer.seat),
          ),
        );
    }

    await tx.insert(monopolyLogs).values({
      matchId: match.id,
      seat: payer.seat,
      message: `${payer.username} paid ${paid} rent to ${owner.username} for ${tile.name}.`,
      createdAt: now,
    });

    if (bankrupted) {
      await tx.insert(monopolyLogs).values({
        matchId: match.id,
        seat: payer.seat,
        message: `${payer.username} is bankrupt and out of the game.`,
        createdAt: new Date(now.getTime() + 1),
      });
    }

    const refreshed = await tx
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
    for (const row of props) owners[row.tileIndex] = row.ownerSeat;

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
      players: refreshed.map((player) => ({
        id: player.userId,
        username: player.username,
        position: player.seat,
        status: player.status,
        cash: Number(player.cash),
        tile: player.tile,
        owned: Object.values(owners).filter((s) => s === player.seat).length,
        isYou: false,
      })),
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
      tileIndex: target,
      tileName: tile.name,
      due,
      paid,
      bankrupted,
      payerSeat: payer.seat,
      ownerSeat: owner.seat,
      state,
      source: "database" as const,
    };
  });

  if (result.ok) {
    broadcastMonopolyAction({
      roomId: result.state.roomId,
      action: result.bankrupted ? "bankrupt" : "rent",
      seat: result.payerSeat,
      state: result.state,
      detail: {
        tileIndex: result.tileIndex,
        tileName: result.tileName,
        due: result.due,
        paid: result.paid,
        ownerSeat: result.ownerSeat,
        bankrupted: result.bankrupted,
      },
      source: "database",
    });

    if (result.bankrupted) {
      await maybeSettleAfterRent(result.state);
    }
  }

  return result;
}

function settleRentMock(
  roomRef: string,
  userId: string,
  tileIndex?: number,
): MonopolyRentResult {
  const key = roomRef.toUpperCase();
  let state =
    MOCK_MONOPOLY_LIVE.get(key) ??
    MOCK_MONOPOLY_LIVE.get(roomRef) ??
    (key.startsWith("MNP-") ? structuredClone(getMonopolyRoom(key)) : null);

  if (!state) {
    return { ok: false, code: "NOT_FOUND", message: "Monopoly room not found." };
  }
  MOCK_MONOPOLY_LIVE.set(state.roomId, state);

  const alive = state.players.filter((p) => p.status === "alive");
  if (alive.length <= 1) {
    return {
      ok: false,
      code: "FINISHED",
      message: "Match already has a winner.",
    };
  }

  const payer = state.players.find((p) => p.id === userId);
  if (!payer) {
    return {
      ok: false,
      code: "USER_NOT_FOUND",
      message: "You are not seated in this match.",
    };
  }
  if (payer.status !== "alive") {
    return {
      ok: false,
      code: "ELIMINATED",
      message: "Eliminated players cannot pay rent.",
    };
  }

  const target = tileIndex ?? payer.tile;
  if (target !== payer.tile) {
    return {
      ok: false,
      code: "NOT_ON_TILE",
      message: "Rent is only due on the tile you occupy.",
    };
  }

  const ownerSeat = state.owners[target];
  if (ownerSeat === undefined || ownerSeat === payer.position) {
    return {
      ok: false,
      code: "NO_RENT",
      message: "No rent is due on this tile.",
    };
  }

  const owner = state.players.find((p) => p.position === ownerSeat);
  if (!owner || owner.status !== "alive") {
    return {
      ok: false,
      code: "NO_RENT",
      message: "No living owner to collect rent.",
    };
  }

  const tile = BOARD_TILES[target];
  const due = tile.rent ?? 0;
  if (due <= 0) {
    return { ok: false, code: "NO_RENT", message: "This tile has no rent." };
  }

  const paid = Math.min(due, payer.cash);
  const bankrupted = paid < due || payer.cash - paid <= 0;
  const payerName = payer.isYou ? "You" : payer.username;
  const ownerName = owner.isYou ? "you" : owner.username;

  const nextOwners = { ...state.owners };
  if (bankrupted) {
    for (const [tileKey, seat] of Object.entries(nextOwners)) {
      if (seat === payer.position) delete nextOwners[Number(tileKey)];
    }
  }

  state = {
    ...state,
    owners: nextOwners,
    players: state.players.map((player) => {
      if (player.position === payer.position) {
        return {
          ...player,
          cash: player.cash - paid,
          status: bankrupted ? "eliminated" : player.status,
          owned: bankrupted ? 0 : player.owned,
        };
      }
      if (player.position === owner.position) {
        return { ...player, cash: player.cash + paid };
      }
      return player;
    }),
    log: [
      ...(bankrupted
        ? [
            {
              id: `br-${Date.now()}`,
              seat: payer.position,
              message: `${payerName} ${payer.isYou ? "are" : "is"} bankrupt and out of the game.`,
            },
          ]
        : []),
      {
        id: `rent-${Date.now()}`,
        seat: payer.position,
        message: `${payerName} paid ${paid} rent to ${ownerName} for ${tile.name}.`,
      },
      ...state.log,
    ],
  };

  MOCK_MONOPOLY_LIVE.set(state.roomId, state);

  broadcastMonopolyAction({
    roomId: state.roomId,
    action: bankrupted ? "bankrupt" : "rent",
    seat: payer.position,
    state,
    detail: {
      tileIndex: target,
      tileName: tile.name,
      due,
      paid,
      ownerSeat: owner.position,
      bankrupted,
    },
    source: "mock",
  });

  const payload = {
    ok: true as const,
    tileIndex: target,
    tileName: tile.name,
    due,
    paid,
    bankrupted,
    payerSeat: payer.position,
    ownerSeat: owner.position,
    state,
    source: "mock" as const,
  };

  if (bankrupted) {
    void maybeSettleAfterRent(state);
  }

  return payload;
}

function formatRoomCode(id: string, gameType: "monopoly" | "ludo") {
  const prefix = gameType === "monopoly" ? "MNP" : "LUD";
  const short = id.replace(/-/g, "").slice(0, 4).toUpperCase();
  return `${prefix}-${short}`;
}
