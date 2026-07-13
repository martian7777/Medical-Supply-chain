import { redirect } from "next/navigation";

/**
 * There is no sign-up. /signup exists only because people type it and follow it from
 * old links; it sends them to the page that explains why the form they expected does
 * not exist. A 404 here would read as a bug rather than as a decision.
 */
export default function SignupPage() {
  redirect("/access");
}
