import { cn } from "@/lib/utils";

/**
 * Outer toy frame for boards / stages · thick chocolate rim + jelly shadow.
 */
export function PixelFrame({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "pixel-corners border-[4px] border-void bg-cream shadow-pixel-lg",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
