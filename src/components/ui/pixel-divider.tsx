import { cn } from "@/lib/utils";

/**
 * Hard 2px rule used between panel sections · never a soft hairline.
 */
export function PixelDivider({
  className,
  label,
  ...props
}: React.ComponentProps<"div"> & { label?: string }) {
  if (label) {
    return (
      <div
        className={cn("flex items-center gap-3", className)}
        role="separator"
        {...props}
      >
        <span className="h-0.5 flex-1 bg-edge" />
        <span className="font-pixel text-[8px] uppercase text-faint">
          {label}
        </span>
        <span className="h-0.5 flex-1 bg-edge" />
      </div>
    );
  }

  return (
    <div
      className={cn("h-0.5 w-full bg-edge", className)}
      role="separator"
      {...props}
    />
  );
}
