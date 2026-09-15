import { cn } from "@/lib/utils";

type PageHeroProps = {
  /** Optional — taste skill: avoid eyebrows on every section. */
  eyebrow?: string;
  title: string;
  support: string;
  meta?: React.ReactNode;
  stage?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

/**
 * Product page hero — asymmetric playfield header, optional eyebrow.
 */
export function PageHero({
  eyebrow,
  title,
  support,
  meta,
  stage,
  actions,
  className,
}: PageHeroProps) {
  return (
    <header
      data-reveal
      className={cn(
        "relative isolate overflow-hidden border-2 border-edge-bright bg-void/40 pixel-inset",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 75% 90% at 100% 0%, color-mix(in srgb, var(--color-gold) 16%, transparent), transparent 55%),
            radial-gradient(ellipse 50% 70% at 0% 100%, color-mix(in srgb, var(--color-monopoly) 10%, transparent), transparent 60%),
            linear-gradient(135deg, transparent 40%, color-mix(in srgb, var(--color-void) 35%, transparent) 100%)
          `,
        }}
      />
      {/* Felt diamond hint inside the hero only */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(45deg, transparent 0 14px, rgba(108,255,159,0.35) 14px 15px),
            repeating-linear-gradient(-45deg, transparent 0 14px, rgba(0,0,0,0.35) 14px 15px)
          `,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-gold to-transparent"
      />

      <div
        className={cn(
          "relative grid gap-6 p-5 sm:gap-8 sm:p-7 lg:p-8",
          stage &&
            "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-center",
        )}
      >
        <div className="min-w-0">
          {eyebrow ? (
            <p className="font-pixel text-[9px] uppercase tracking-[0.2em] text-gold">
              {eyebrow}
            </p>
          ) : null}
          <h1
            className={cn(
              "max-w-xl font-pixel text-pixel-fluid-lg leading-[1.35] text-parchment text-shadow-pixel",
              eyebrow ? "mt-3" : "mt-0",
            )}
          >
            {title}
          </h1>
          <p className="mt-4 max-w-[36rem] text-sm leading-relaxed text-muted">
            {support}
          </p>
          {meta ? (
            <div className="mt-5 flex flex-wrap gap-2">{meta}</div>
          ) : null}
          {actions ? (
            <div className="mt-6 flex flex-wrap gap-2">{actions}</div>
          ) : null}
        </div>

        {stage ? (
          <div className="relative min-w-0 lg:justify-self-stretch">
            {stage}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function HeroStat({
  label,
  value,
  pulse,
}: {
  label: string;
  value: string;
  pulse?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2 border-2 border-edge bg-ink/90 px-3 py-2 shadow-pixel-sm">
      {pulse ? (
        <i
          className="size-1.5 shrink-0 bg-success animate-pulse-glow"
          aria-hidden
        />
      ) : null}
      <span className="font-pixel text-[8px] uppercase text-faint">{label}</span>
      <span className="font-pixel text-[9px] text-parchment">{value}</span>
    </span>
  );
}
