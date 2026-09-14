/**
 * Side-by-side win-goal comparison for Monopoly vs Ludo (guide mock data).
 */

export type WinGoalCard = {
  id: "monopoly" | "ludo";
  name: string;
  tagline: string;
  winGoal: string;
  howYouGetThere: string[];
  accent: "monopoly" | "ludo";
};

export const WIN_GOAL_INTRO = {
  title: "How you win",
  support:
    "Same room size, same pot rules · different finish lines. Pick the board that matches how you like to play.",
};

export const WIN_GOALS: WinGoalCard[] = [
  {
    id: "monopoly",
    name: "Monopoly",
    tagline: "Own the map",
    winGoal:
      "Be the last player standing with cash after rivals go bankrupt · or hold the strongest portfolio when the timer settles the table.",
    howYouGetThere: [
      "Buy country tiles and their pixel landmarks",
      "Charge rent when opponents land on you",
      "Survive cash crunches longer than everyone else",
    ],
    accent: "monopoly",
  },
  {
    id: "ludo",
    name: "Ludo",
    tagline: "Race home",
    winGoal:
      "Get all four of your pawns from the yard, around the track, and into the home stretch before anyone else finishes.",
    howYouGetThere: [
      "Roll to leave the yard and hop the track",
      "Capture rivals to send them back",
      "Stack finishes · first full set of pawns home wins",
    ],
    accent: "ludo",
  },
];
