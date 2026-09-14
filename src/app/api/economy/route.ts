import { NextResponse } from "next/server";

import {
  calculateRoomEconomy,
  getEconomyExample,
  getRoomEconomyConfig,
} from "@/server/services/economy.service";

/**
 * GET /api/economy · room pot / fee configuration and optional breakdown.
 *
 * Query:
 * - `entryFee` number · when set, returns a full pot breakdown for that fee
 * - `seats`    number · defaults to maxPlayers (4)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const entryFeeRaw = url.searchParams.get("entryFee");
  const seatsRaw = url.searchParams.get("seats");

  try {
    const config = getRoomEconomyConfig();

    if (entryFeeRaw === null) {
      return NextResponse.json({
        config,
        example: getEconomyExample(),
        source: "config",
      });
    }

    const entryFee = Number(entryFeeRaw);
    if (!Number.isFinite(entryFee) || entryFee < 0) {
      return NextResponse.json(
        { error: "entryFee must be a non-negative number." },
        { status: 400 },
      );
    }

    let seats = config.maxPlayers;
    if (seatsRaw !== null) {
      seats = Number(seatsRaw);
      if (!Number.isFinite(seats) || seats < 1) {
        return NextResponse.json(
          { error: "seats must be an integer >= 1." },
          { status: 400 },
        );
      }
    }

    return NextResponse.json({
      config,
      breakdown: calculateRoomEconomy(entryFee, seats, config),
      source: "config",
    });
  } catch (error) {
    console.error("[GET /api/economy]", error);
    return NextResponse.json(
      { error: "Failed to load economy config." },
      { status: 500 },
    );
  }
}
