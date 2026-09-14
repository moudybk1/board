import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm } from "@/components/account/auth-form";
import { BoardLogo } from "@/components/layout/board-logo";

export const metadata: Metadata = {
  title: "Register | BOARD",
  description: "Create a BOARD account to play and win tokens on Robinhood Chain.",
};

export default function AuthRegisterPage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-12 sm:px-6">
      <div className="text-center">
        <Link href="/" aria-label="BOARD home">
          <BoardLogo className="justify-center text-xl text-gold" />
        </Link>
        <p className="mt-4 text-sm text-muted">
          Create an account, then fund your balance to sit at a table.
        </p>
      </div>
      <AuthForm initialMode="register" />
      <p className="text-center text-xs text-faint">
        Already playing?{" "}
        <Link href="/auth/login" className="text-gold hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
