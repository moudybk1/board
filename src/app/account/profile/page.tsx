import { redirect } from "next/navigation";

/**
 * Profile is the connected wallet — no separate email profile page.
 */
export default function AccountProfilePage() {
  redirect("/account");
}
