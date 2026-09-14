import { cn } from "@/lib/utils";

/**
 * Wordmark: die face + BOARD. Pixel type reserved for the mark only.
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
      <span
        aria-hidden
        className="grid size-6 shrink-0 place-items-center border border-gold-deep bg-gold text-void sm:size-7"
      >
        <span className="grid grid-cols-2 gap-[3px]">
          <i className="size-[3px] bg-void" />
          <i className="size-[3px] bg-void" />
          <i className="size-[3px] bg-void" />
          <i className="size-[3px] bg-void" />
        </span>
      </span>
      BOARD
    </span>
  );
}
