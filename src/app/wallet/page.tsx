import { redirect } from "next/navigation";

/** Old wallet page removed — balance lives in the profile menu. */
export default function WalletRedirectPage() {
  redirect("/");
}
