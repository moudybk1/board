/**
 * Per-room fan-out for Ludo waiting-room + in-match sync.
 */
import type { LudoRoomState } from "@/lib/mock/ludo";
import type { Room } from "@/lib/types";

export type LudoStreamPayload =
  | {
      type: "lobby";
      roomId: string;
      room: Room;
      ready: Record<string, boolean>;
      source: "database" | "mock";
    }
  | {
      type: "state";
      roomId: string;
      state: LudoRoomState;
      source: "database" | "mock";
    }
  | {
      type: "action";
      roomId: string;
      action: "join" | "ready" | "start" | "roll" | "move" | "capture" | "turn";
      seat: number | null;
      detail?: Record<string, unknown>;
      state?: LudoRoomState;
      room?: Room;
      ready?: Record<string, boolean>;
      source: "database" | "mock";
    }
  | {
      type: "heartbeat";
      roomId: string;
      ts: number;
    };

type Listener = (payload: LudoStreamPayload) => void;

const rooms = new Map<string, Set<Listener>>();

function roomKey(roomId: string) {
  return roomId.toUpperCase();
}

export function subscribeLudo(roomId: string, listener: Listener): () => void {
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

export function publishLudo(payload: LudoStreamPayload) {
  const set = rooms.get(roomKey(payload.roomId));
  if (!set) return;
  for (const listener of set) {
    try {
      listener(payload);
    } catch (error) {
      console.error("[ludo-hub] listener error", error);
    }
  }
}
