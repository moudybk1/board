import { cn } from "@/lib/utils";

/**
 * Wordmark: board-game mark + BOARD. Pixel type reserved for the mark only.
 */
export function BoardLogo({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 font-pixel text-base text-parchment",
        className,
      )}
      {...props}
    >
      {/* Native img keeps the PNG alpha channel; no white fill behind the mark. */}
      <img
        src="/board-logo.png"
        alt=""
        width={28}
        height={28}
        data-pixel
        className="size-6 shrink-0 bg-transparent sm:size-7"
        draggable={false}
      />
      BOARD
    </span>
  );
}
