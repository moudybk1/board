import { redirect } from "next/navigation";

/**
 * Wallet connect lives on /account (wallet-only login).
 */
export default function AccountWalletPage() {
  redirect("/account");
}
