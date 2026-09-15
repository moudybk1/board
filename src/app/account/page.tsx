import type { Metadata } from "next";

import { AccountBoard } from "@/components/account/account-board";
import { ProductShell } from "@/components/layout/product-shell";

export const metadata: Metadata = {
  title: "Account | BOARD",
  description:
    "Sign in with your Robinhood Chain wallet. Your profile is your connected address.",
};

export default function AccountPage() {
  return (
    <ProductShell accent="gold">
      <AccountBoard />
    </ProductShell>
  );
}
