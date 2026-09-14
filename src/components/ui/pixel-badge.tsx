import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const pixelBadge = cva(
  "pixel-corners inline-flex items-center gap-1.5 border-2 px-2 py-1 font-pixel text-[8px] uppercase",
  {
    variants: {
      tone: {
        neutral: "border-edge bg-surface-raised text-muted",
        gold: "border-gold/60 bg-gold/10 text-gold",
        monopoly: "border-monopoly/50 bg-monopoly/10 text-monopoly",
        ludo: "border-ludo/50 bg-ludo/10 text-ludo",
        success: "border-success/50 bg-success/10 text-success",
        danger: "border-danger/50 bg-danger/10 text-danger",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function PixelBadge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof pixelBadge>) {
  return <span className={cn(pixelBadge({ tone }), className)} {...props} />;
}
