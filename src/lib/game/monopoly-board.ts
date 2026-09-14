import { LANDMARKS, type LandmarkKey } from "@/lib/game/landmarks";

/**
 * World Tour Monopoly perimeter. Properties are famous cities grouped by
 * region, each with a pixel landmark. The grid is 13×13 (48 perimeter tiles).
 */

export type CountryGroup = {
  id: string;
  name: string;
  /** Colour of the tile's group bar. */
  color: string;
};

export const COUNTRY_GROUPS: Record<string, CountryGroup> = {
  ancient: { id: "ancient", name: "Ancient World", color: "#8c6239" },
  mediterranean: {
    id: "mediterranean",
    name: "Mediterranean",
    color: "#5aa9e6",
  },
  western: { id: "western", name: "Western Europe", color: "#e46fa8" },
  northern: { id: "northern", name: "Northern Europe", color: "#e8933f" },
  asia: { id: "asia", name: "Asia", color: "#d9544d" },
  pacific: { id: "pacific", name: "Pacific", color: "#f5c451" },
  americas: { id: "americas", name: "Americas", color: "#5ddc82" },
  atlantic: { id: "atlantic", name: "North Atlantic", color: "#6c7bf5" },
};

export type TileKind =
  | "go"
  | "country"
  | "airport"
  | "exchange"
  | "treasury"
  | "chance"
  | "burn"
  | "jail"
  | "vault"
  | "go-to-jail";

/** Which side of the board a tile sits on; the group bar faces the centre. */
export type TileEdge = "bottom" | "left" | "top" | "right";

export type BoardTile = {
  index: number;
  kind: TileKind;
  /** City (or special) name shown on the board. */
  name: string;
  /** Short label used when space is tight. */
  short: string;
  group?: string;
  landmark?: LandmarkKey;
  price?: number;
  rent?: number;
};

type CitySeed = [
  index: number,
  name: string,
  short: string,
  group: string,
  landmark: LandmarkKey,
  price: number,
  rent: number,
];

/** City properties around the 48-tile track. */
const CITIES: CitySeed[] = [
  [1, "Cairo", "CAI", "ancient", "pyramids", 60, 2],
  [3, "Petra", "PTR", "ancient", "petra", 60, 4],

  [6, "Istanbul", "IST", "mediterranean", "hagia-sophia", 100, 6],
  [8, "Athens", "ATH", "mediterranean", "parthenon", 100, 6],
  [9, "Rome", "ROM", "mediterranean", "colosseum", 120, 8],
  [10, "Venice", "VEN", "mediterranean", "venice", 120, 8],
  [11, "Barcelona", "BCN", "mediterranean", "sagrada-familia", 140, 10],

  [13, "Paris", "PAR", "western", "eiffel-tower", 140, 10],
  [15, "Madrid", "MAD", "western", "madrid", 140, 10],
  [16, "Amsterdam", "AMS", "western", "windmill", 160, 12],
  [18, "Berlin", "BER", "northern", "brandenburg-gate", 180, 14],
  [20, "London", "LON", "northern", "big-ben", 180, 14],
  [21, "Moscow", "MOW", "northern", "st-basil", 200, 16],
  [22, "Vienna", "VIE", "northern", "vienna", 200, 16],
  [23, "Prague", "PRG", "northern", "prague", 220, 18],

  [25, "Mumbai", "BOM", "asia", "taj-mahal", 220, 18],
  [27, "Beijing", "PEK", "asia", "great-wall", 220, 18],
  [28, "Tokyo", "TYO", "asia", "torii", 240, 20],
  [30, "Jakarta", "JKT", "pacific", "borobudur", 260, 22],
  [31, "Singapore", "SIN", "pacific", "merlion", 260, 22],
  [33, "Sydney", "SYD", "pacific", "opera-house", 280, 24],
  [34, "Seoul", "SEL", "asia", "seoul", 280, 24],
  [35, "Bangkok", "BKK", "pacific", "bangkok", 300, 26],

  [37, "Rio", "RIO", "americas", "christ-redeemer", 300, 26],
  [39, "Santiago", "SCL", "americas", "moai", 300, 26],
  [40, "Mexico City", "MEX", "americas", "chichen-itza", 320, 28],
  [43, "Dubai", "DXB", "atlantic", "dubai", 340, 32],
  [45, "Toronto", "YTO", "atlantic", "cn-tower", 350, 35],
  [46, "New York", "NYC", "atlantic", "statue-of-liberty", 400, 50],
  [47, "Cape Town", "CPT", "americas", "cape-town", 380, 40],
];

