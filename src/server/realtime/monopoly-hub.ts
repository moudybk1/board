/**
 * Per-room fan-out for Monopoly action / state sync.
 * SSE clients subscribe by room code (MNP-xxxx); game services publish after
 * each authoritative action so every seat sees the same board.
 */

export type MonopolyStreamPayload =
  | {
      type: "state";
      roomId: string;
      state: import("@/lib/mock/monopoly").MonopolyRoomState;
      source: "database" | "mock";
    }
  | {
      type: "action";
      roomId: string;
      action:
        | "roll"
        | "buy"
        | "pass"
        | "rent"
        | "bankrupt"
        | "turn"
        | "join"
        | "start";
      seat: number | null;
      /** Opaque action detail for clients (dice, tile, amounts, …). */
      detail?: Record<string, unknown>;
      state: import("@/lib/mock/monopoly").MonopolyRoomState;
      source: "database" | "mock";
    }
  | {
      type: "heartbeat";
      roomId: string;
      ts: number;
    };

type Listener = (payload: MonopolyStreamPayload) => void;

const rooms = new Map<string, Set<Listener>>();

function roomKey(roomId: string) {
  return roomId.toUpperCase();
}

export function subscribeMonopoly(
  roomId: string,
  listener: Listener,
): () => void {
  const key = roomKey(roomId);
  let set = rooms.get(key);
  if (!set) {
    set = new Set();
    rooms.set(key, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) rooms.delete(key);
  };
}

export function publishMonopoly(payload: MonopolyStreamPayload) {
  if (payload.type === "heartbeat") {
    const set = rooms.get(roomKey(payload.roomId));
    if (!set) return;
    for (const listener of set) {
      try {
        listener(payload);
      } catch (error) {
        console.error("[monopoly-hub] listener error", error);
      }
    }
    return;
  }

  const set = rooms.get(roomKey(payload.roomId));
  if (!set) return;
  for (const listener of set) {
    try {
      listener(payload);
    } catch (error) {
      console.error("[monopoly-hub] listener error", error);
    }
  }
}
