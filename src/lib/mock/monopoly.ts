import { MAX_PLAYERS_PER_ROOM, prizePool, type RoomPlayerStatus } from "@/lib/types";

/**
 * Stand-in state for a live Monopoly room. Shapes here are the contract the
 * realtime game server will fill in later; the UI is built against them now.
 */

export type MonopolyPlayer = {
  id: string;
  username: string;
  position: number;
  status: RoomPlayerStatus;
  /** Cash on hand, in BOARD tokens. */
  cash: number;
  /** Tile index on the 40-tile perimeter. */
  tile: number;
  /** Number of countries owned. */
  owned: number;
  isYou: boolean;
};

export type MonopolyLogEntry = {
  id: string;
  /** Seat that caused the entry, or null for system messages. */
  seat: number | null;
  message: string;
};

export type MonopolyRoomState = {
  roomId: string;
  entryFee: number;
  maxPlayers: number;
  /** Seat whose turn it is. */
  activeSeat: number;
  turn: number;
  /** Seconds left on the current turn. */
  turnSecondsLeft: number;
  players: MonopolyPlayer[];
  /** Tile index -> seat that owns it. Absent means unowned. */
  owners: Record<number, number>;
  log: MonopolyLogEntry[];
};

const STARTING_CASH = 1_500;

export const MOCK_MONOPOLY_ROOM: MonopolyRoomState = {
  roomId: "MNP-8842",
  entryFee: 1_000,
  maxPlayers: MAX_PLAYERS_PER_ROOM,
  activeSeat: 1,
  turn: 7,
  turnSecondsLeft: 18,
  players: [
    {
      id: "u_me",
      username: "Yoga",
      position: 1,
      status: "alive",
      cash: 1_720,
      tile: 13,
      owned: 3,
      isYou: true,
    },
    {
      id: "u_01",
      username: "PixelBaron",
      position: 2,
      status: "alive",
      cash: 1_340,
      tile: 28,
      owned: 4,
      isYou: false,
    },
    {
      id: "u_02",
      username: "DiceDuchess",
      position: 3,
      status: "alive",
      cash: 980,
      tile: 37,
      owned: 2,
      isYou: false,
    },
    {
      id: "u_03",
      username: "RentSeeker",
      position: 4,
      status: "eliminated",
      cash: 0,
      tile: 8,
      owned: 0,
      isYou: false,
    },
  ],
  // Matches each player's `owned` count above.
  owners: {
    1: 1,
    9: 1,
    13: 1,
    3: 2,
    6: 2,
    18: 2,
    28: 2,
    25: 3,
    31: 3,
  },
  log: [
    { id: "l7", seat: 4, message: "RentSeeker went bankrupt and is out." },
    { id: "l6", seat: 3, message: "DiceDuchess paid 240 rent to PixelBaron." },
    { id: "l5", seat: 2, message: "PixelBaron bought Tokyo for 240." },
    { id: "l4", seat: 1, message: "You rolled 4 and 3." },
    { id: "l3", seat: null, message: "Turn 6 started." },
  ],
};

export const MONOPOLY_STARTING_CASH = STARTING_CASH;

/**
 * Finished room snapshot · only one survivor left. Used when browsing
 * `/room/MNP-WIN` so the winner overlay can be reviewed without playing out
 * a full match against the stub.
 */
export const MOCK_MONOPOLY_FINISHED: MonopolyRoomState = {
  ...MOCK_MONOPOLY_ROOM,
  roomId: "MNP-WIN",
  turn: 24,
  turnSecondsLeft: 0,
  activeSeat: 1,
  players: MOCK_MONOPOLY_ROOM.players.map((player) =>
    player.position === 1
      ? { ...player, cash: 4_180, owned: 9, status: "alive" }
      : { ...player, cash: 0, owned: 0, status: "eliminated" },
  ),
  owners: {
    1: 1,
    3: 1,
    6: 1,
    9: 1,
    14: 1,
    16: 1,
    21: 1,
    23: 1,
    27: 1,
  },
  log: [
    { id: "w1", seat: 1, message: "You win the room!" },
    { id: "w0", seat: 2, message: "PixelBaron is bankrupt and out of the game." },
    ...MOCK_MONOPOLY_ROOM.log,
  ],
};

export function getMonopolyRoom(roomId: string): MonopolyRoomState {
  if (roomId === MOCK_MONOPOLY_FINISHED.roomId) {
    return { ...MOCK_MONOPOLY_FINISHED, roomId };
  }
  return { ...MOCK_MONOPOLY_ROOM, roomId };
}

export function monopolyPrizePool(state: MonopolyRoomState) {
  return prizePool({ entryFee: state.entryFee, maxPlayers: state.maxPlayers });
}

export function playersInSeatOrder(state: MonopolyRoomState) {
  return [...state.players].sort((a, b) => a.position - b.position);
}
