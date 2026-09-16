"use client";

import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";

import { playSfx } from "@/lib/audio/audio-manager";
import { cn } from "@/lib/utils";

const pixelButton = cva(
  // Jelly key: the button sits on a thick chocolate lip and squishes into it.
  [
    "pixel-corners inline-flex select-none items-center justify-center gap-2 border-[3px]",
    "font-pixel font-bold uppercase tracking-wide",
    "transition-[transform,box-shadow,background-color] duration-100",
    "active:translate-y-[6px] active:shadow-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-deep",
    "disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none disabled:active:translate-y-0",
  ],
  {
    variants: {
      variant: {
        primary:
          "border-void bg-gold text-void shadow-pixel hover:bg-[#ffe566]",
        secondary:
          "border-void bg-surface-raised text-parchment shadow-pixel hover:bg-surface-hover",
        outline:
          "border-void bg-cream text-parchment shadow-pixel-sm hover:bg-surface-hover",
        monopoly:
          "border-void bg-monopoly text-cream shadow-pixel hover:brightness-110",
        ludo: "border-void bg-ludo text-cream shadow-pixel hover:brightness-110",
        ghost:
          "border-transparent bg-transparent text-muted shadow-none hover:text-parchment active:translate-y-0",
      },
      size: {
        sm: "px-3.5 py-2 text-xs",
        md: "px-5 py-2.5 text-sm",
        lg: "px-7 py-3.5 text-base",
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
