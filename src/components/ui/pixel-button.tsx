"use client";

import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";

import { playSfx } from "@/lib/audio/audio-manager";
import { cn } from "@/lib/utils";

const pixelButton = cva(
  // The translate-on-press trick sells the "physical key" feel: the button
  // slides into its own hard shadow instead of fading or scaling.
  [
    "pixel-corners inline-flex select-none items-center justify-center gap-2 border-2",
    "font-pixel uppercase transition-[transform,box-shadow,background-color] duration-100",
    "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
    "disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none",
  ],
  {
    variants: {
      variant: {
        primary:
          "border-gold-deep bg-gold text-void shadow-pixel hover:bg-gold/85",
        secondary:
          "border-edge-bright bg-surface-raised text-parchment shadow-pixel hover:bg-surface-hover",
        outline:
          "border-edge-bright bg-transparent text-parchment shadow-pixel-sm hover:bg-surface-hover",
        monopoly:
          "border-monopoly/70 bg-monopoly/15 text-monopoly shadow-pixel hover:bg-monopoly/25",
        ludo: "border-ludo/70 bg-ludo/15 text-ludo shadow-pixel hover:bg-ludo/25",
        ghost:
          "border-transparent bg-transparent text-muted shadow-none hover:text-parchment active:translate-none",
      },
      size: {
        sm: "px-3 py-2 text-[9px]",
        md: "px-5 py-3 text-[10px]",
        lg: "px-7 py-4 text-[12px]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type PixelButtonVariants = VariantProps<typeof pixelButton>;

export function PixelButton({
  className,
  variant,
  size,
  onClick,
  ...props
}: React.ComponentProps<"button"> & PixelButtonVariants) {
  return (
    <button
      {...props}
      className={cn(pixelButton({ variant, size }), className)}
      onClick={(event) => {
        if (!props.disabled) playSfx("ui_click");
        onClick?.(event);
      }}
    />
  );
}

export function PixelButtonLink({
  className,
  variant,
  size,
  onClick,
  ...props
}: React.ComponentProps<typeof Link> & PixelButtonVariants) {
  return (
    <Link
      {...props}
      className={cn(pixelButton({ variant, size }), className)}
      onClick={(event) => {
        playSfx("ui_click");
        onClick?.(event);
      }}
    />
  );
}

export { pixelButton };
