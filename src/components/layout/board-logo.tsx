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
        "inline-flex items-center gap-2.5 font-pixel leading-none text-parchment",
        className,
      )}
      {...props}
    >
      {/* Native img keeps the PNG alpha channel; no white fill behind the mark. */}
      <img
        src="/board-logo.png"
        alt=""
        width={36}
        height={36}
        data-pixel
        className="size-8 shrink-0 bg-transparent sm:size-9"
        draggable={false}
      />
      <span className="pt-0.5">BOARD</span>
    </span>
  );
}
