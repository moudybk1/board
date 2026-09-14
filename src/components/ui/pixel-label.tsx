import { cn } from "@/lib/utils";

/**
 * Uppercase pixel label for form fields and chrome captions.
 */
export function PixelLabel({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "font-pixel text-[9px] uppercase tracking-wide text-muted",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Display heading in Press Start · keep short; the whole UI is pixel type.
 */
export function PixelHeading({
  as: Tag = "h2",
  size = "md",
  className,
  ...props
}: React.ComponentProps<"h2"> & {
  as?: "h1" | "h2" | "h3" | "h4" | "p";
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizes = {
    sm: "text-[10px]",
    md: "text-[12px]",
    lg: "text-sm sm:text-base",
    xl: "text-base sm:text-xl",
  } as const;

  return (
    <Tag
      className={cn(
        "font-pixel uppercase text-parchment text-shadow-pixel",
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
