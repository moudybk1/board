import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";
import { ProfileAvatarForm } from "@/components/account/profile-avatar-form";
import { LogoutButton } from "@/components/account/logout-button";

export const metadata: Metadata = {
  title: "Profile | BOARD",
  description: "Edit your display name and pick a pixel avatar.",
};

export default function AccountProfilePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg flex-1 space-y-8 px-4 py-10 sm:px-6 sm:py-14">
        <nav className="font-pixel text-[9px] uppercase tracking-wide text-faint">
          <Link href="/account" className="hover:text-gold">
            Account
          </Link>
          <span className="mx-2 text-edge-bright" aria-hidden>
            /
          </span>
          <span className="text-muted">Profile</span>
        </nav>

        <header>
          <h1 className="font-pixel text-lg text-parchment text-shadow-pixel">
            Profile
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Pick a pixel face for the lobby and room rails.
          </p>
        </header>

        <ProfileAvatarForm />
        <LogoutButton />
      </main>
    </>
  );
}
