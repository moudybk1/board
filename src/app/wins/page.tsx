import { redirect } from "next/navigation";

/** Old wins page removed — history lives in the profile menu. */
export default function WinsRedirectPage() {
  redirect("/");
}
