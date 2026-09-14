import Link from "next/link";
import { Coins, Trophy, TriangleAlert, Users } from "lucide-react";

import { SeatDots } from "@/components/lobby/seat-dots";
import { PixelBadge } from "@/components/ui/pixel-badge";
import { PixelButton, PixelButtonLink } from "@/components/ui/pixel-button";
import { PixelPanel } from "@/components/ui/pixel-panel";
import { BoardAmount } from "@/components/ui/board-amount";
import { netPrize, seatsLeft, type Room } from "@/lib/types";
import { cn, formatAge } from "@/lib/utils";

const STATUS_LABEL: Record<Room["status"], string> = {
  waiting: "Open",
  playing: "In progress",
  finished: "Finished",
};

export function RoomCard({
  room,
  balance,
  now,
}: {
  room: Room;
  /** Available balance, used to flag rooms the player cannot afford. */
  balance: number;
  /** Reference timestamp for the room's age label. */
  now: number;
}) {
  const open = room.status === "waiting";
  const free = seatsLeft(room);
  const affordable = balance >= room.entryFee;
  const joinable = open && affordable;
  const shortfall = room.entryFee - balance;
  const shortfallId = `room-${room.id}-shortfall`;
  const accent = room.gameType === "monopoly" ? "monopoly" : "ludo";

  return (
    <PixelPanel
      tone="raised"
      className={cn(
        "flex flex-col gap-4 p-4 transition-colors",
        joinable && "hover:border-gold/60",
        open && !affordable && "border-danger/40",
        !open && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-pixel text-[10px] text-parchment">{room.id}</p>
          <p className="mt-1 text-xs text-faint">
            Opened {formatAge(room.createdAt, now)}
          </p>
        </div>
        <PixelBadge tone={open ? "success" : "neutral"}>
          {open && (
            <i className="size-1.5 bg-success animate-pulse-glow" aria-hidden />
          )}
          {STATUS_LABEL[room.status]}
        </PixelBadge>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <div className="pixel-corners border-2 border-edge bg-void/40 px-2.5 py-2">
          <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-faint">
            <Coins className="size-3" aria-hidden />
            Entry
          </dt>
          <dd className="mt-1">
            <BoardAmount
              value={room.entryFee}
              tone={affordable ? "default" : "danger"}
              showTicker={false}
            />
          </dd>
        </div>
        <div className="pixel-corners border-2 border-gold/40 bg-gold/5 px-2.5 py-2">
          <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-gold/70">
            <Trophy className="size-3" aria-hidden />
            Winner net
          </dt>
          <dd className="mt-1">
            <BoardAmount
              value={netPrize(room)}
              tone="gold"
              showTicker={false}
            />
          </dd>
        </div>
      </dl>

      <p className="font-pixel text-[8px] uppercase text-faint">
        Pot {room.entryFee * room.maxPlayers} · −2% fee (treasury + burn)
      </p>

      <div className="flex items-center justify-between gap-3 border-t-2 border-edge pt-3">
        <div className="flex items-center gap-2">
          <Users className="size-3.5 text-faint" aria-hidden />
          <SeatDots filled={room.players.length} total={room.maxPlayers} />
          <span className="text-[10px] text-faint">
            {room.players.length}/{room.maxPlayers}
          </span>
        </div>

        {joinable && (
          <PixelButtonLink
            href={`/room/${room.id}`}
            variant={accent}
            size="sm"
          >
            Join
          </PixelButtonLink>
        )}

        {open && !affordable && (
          <PixelButton
            variant={accent}
            size="sm"
            disabled
            aria-describedby={shortfallId}
          >
            Join
          </PixelButton>
        )}

        {!open && (
          <span className="font-pixel text-[8px] uppercase text-faint">
            Locked
          </span>
        )}
      </div>

      {open && !affordable && (
        <div
          id={shortfallId}
          role="status"
          className="pixel-corners flex flex-wrap items-center gap-x-2 gap-y-1 border-2 border-danger/40 bg-danger/10 px-3 py-2"
        >
          <TriangleAlert className="size-3 shrink-0 text-danger" aria-hidden />
          <span className="text-[11px] text-danger">
            Need{" "}
            <BoardAmount
              value={shortfall}
              size="xs"
              tone="danger"
              showTicker={false}
            />{" "}
            more to join.
          </span>
          <Link
            href="/wallet/deposit"
            className="ml-auto font-pixel text-[8px] uppercase text-gold underline decoration-gold/40 underline-offset-2 hover:decoration-gold"
          >
            Deposit
          </Link>
        </div>
      )}

      {joinable && free > 0 && (
        <p className="text-[10px] text-muted">
          Waiting for {free} more {free === 1 ? "player" : "players"}
        </p>
      )}
    </PixelPanel>
  );
}
