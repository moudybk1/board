import { ROADMAP, TOKEN_INFO, type RoadmapItem } from "@/lib/mock/token-roadmap";
import { cn } from "@/lib/utils";

export function TokenRoadmapSection({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="token-roadmap-title"
      className={cn("border-t-[3px] border-void bg-cream/40 py-12 sm:py-16", className)}
    >
      <div className="board-container grid gap-12 lg:grid-cols-2 lg:gap-20">
        <div>
          <h2
            id="token-roadmap-title"
            className="font-pixel text-2xl font-bold leading-snug text-parchment sm:text-3xl"
          >
            {TOKEN_INFO.symbol} on {TOKEN_INFO.chain}
          </h2>
          <p className="mt-4 max-w-[55ch] text-base leading-relaxed text-muted">
            {TOKEN_INFO.role}
          </p>
          <p className="mt-3 max-w-[55ch] text-base leading-relaxed text-muted">
            {TOKEN_INFO.feeNote}
          </p>

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 text-sm font-bold uppercase tracking-wide">
            <div>
              <dt className="text-faint">Symbol</dt>
              <dd className="mt-1 text-lg text-gold-deep">{TOKEN_INFO.symbol}</dd>
            </div>
            <div>
              <dt className="text-faint">Network</dt>
              <dd className="mt-1 text-lg text-parchment">{TOKEN_INFO.chain}</dd>
            </div>
          </dl>
        </div>

        <ol className="space-y-0 border-t border-edge">
          {ROADMAP.map((item, index) => (
            <RoadmapRow
              key={item.id}
              item={item}
              isLast={index === ROADMAP.length - 1}
            />
          ))}
        </ol>
      </div>
    </section>
  );
}

function RoadmapRow({
  item,
  isLast,
}: {
  item: RoadmapItem;
  isLast: boolean;
}) {
  const statusLabel =
    item.status === "live" ? "Live" : item.status === "next" ? "Next" : "Later";
  const statusClass =
    item.status === "live"
      ? "text-success"
      : item.status === "next"
        ? "text-gold-deep"
        : "text-faint";

  return (
    <li
      className={cn(
        "grid grid-cols-[5rem_1fr] gap-4 border-b-[3px] border-void/15 py-5 sm:grid-cols-[6rem_1fr]",
        isLast && "border-b-0",
      )}
    >
      <span className={cn("text-sm font-bold uppercase", statusClass)}>
        {statusLabel}
      </span>
      <div>
        <h3 className="text-base font-bold text-parchment sm:text-lg">{item.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          {item.body}
        </p>
      </div>
    </li>
  );
}
