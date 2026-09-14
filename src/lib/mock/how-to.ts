/**
 * Numbered how-to-play copy for /how-to.
 */

export type HowToStep = {
  id: string;
  number: number;
  title: string;
  body: string;
};

export const HOW_TO_INTRO = {
  title: "How to play",
  support:
    "From the welcome page to the winner screen: the short path every BOARD table follows.",
};

export const HOW_TO_STEPS: HowToStep[] = [
  {
    id: "deposit",
    number: 1,
    title: "Deposit BOARD tokens",
    body: "Open Wallet and fund your platform balance on Robinhood Chain. Rooms check available balance before they let you sit.",
  },
  {
    id: "choose",
    number: 2,
    title: "Choose Monopoly or Ludo",
    body: "Head to the lobby. Pick the game you want, then filter rooms by entry fee so the pot matches your stake.",
  },
  {
    id: "join",
    number: 3,
    title: "Join a four-player room",
    body: "Each room holds four seats. Paying the entry fee drops that amount into the shared pot. Wait for the table to fill, then play.",
  },
  {
    id: "play",
    number: 4,
    title: "Play the board",
    body: "Monopoly: roll, buy country tiles with landmark art, collect rent. Ludo: roll, move pawns, capture rivals, race home. One winner per room.",
  },
  {
    id: "win",
    number: 5,
    title: "Claim the pot (minus 2%)",
    body: "The winner receives every entry fee combined, after a 2% fee. That slice goes to the project treasury and is burned. You keep 98%.",
  },
];

export const HOW_TO_CTAS = [
  { label: "Deposit", href: "/wallet", variant: "primary" as const },
  { label: "Enter lobby", href: "/lobby", variant: "secondary" as const },
];
