import type { MonopolyRoomState } from "@/lib/mock/monopoly";
import {
  publishMonopoly,
  type MonopolyStreamPayload,
} from "@/server/realtime/monopoly-hub";

/**
 * Broadcast a player action + resulting board state to all SSE subscribers.
 * Dice / buy / rent services call this after they mutate authoritative state.
 */
export function broadcastMonopolyAction(args: {
  roomId: string;
  action: Extract<MonopolyStreamPayload, { type: "action" }>["action"];
  seat: number | null;
  state: MonopolyRoomState;
  detail?: Record<string, unknown>;
  source: "database" | "mock";
}) {
  publishMonopoly({
    type: "action",
    roomId: args.roomId,
    action: args.action,
    seat: args.seat,
    detail: args.detail,
    state: args.state,
    source: args.source,
  });
}

export function broadcastMonopolyState(args: {
  roomId: string;
  state: MonopolyRoomState;
  source: "database" | "mock";
}) {
  publishMonopoly({
    type: "state",
    roomId: args.roomId,
    state: args.state,
    source: args.source,
  });
}
