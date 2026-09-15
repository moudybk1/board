/**
 * Mock copy for the welcome / landing surface.
 */

export type WelcomeCta = {
  label: string;
  href: string;
  variant: "primary" | "secondary";
};

export type WelcomeHighlight = {
  id: string;
  title: string;
  body: string;
};

export const WELCOME_HERO = {
  brand: "BOARD",
  eyebrow: "Robinhood Chain",
  headline: "Win the pot.",
  support:
    "Four-player Monopoly and Ludo. Last standing keeps 98%. Load BOARD, take a seat, cash out.",
  proof: "Real pots. On-chain payout. No IOUs.",
  ctas: [
    { label: "Play now", href: "/lobby", variant: "primary" },
    { label: "Sign in", href: "/account", variant: "secondary" },
  ] as WelcomeCta[],
};

export const WELCOME_HIGHLIGHTS: WelcomeHighlight[] = [
  {
    id: "rooms",
    title: "Pooled pots",
    body: "Entry fees fill one room pot. The last player standing keeps 98%.",
  },
  {
    id: "pixel",
    title: "Alive boards",
    body: "Pawns hop tile by tile. Dice tumble. Captures slap. No dead UI.",
  },
  {
    id: "chain",
    title: "On-chain payout",
    body: "Deposit, sit, withdraw. A 2% prize fee funds treasury and burn.",
  },
];

export const WELCOME_LIVE_PULSE = {
  openRooms: 11,
  playersOnline: 2_226,
  potToday: 184_500,
};

export type OnboardingStepStatus = "done" | "current" | "upcoming";

export type OnboardingStep = {
  id: string;
  index: number;
  title: string;
  body: string;
  status: OnboardingStepStatus;
  href?: string;
};

/** Compact path under the hero modes. */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "deposit",
    index: 1,
    title: "Connect wallet",
    body: "Sign in once with your chain wallet.",
    status: "upcoming",
  },
  {
    id: "lobby",
    index: 2,
    title: "Pick a table",
    body: "Monopoly or Ludo. Match the stake.",
    status: "upcoming",
    href: "/lobby",
  },
  {
    id: "win",
    index: 3,
    title: "Take the pot",
    body: "Last standing cashes out.",
    status: "upcoming",
    href: "/lobby",
  },
];

export const ONBOARDING_ACTIONS: WelcomeCta[] = [
  { label: "Enter lobby", href: "/lobby", variant: "primary" },
  { label: "Sign in", href: "/account", variant: "secondary" },
];
