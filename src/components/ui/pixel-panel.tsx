import { cn } from "@/lib/utils";

const toneClasses = {
  default: "border-edge bg-surface",
  raised: "border-edge-bright bg-surface-raised",
  gold: "border-gold/60 bg-gold/5",
  monopoly: "border-monopoly/50 bg-monopoly/5",
  ludo: "border-ludo/50 bg-ludo/5",
} as const;

export type PanelTone = keyof typeof toneClasses;

export function PixelPanel({
  tone = "default",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { tone?: PanelTone }) {
  return (
    <div
      className={cn(
        "pixel-corners border-2 shadow-pixel",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function PixelPanelHeader({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b-2 border-edge bg-void/40 px-4 py-3",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function PixelPanelTitle({
  className,
  children,
  ...props
}: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn(
        "font-pixel text-[11px] uppercase text-parchment text-shadow-pixel",
        className,
      )}
      {...props}
    >
      {children}
    </h2>
  );
}
