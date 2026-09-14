import { ROADMAP, TOKEN_INFO, type RoadmapItem } from "@/lib/mock/token-roadmap";
import { cn } from "@/lib/utils";

export function TokenRoadmapSection({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="token-roadmap-title"
      className={cn("border-t border-edge py-12 sm:py-16", className)}
    >
      <div className="board-container grid gap-12 lg:grid-cols-2 lg:gap-20">
        <div>
          <h2
            id="token-roadmap-title"
            className="text-sm leading-snug text-parchment sm:text-base"
          >
            {TOKEN_INFO.symbol} on {TOKEN_INFO.chain}
          </h2>
          <p className="mt-4 max-w-[55ch] text-[9px] leading-relaxed text-muted sm:text-[10px]">
            {TOKEN_INFO.role}
          </p>
          <p className="mt-3 max-w-[55ch] text-[9px] leading-relaxed text-muted sm:text-[10px]">
            {TOKEN_INFO.feeNote}
          </p>

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 text-[9px] uppercase tracking-wider">
            <div>
              <dt className="text-faint">Symbol</dt>
              <dd className="mt-1 text-[10px] text-gold">{TOKEN_INFO.symbol}</dd>
            </div>
            <div>
              <dt className="text-faint">Network</dt>
              <dd className="mt-1 text-[10px] text-parchment">{TOKEN_INFO.chain}</dd>
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
        ? "text-gold"
        : "text-faint";

  return (
    <li
      className={cn(
        "grid grid-cols-[5rem_1fr] gap-4 border-b border-edge py-5 sm:grid-cols-[6rem_1fr]",
        isLast && "border-b-0",
      )}
    >
      <span className={cn("text-[9px] uppercase", statusClass)}>
        {statusLabel}
      </span>
      <div>
        <h3 className="text-[10px] text-parchment sm:text-xs">{item.title}</h3>
        <p className="mt-1.5 text-[8px] leading-relaxed text-muted sm:text-[9px]">
          {item.body}
        </p>
      </div>
    </li>
  );
}
