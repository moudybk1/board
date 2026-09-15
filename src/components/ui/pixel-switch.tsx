"use client";

import { cn } from "@/lib/utils";

/**
 * Chunk pixel toggle — replaces native checkboxes in settings.
 */
export function PixelSwitch({
  checked,
  onChange,
  label,
  description,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "group flex w-full cursor-pointer items-start justify-between gap-4 text-left transition-colors",
        className,
      )}
    >
      <span className="min-w-0">
        <span className="font-pixel text-[10px] uppercase tracking-wide text-parchment">
          {label}
        </span>
        {description ? (
          <span className="mt-1.5 block text-xs leading-relaxed text-muted">
            {description}
          </span>
        ) : null}
      </span>

      <span
        aria-hidden
        className={cn(
          "relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center border-2 px-0.5 transition-[background-color,border-color] duration-[var(--duration-fast)]",
          checked
            ? "border-gold-deep bg-gold/25"
            : "border-edge bg-void",
        )}
      >
        <span
          className={cn(
            "size-5 border-2 transition-transform duration-[var(--duration-fast)] ease-[cubic-bezier(0.32,0.72,0,1)]",
            checked
              ? "translate-x-5 border-gold-deep bg-gold shadow-[2px_0_0_0_var(--color-gold-deep)]"
              : "translate-x-0 border-edge-bright bg-muted",
          )}
        />
      </span>
    </button>
  );
}
