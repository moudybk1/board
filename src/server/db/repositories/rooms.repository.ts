/**
 * Room lookup and room-code formatting, in one place.
 *
 * Every game service needs to resolve the `MNP-xxxx` / `LUD-xxxx` code in a URL
 * back to a row. This used to be a copy of `formatRoomCode` plus an unfiltered
 * `select().from(rooms)` in each service, which loaded the whole table on every
 * roll, move, buy and settle.
 */
import { and, eq, sql } from "drizzle-orm";

import type { GameType } from "@/lib/types";
import { rooms, type RoomRow } from "@/server/db/schema";
import type { DbOrTx } from "@/server/db/types";

/** Hex characters of the UUID used to build the short room code. */
const CODE_LENGTH = 4;

const PREFIX_BY_GAME: Record<GameType, string> = {
  monopoly: "MNP",
  ludo: "LUD",
};

const GAME_BY_PREFIX: Record<string, GameType> = {
  MNP: "monopoly",
  LUD: "ludo",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ROOM_CODE_PATTERN = /^(MNP|LUD)-([0-9A-F]{4})$/;

/**
 * Human-readable room code (MNP-xxxx / LUD-xxxx) derived from the row's UUID,
 * so the lobby keeps showing the same style of id the mocks used.
 */
export function formatRoomCode(id: string, gameType: GameType): string {
  const short = id.replace(/-/g, "").slice(0, CODE_LENGTH).toUpperCase();
  return `${PREFIX_BY_GAME[gameType]}-${short}`;
}

/** A room reference is either a full UUID or a short room code. */
type RoomRef =
  | { kind: "id"; id: string }
  | { kind: "code"; gameType: GameType; short: string };

/** Returns null when the reference is neither shape, so callers skip the query. */
function parseRoomRef(ref: string): RoomRef | null {
  const trimmed = ref.trim();
  if (UUID_PATTERN.test(trimmed)) {
    return { kind: "id", id: trimmed.toLowerCase() };
  }

  const match = ROOM_CODE_PATTERN.exec(trimmed.toUpperCase());
  if (!match) return null;

  return {
    kind: "code",
    gameType: GAME_BY_PREFIX[match[1]],
    short: match[2].toLowerCase(),
  };
}

/**
 * Every room matching a UUID or short code, filtered in SQL rather than in JS.
 *
 * The short code is only the first four hex characters of the UUID, so it can
 * match more than one room once the table grows.
 */
export async function findRoomsByRef(
  db: DbOrTx,
  ref: string,
): Promise<RoomRow[]> {
  const parsed = parseRoomRef(ref);
  if (!parsed) return [];

  if (parsed.kind === "id") {
    return db.select().from(rooms).where(eq(rooms.id, parsed.id));
  }

  return db
    .select()
    .from(rooms)
    .where(
      and(
        eq(rooms.gameType, parsed.gameType),
        sql`left(replace(${rooms.id}::text, '-', ''), ${CODE_LENGTH}) = ${parsed.short}`,
      ),
    );
}

/**
 * Resolve a room reference to exactly one row. Returns null when nothing
 * matches, and also when a short code is ambiguous, because acting on an
 * arbitrary one of the matches would move money in the wrong room.
 */
export async function findRoomByRef(
  db: DbOrTx,
  ref: string,
): Promise<RoomRow | null> {
  const matches = await findRoomsByRef(db, ref);
  return matches.length === 1 ? matches[0] : null;
}
