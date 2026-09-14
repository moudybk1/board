import { cn } from "@/lib/utils";

/**
 * Outer hard frame for boards / stages · thicker edge + large pixel shadow.
 */
export function PixelFrame({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "pixel-corners border-2 border-edge-bright bg-void shadow-pixel-lg",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
