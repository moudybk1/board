import { TriangleAlert } from "lucide-react";

import { PLAY_IS_LIVE, SAMPLE_DATA_NOTE } from "@/lib/platform-status";
import { cn } from "@/lib/utils";

/**
 * States plainly that the figures on this screen are not real.
 *
 * Renders nothing once staking is live. Sits above the content it describes,
 * because a reader who has already scrolled the table has formed an impression
 * the notice then has to undo.
 */
export function SampleDataNotice({ className }: { className?: string }) {
  if (PLAY_IS_LIVE) return null;

  return (
    <div
      role="note"
      data-reveal
      className={cn(
        "flex items-start gap-3 border-2 border-gold/45 bg-gold/8 px-4 py-3",
        className,
      )}
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
      <p className="text-xs leading-relaxed text-parchment">
        {SAMPLE_DATA_NOTE}
      </p>
    </div>
  );
}
