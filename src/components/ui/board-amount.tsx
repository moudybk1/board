import { cva, type VariantProps } from "class-variance-authority";

import { cn, formatBoard, formatBoardCompact } from "@/lib/utils";

const amount = cva("font-pixel tabular-nums", {
  variants: {
    size: {
      xs: "text-[9px]",
      sm: "text-[10px]",
      md: "text-[11px]",
      lg: "text-sm",
      xl: "text-xl text-shadow-pixel",
    },
    tone: {
      default: "text-parchment",
      gold: "text-gold",
      muted: "text-muted",
      success: "text-success",
      danger: "text-danger",
    },
  },
  defaultVariants: { size: "md", tone: "default" },
});

const TICKER_SIZE = {
  xs: "text-[7px]",
  sm: "text-[8px]",
  md: "text-[8px]",
  lg: "text-[9px]",
  xl: "text-[10px]",
} as const;

/**
 * Canonical way to render a BOARD token amount. Keeps grouping, decimals, and
 * the ticker consistent everywhere, and always exposes the exact value to
 * screen readers even when the visible text is abbreviated.
 */
export function BoardAmount({
  value,
  size = "md",
  tone = "default",
  /** Abbreviate large values ("12.5K") · for nav chips and other tight spots. */
  compact = false,
  /** Prefix with an explicit +/- , for ledger-style rows. */
  signed = false,
  showTicker = true,
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> &
  VariantProps<typeof amount> & {
    value: number;
    compact?: boolean;
    signed?: boolean;
    showTicker?: boolean;
  }) {
  const magnitude = Math.abs(value);
  const sign = signed && value !== 0 ? (value > 0 ? "+" : "−") : "";
  const exact = `${sign}${formatBoard(magnitude)}`;
  const text = compact ? `${sign}${formatBoardCompact(magnitude)}` : exact;

  return (
    <span
      className={cn("inline-flex items-baseline gap-1", className)}
      title={`${exact} BOARD`}
      {...props}
    >
      {/* "12.5K" is ambiguous read aloud, so the exact value is kept for
          screen readers whenever the visible text is abbreviated. */}
      <span className={amount({ size, tone })} aria-hidden={compact}>
        {text}
      </span>
      {compact && <span className="sr-only">{exact}</span>}

      {showTicker && (
        <span
          className={cn(
            "font-pixel opacity-60",
            amount({ size, tone }),
            TICKER_SIZE[size ?? "md"],
          )}
        >
          BOARD
        </span>
      )}
    </span>
  );
}