type SpecialSeed = [
  index: number,
  kind: TileKind,
  name: string,
  short: string,
  price?: number,
];

const SPECIALS: SpecialSeed[] = [
  [0, "go", "Go", "GO"],
  [2, "treasury", "Treasury", "TRSY"],
  [4, "burn", "Burn Tax", "BURN"],
  [5, "airport", "Cairo Airport", "AIR", 200],
  [7, "chance", "Chance", "?"],
  [12, "jail", "Jail", "JAIL"],
  [14, "exchange", "Token Exchange", "EXCH", 150],
  [17, "airport", "Paris Airport", "AIR", 200],
  [19, "treasury", "Treasury", "TRSY"],
  [24, "vault", "Free Vault", "VAULT"],
  [26, "chance", "Chance", "?"],
  [29, "airport", "Tokyo Airport", "AIR", 200],
  [32, "exchange", "Bridge Toll", "TOLL", 150],
  [36, "go-to-jail", "Go To Jail", "GO TO JAIL"],
  [38, "treasury", "Treasury", "TRSY"],
  [41, "airport", "New York Airport", "AIR", 200],
  [42, "chance", "Chance", "?"],
  [44, "burn", "Burn Tax", "BURN"],
];

/** CSS grid dimension (includes the hollow centre). */
export const BOARD_SIZE = 13;

/** Perimeter tile count · 4 × (BOARD_SIZE − 1). */
export const BOARD_TILE_COUNT = 4 * (BOARD_SIZE - 1);

export const BOARD_TILES: BoardTile[] = (() => {
  const tiles = new Array<BoardTile>(BOARD_TILE_COUNT);

  for (const [index, name, short, group, landmark, price, rent] of CITIES) {
    tiles[index] = {
      index,
      kind: "country",
      name,
      short,
      group,
      landmark,
      price,
      rent,
    };
  }

  for (const [index, kind, name, short, price] of SPECIALS) {
    tiles[index] = { index, kind, name, short, price };
  }

  const missing = tiles.findIndex((tile) => tile === undefined);
  if (missing !== -1) {
    throw new Error(`Board tile ${missing} is undefined`);
  }

  return tiles;
})();

/**
 * Maps a tile index to its cell in the board grid. Tile 0 (Go) sits at the
 * bottom-right and the track runs counter-clockwise from there.
 */
export function tilePlacement(index: number): {
  row: number;
  col: number;
  edge: TileEdge;
} {
  const last = BOARD_SIZE;
  const side = BOARD_SIZE - 1;

  if (index === 0) return { row: last, col: last, edge: "bottom" };
  if (index < side) return { row: last, col: last - index, edge: "bottom" };

  if (index === side) return { row: last, col: 1, edge: "left" };
  if (index < side * 2) {
    return { row: last - (index - side), col: 1, edge: "left" };
  }

  if (index === side * 2) return { row: 1, col: 1, edge: "top" };
  if (index < side * 3) {
    return { row: 1, col: 1 + (index - side * 2), edge: "top" };
  }

  if (index === side * 3) return { row: 1, col: last, edge: "right" };
  return { row: 1 + (index - side * 3), col: last, edge: "right" };
}

export function isCorner(index: number) {
  return index % (BOARD_SIZE - 1) === 0;
}

export function landmarkFor(tile: BoardTile) {
  return tile.landmark ? LANDMARKS[tile.landmark] : undefined;
}

export function groupFor(tile: BoardTile) {
  return tile.group ? COUNTRY_GROUPS[tile.group] : undefined;
}
