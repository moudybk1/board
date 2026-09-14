import {
  listOpenRooms,
  type ListRoomsQuery,
} from "@/server/services/rooms.service";
import { subscribeRooms } from "@/server/realtime/rooms-hub";
import type { GameType, Room, RoomStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Fallback poll so DB changes from other processes still surface. */
const POLL_MS = 2_500;
const HEARTBEAT_MS = 15_000;

/**
 * GET /api/rooms/stream · Server-Sent Events for the lobby room list.
 *
 * Same query params as GET /api/rooms (`game`, `entryFee`, `status`).
 * Events:
 * - `rooms`     { rooms, source, fingerprint } when the list changes
 * - `heartbeat` { ts } keep-alive
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = parseQuery(url);
  if (parsed.error) {
    return new Response(JSON.stringify({ error: parsed.error }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const query = parsed.query;
  const encoder = new TextEncoder();
  let closed = false;
  let lastFingerprint = "";
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const push = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      const emitIfChanged = async (force = false) => {
        if (closed) return;
        try {
          const rooms = await listOpenRooms(query);
          const fingerprint = fingerprintRooms(rooms);
          if (!force && fingerprint === lastFingerprint) return;
          lastFingerprint = fingerprint;
          push("rooms", {
            rooms,
            fingerprint,
            source: process.env.DATABASE_URL ? "database" : "mock",
          });
        } catch (error) {
          console.error("[GET /api/rooms/stream]", error);
          push("error", { message: "Failed to list rooms." });
        }
      };

      await emitIfChanged(true);

      unsubscribe = subscribeRooms(() => {
        void emitIfChanged(true);
      });

      pollTimer = setInterval(() => {
        void emitIfChanged(false);
      }, POLL_MS);

      heartbeatTimer = setInterval(() => {
        push("heartbeat", { ts: Date.now() });
      }, HEARTBEAT_MS);

      request.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      cleanup();
    },
  });

  function cleanup() {
    if (closed) return;
    closed = true;
    if (pollTimer) clearInterval(pollTimer);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    unsubscribe?.();
  }

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function fingerprintRooms(rooms: Room[]) {
  return rooms
    .map(
      (room) =>
        `${room.id}:${room.status}:${room.players.length}:${room.entryFee}`,
    )
    .join("|");
}

function parseQuery(url: URL):
  | { query: ListRoomsQuery; error?: undefined }
  | { query?: undefined; error: string } {
  const game = url.searchParams.get("game");
  const entryFeeRaw = url.searchParams.get("entryFee");
  const status = url.searchParams.get("status");

  if (game && game !== "monopoly" && game !== "ludo") {
    return { error: "Invalid game. Use monopoly or ludo." };
  }

  let entryFee: number | undefined;
  if (entryFeeRaw !== null) {
    entryFee = Number(entryFeeRaw);
    if (!Number.isFinite(entryFee) || entryFee < 0) {
      return { error: "entryFee must be a non-negative number." };
    }
  }

  if (
    status &&
    status !== "waiting" &&
    status !== "playing" &&
    status !== "finished" &&
    status !== "all"
  ) {
    return {
      error: "Invalid status. Use waiting, playing, finished, or all.",
    };
  }

  return {
    query: {
      gameType: (game as GameType | null) ?? undefined,
      entryFee,
      status: (status as RoomStatus | "all" | null) ?? "waiting",
    },
  };
}
