"use client";

import { SignInButton } from "@/components/account/sign-in-button";
import { PixelButtonLink } from "@/components/ui/pixel-button";
import { cn } from "@/lib/utils";

/**
 * Shared guide footer CTAs.
 */
export function GuideActionBar({
  className,
  hint = "Sign in with your wallet, then pick a room in the lobby.",
}: {
  className?: string;
  hint?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center",
        className,
      )}
    >
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <SignInButton
          size="lg"
          variant="primary"
          className="w-full justify-center sm:w-auto"
        >
          Sign in
        </SignInButton>
        <PixelButtonLink
          href="/lobby"
          size="lg"
          variant="secondary"
          className="w-full justify-center sm:w-auto"
        >
          Enter lobby
        </PixelButtonLink>
      </div>
      {hint ? (
        <p className="w-full text-xs leading-relaxed text-faint sm:ml-1 sm:max-w-sm">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
