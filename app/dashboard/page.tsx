import { redirect } from "next/navigation";

import { currentActor } from "@/lib/auth/actor";

/**
 * There is no such thing as "the dashboard" — there are three consoles, and which one
 * you get is a fact about your organization. Login redirects here; here decides.
 */
export default async function Dashboard() {
  const actor = await currentActor();
  redirect(`/${actor.orgType}`);
}
