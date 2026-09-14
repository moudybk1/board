"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ActionBar } from "@/components/room/action-bar";
import { ActivityLog } from "@/components/room/activity-log";
import { BoardStage } from "@/components/room/board-stage";
import { BuyPanel } from "@/components/room/buy-panel";
import {
  PawnLayer,
  type PawnState,
} from "@/components/room/pawn-layer";
import { RentToast, type RentNotice } from "@/components/room/rent-toast";
import { PlayerRail } from "@/components/room/player-rail";
import { WinnerScreen } from "@/components/room/winner-screen";
import { playSfx } from "@/lib/audio/audio-manager";
import { pathForward } from "@/lib/game/board-geometry";
import { BOARD_TILE_COUNT, BOARD_TILES } from "@/lib/game/monopoly-board";
import { rollDice, type DieValue } from "@/lib/game/dice";
import {
  monopolyPrizePool,
  type MonopolyLogEntry,
  type MonopolyRoomState,
} from "@/lib/mock/monopoly";

/** How long the dice tumble before the result is revealed. */
const ROLL_MS = 900;

type HopMove = {
  seat: number;
  path: number[];
  landing: number;
};

export function MonopolyRoom({
  initialState,
}: {
  initialState: MonopolyRoomState;
}) {
  const [state, setState] = useState<MonopolyRoomState>(initialState);
  const [dice, setDice] = useState<readonly [DieValue, DieValue] | null>(null);
  const [rolling, setRolling] = useState(false);
  const [hop, setHop] = useState<HopMove | null>(null);
  /** Tile index awaiting your buy/pass decision, if any. */
  const [pendingBuy, setPendingBuy] = useState<number | null>(null);
  const [rentNotice, setRentNotice] = useState<RentNotice | null>(null);
  const timers = useRef<number[]>([]);
  const hopRef = useRef<HopMove | null>(null);

  useEffect(
    () => () => {
      for (const timer of timers.current) window.clearTimeout(timer);
      timers.current = [];
    },
    [],
  );

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    hopRef.current = hop;
  }, [hop]);

  const players = useMemo(
    () => [...state.players].sort((a, b) => a.position - b.position),
    [state.players],
  );

  const pawns = useMemo<PawnState[]>(
    () =>
      players.map((player) => ({
        id: player.id,
        seat: player.position,
        username: player.username,
        tile: player.tile,
        eliminated: player.status === "eliminated",
      })),
    [players],
  );

  const you = players.find((player) => player.isYou);
  const yourTurn = you?.position === state.activeSeat;
  const activePlayer = players.find(
    (player) => player.position === state.activeSeat,
  );
  const canBuy =
    pendingBuy !== null &&
    (you?.cash ?? 0) >= (BOARD_TILES[pendingBuy].price ?? 0);

  const winner = useMemo(() => {
    const alive = players.filter((player) => player.status !== "eliminated");
    if (alive.length !== 1) return null;
    const sole = alive[0];
    return {
      seat: sole.position,
      username: sole.username,
      isYou: sole.isYou,
      pot: monopolyPrizePool(state),
    };
  }, [players, state]);

  const finished = winner !== null;

  useEffect(() => {
    if (!finished || !winner) return;
    playSfx(winner.isYou ? "win" : "lose");
  }, [finished, winner]);

  const appendLog = useCallback((entry: Omit<MonopolyLogEntry, "id">) => {
    setState((current) => ({
      ...current,
      log: [
        { ...entry, id: `l-${current.log.length + 1}-${Date.now()}` },
        ...current.log,
      ],
    }));
  }, []);

  const chargeRent = useCallback(
    (tileIndex: number, payerSeat: number, ownerSeat: number) => {
      const tile = BOARD_TILES[tileIndex];
      const current = stateRef.current;
      const payer = current.players.find((p) => p.position === payerSeat);
      const owner = current.players.find((p) => p.position === ownerSeat);
      if (!payer || !owner) return;

      const due = tile.rent ?? 0;
      const paid = Math.min(due, payer.cash);
      const bankrupted = paid < due || payer.cash - paid <= 0;
      playSfx("rent");

      setState((previous) => ({
        ...previous,
        players: previous.players.map((player) => {
          if (player.position === payerSeat) {
            return {
              ...player,
              cash: player.cash - paid,
              status: bankrupted ? "eliminated" : player.status,
            };
          }
          if (player.position === ownerSeat) {
            return { ...player, cash: player.cash + paid };
          }
          return player;
        }),
      }));

      const payerName = payer.isYou ? "You" : payer.username;
      const ownerName = owner.isYou ? "you" : owner.username;

      appendLog({
        seat: payerSeat,
        message: `${payerName} paid ${paid} rent to ${ownerName} for ${tile.name}.`,
      });

      if (bankrupted) {
        appendLog({
          seat: payerSeat,
          message: `${payerName} ${payer.isYou ? "are" : "is"} bankrupt and out of the game.`,
        });

        const survivors = current.players.filter(
          (player) =>
            player.position !== payerSeat && player.status !== "eliminated",
        );
        if (survivors.length === 1) {
          const sole = survivors[0];
          appendLog({
            seat: sole.position,
            message: `${sole.isYou ? "You" : sole.username} win${
              sole.isYou ? "" : "s"
            } the room!`,
          });
          setPendingBuy(null);
        }
      }

      setRentNotice({
        id: `${tileIndex}-${payerSeat}-${Date.now()}`,
        country: tile.name,
        amount: paid,
        payerSeat,
        payerName,
        ownerSeat,
        ownerName: owner.isYou ? "You" : owner.username,
        bankrupted,
        youArePayer: Boolean(payer.isYou),
      });
    },
    [appendLog],
  );

  const resolveLanding = useCallback(
    (landing: number, seat: number) => {
      const tile = BOARD_TILES[landing];
      const roller = stateRef.current.players.find((p) => p.position === seat);
      if (!roller) return;
      const who = roller.isYou ? "You" : roller.username;

      appendLog({ seat, message: `${who} landed on ${tile.name}.` });

      if (tile.kind !== "country") return;

      const ownerSeat = stateRef.current.owners[landing];

      if (ownerSeat === undefined) {
        if (roller.isYou) setPendingBuy(landing);
        return;
      }

      if (ownerSeat === seat) {
        appendLog({ seat, message: `${who} already own ${tile.name}.` });
        return;
      }

      chargeRent(landing, seat, ownerSeat);
    },
    [appendLog, chargeRent],
  );

  const handleHopComplete = useCallback(() => {
    const current = hopRef.current;
    if (!current) return;

    const { seat, landing } = current;
    setHop(null);
    hopRef.current = null;

    setState((prev) => ({
      ...prev,
      players: prev.players.map((player) =>
        player.position === seat ? { ...player, tile: landing } : player,
      ),
    }));

    resolveLanding(landing, seat);
  }, [resolveLanding]);

  const handleRoll = useCallback(() => {
    if (rolling || finished || hop) return;

    const seat = state.activeSeat;
    const roller = state.players.find((player) => player.position === seat);
    if (!roller) return;

    setRolling(true);
    setDice(null);
    playSfx("dice_roll");

    const result = rollDice();
    const from = roller.tile;
    const landing = (from + result.total) % BOARD_TILE_COUNT;
    const path = pathForward(from, result.total);

    const reveal = window.setTimeout(() => {
      setDice(result.dice);
      setRolling(false);

      appendLog({
        seat,
        message: `${roller.isYou ? "You" : roller.username} rolled ${
          result.dice[0]
        } and ${result.dice[1]}.`,
      });

      // Drive hops from an explicit path; tile updates only after animation.
      if (path.length === 0) {
        setState((prev) => ({
          ...prev,
          players: prev.players.map((player) =>
            player.position === seat ? { ...player, tile: landing } : player,
          ),
        }));
        resolveLanding(landing, seat);
        return;
      }

      const nextHop = { seat, path, landing };
      hopRef.current = nextHop;
      setHop(nextHop);
    }, ROLL_MS);

    timers.current.push(reveal);
  }, [
    appendLog,
    finished,
    hop,
    resolveLanding,
    rolling,
    state.activeSeat,
    state.players,
  ]);

  const handleBuy = useCallback(() => {
    if (pendingBuy === null || finished) return;

    const tile = BOARD_TILES[pendingBuy];
    const price = tile.price ?? 0;
    const seat = state.activeSeat;

    setState((current) => {
      const buyer = current.players.find(
        (player) => player.position === seat,
      );
      if (!buyer || buyer.cash < price) return current;

      return {
        ...current,
        owners: { ...current.owners, [pendingBuy]: seat },
        players: current.players.map((player) =>
          player.position === seat
            ? { ...player, cash: player.cash - price, owned: player.owned + 1 }
            : player,
        ),
      };
    });

    appendLog({ seat, message: `You bought ${tile.name} for ${price}.` });
    playSfx("buy");
    setPendingBuy(null);
  }, [appendLog, finished, pendingBuy, state.activeSeat]);

  const handleDecline = useCallback(() => {
    if (pendingBuy === null || finished) return;

    appendLog({
      seat: state.activeSeat,
      message: `You passed on ${BOARD_TILES[pendingBuy].name}.`,
    });
    setPendingBuy(null);
  }, [appendLog, finished, pendingBuy, state.activeSeat]);

  const handleEndTurn = useCallback(() => {
    if (finished || hop) return;
    setState((current) => {
      const alive = [...current.players]
        .filter((player) => player.status !== "eliminated")
        .sort((a, b) => a.position - b.position);
      if (alive.length === 0) return current;

      const currentIndex = alive.findIndex(
        (player) => player.position === current.activeSeat,
      );
      const next = alive[(currentIndex + 1) % alive.length];

      return {
        ...current,
        activeSeat: next.position,
        turn:
          next.position <= current.activeSeat
            ? current.turn + 1
            : current.turn,
        turnSecondsLeft: 30,
      };
    });
    setDice(null);
  }, [finished, hop]);

  return (
    <div className="flex flex-col gap-2 lg:gap-3">
      <div className="flex items-start gap-2 lg:gap-3">
        <PlayerRail
          players={players}
          activeSeat={state.activeSeat}
          className="hidden w-[6.75rem] shrink-0 lg:flex"
        />

        <div className="min-w-0 flex-1">
          <BoardStage
            owners={state.owners}
            activeTile={hop?.landing ?? activePlayer?.tile}
            className="mx-auto w-full max-w-[min(100%,calc(100vh-10.5rem))]"
            overlay={
              <>
                <PawnLayer
                  pawns={pawns}
                  movingSeat={hop?.seat ?? null}
                  movePath={hop?.path ?? null}
                  onMoveComplete={handleHopComplete}
                />
                {rentNotice && !finished && (
                  <RentToast
                    notice={rentNotice}
                    onDismiss={() => setRentNotice(null)}
                  />
                )}
                {pendingBuy !== null && !finished && (
                  <BuyPanel
                    tile={BOARD_TILES[pendingBuy]}
                    cash={you?.cash ?? 0}
                    onBuy={handleBuy}
                    onDecline={handleDecline}
                  />
                )}
                {winner && <WinnerScreen winner={winner} />}
              </>
            }
          />
        </div>

        <ActivityLog
          entries={state.log}
          className="hidden w-[12rem] shrink-0 self-stretch xl:flex xl:flex-col"
        />
      </div>

      <PlayerRail
        players={players}
        activeSeat={state.activeSeat}
        className="lg:hidden"
      />

      <ActionBar
        yourTurn={yourTurn && !finished && !hop}
        rolling={rolling}
        moving={Boolean(hop)}
        dice={dice}
        canBuy={canBuy && !finished}
        onRoll={handleRoll}
        onBuy={handleBuy}
        onEndTurn={handleEndTurn}
      />
      {hop ? (
        <p className="text-center font-mono text-[10px] uppercase tracking-wide text-gold">
          Hopping {hop.path.length}{" "}
          {hop.path.length === 1 ? "tile" : "tiles"}
        </p>
      ) : null}

      <ActivityLog entries={state.log} className="xl:hidden" />
    </div>
  );
}
