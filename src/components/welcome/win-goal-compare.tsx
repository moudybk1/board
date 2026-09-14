import { WIN_GOAL_INTRO, WIN_GOALS, type WinGoalCard } from "@/lib/mock/win-goals";
import { cn } from "@/lib/utils";

export function WinGoalCompare({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="win-goal-title"
      className={cn("border-t-2 border-edge pt-10", className)}
    >
      <header className="mb-8 max-w-2xl">
        <p className="font-pixel text-[9px] uppercase tracking-widest text-gold">
          Games
        </p>
        <h2
          id="win-goal-title"
          className="mt-3 font-pixel text-sm text-parchment text-shadow-pixel sm:text-base"
        >
          {WIN_GOAL_INTRO.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {WIN_GOAL_INTRO.support}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        {WIN_GOALS.map((game) => (
          <WinGoalPanel key={game.id} game={game} />
        ))}
      </div>
    </section>
  );
}

function WinGoalPanel({ game }: { game: WinGoalCard }) {
  const accentBorder =
    game.accent === "monopoly" ? "border-monopoly/50" : "border-ludo/50";
  const accentText =
    game.accent === "monopoly" ? "text-monopoly" : "text-ludo";
  const accentBg =
    game.accent === "monopoly" ? "bg-monopoly/10" : "bg-ludo/10";

  return (
    <article
      className={cn(
        "pixel-corners flex flex-col border-2 bg-surface/40 p-5 shadow-pixel-sm sm:p-6",
        accentBorder,
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className={cn("font-pixel text-xs sm:text-sm", accentText)}>
          {game.name}
        </h3>
        <span
          className={cn(
            "pixel-corners px-2 py-1 font-pixel text-[8px] uppercase tracking-wide text-parchment",
            accentBg,
          )}
        >
          {game.tagline}
        </span>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted">{game.winGoal}</p>

      <p className="mt-5 font-pixel text-[8px] uppercase tracking-widest text-faint">
        Path to the crown
      </p>
      <ul className="mt-3 space-y-2">
        {game.howYouGetThere.map((line) => (
          <li
            key={line}
            className="flex gap-2 text-sm leading-relaxed text-parchment/90"
          >
            <span className={cn("mt-1.5 size-1.5 shrink-0", accentBg)} aria-hidden />
            {line}
          </li>
        ))}
      </ul>
    </article>
  );
}
