"use client";

import { SignInButton } from "@/components/account/sign-in-button";
import { PixelButtonLink } from "@/components/ui/pixel-button";

export function HowToHeroActions() {
  return (
    <>
      <SignInButton variant="primary" size="md">
        Sign in
      </SignInButton>
      <PixelButtonLink href="/lobby" variant="secondary" size="md">
        Enter lobby
      </PixelButtonLink>
    </>
  );
}
