import { PixelButtonLink } from "@/components/ui/pixel-button";
import { cn } from "@/lib/utils";

const GUIDE_ACTIONS = [
  { label: "Deposit", href: "/wallet", variant: "primary" as const },
  { label: "Enter lobby", href: "/lobby", variant: "secondary" as const },
] as const;

/**
 * Shared guide footer CTAs: exit to deposit or lobby.
 */
export function GuideActionBar({
  className,
  hint = "Deposit first if your balance is empty, then pick a room in the lobby.",
}: {
  className?: string;
  hint?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-edge pt-8 sm:flex-row sm:flex-wrap sm:items-center",
        className,
      )}
    >
      {GUIDE_ACTIONS.map((cta) => (
        <PixelButtonLink
          key={cta.href}
          href={cta.href}
          size="lg"
          variant={cta.variant}
          className="w-full justify-center sm:w-auto"
        >
          {cta.label}
        </PixelButtonLink>
      ))}
      {hint ? (
        <p className="w-full text-xs leading-relaxed text-faint sm:ml-1 sm:max-w-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
