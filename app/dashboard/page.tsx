import { redirect } from "next/navigation";

import { currentActor } from "@/lib/auth/actor";
import { DomainError } from "@/lib/domain/errors";

/**
 * There is no such thing as "the dashboard" — there are three consoles, and which one
 * you get is a fact about your organization. Login redirects here; here decides.
 *
 * This page sits OUTSIDE the (app) layout group, so it does not inherit that layout's
 * handling of a refused actor and has to do its own. It is the first thing a new
 * administrator hits after signing in, and their organization is exactly the one most
 * likely to still be awaiting approval.
 */
export default async function Dashboard() {
  let actor;
  try {
    actor = await currentActor();
  } catch (e) {
    if (e instanceof DomainError) {
      redirect(e.code === "ORG_PENDING" ? "/pending" : "/login");
    }
    throw e;
  }

  redirect(`/${actor.orgType}`);
}
