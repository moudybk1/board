import {
  PixelPanel,
  PixelPanelHeader,
  PixelPanelTitle,
} from "@/components/ui/pixel-panel";
import { seatColor } from "@/lib/game/seats";
import type { MonopolyLogEntry } from "@/lib/mock/monopoly";
import type { LudoLogEntry } from "@/lib/mock/ludo";
import { cn } from "@/lib/utils";

type LogEntry = MonopolyLogEntry | LudoLogEntry;

/** Running feed of turns, purchases, rent, captures, and finishes. */
export function ActivityLog({
  entries,
  className,
}: {
  entries: LogEntry[];
  className?: string;
}) {
  return (
    <PixelPanel className={cn("flex flex-col", className)}>
      <PixelPanelHeader>
        <PixelPanelTitle>Activity</PixelPanelTitle>
      </PixelPanelHeader>

      <ol
        aria-live="polite"
        className="flex max-h-48 list-none flex-col gap-1.5 overflow-y-auto p-2 text-[11px] lg:max-h-[min(70vh,720px)]"
      >
        {entries.map((entry) => (
          <li key={entry.id} className="flex items-start gap-2">
            <span
              aria-hidden
              className={cn(
                "mt-1 size-2 shrink-0 border border-void/40",
                entry.seat === null
                  ? "bg-edge-bright"
                  : seatColor(entry.seat).bg,
              )}
            />
            <span className="text-[11px] leading-relaxed text-muted">
              {entry.message}
            </span>
          </li>
        ))}
      </ol>
    </PixelPanel>
  );
}
