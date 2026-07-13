import { cache } from "react";

import { DomainError } from "@/lib/domain/errors";
import type { Actor } from "@/lib/domain/types";
import { serviceClient, userClient } from "@/lib/supabase/server";

/**
 * Assemble the Actor for the current request.
 *
 * This is the ONLY bridge between "there is an HTTP session" and "the domain layer
 * knows who is asking". Every org id and role the domain trusts originates here, from
 * the verified session and the memberships table — never from the request body. If a
 * caller could name their own orgId, every ownership check in lib/domain would be
 * decorative.
 *
 * WRAPPED IN cache(). A layout and its page render concurrently, and both need the
 * actor. Without deduplication that is two Supabase session lookups per request racing
 * each other over the same auth cookie — which does not merely double the latency, it
 * hangs: /government rendered in 27 SECONDS because the page's lookup sat waiting behind
 * the layout's. cache() collapses them into one call per request, and the page dropped
 * to well under a second.
 */
export const currentActor = cache(async function currentActor(): Promise<Actor> {
  const supabase = await userClient();

  // getUser(), not getSession(): revalidated against the auth server, not just decoded.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new DomainError("UNAUTHENTICATED", "not signed in");
  }

  // Read membership with the service client: `memberships` is RLS-protected, and this
  // lookup is what *establishes* the identity the policies would key off.
  const svc = serviceClient();
  const { data, error } = await svc
    .from("memberships")
    .select("org_id, role, organizations!inner(type, status)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new DomainError("UNAUTHENTICATED", `membership lookup failed: ${error.message}`);
  }
  if (!data) {
    // Authenticated but not attached to any organisation. Government registers orgs
    // and invites their first admin; there is no self-signup path that lands here.
    throw new DomainError("FORBIDDEN", "user belongs to no organization");
  }

  const org = data.organizations as unknown as {
    type: Actor["orgType"];
    status: "active" | "suspended";
  };

  if (org.status !== "active") {
    throw new DomainError("FORBIDDEN", "your organization is suspended");
  }

  // Supabase reports aal2 once a TOTP factor has been verified in this session.
  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  return {
    userId: user.id,
    orgId: data.org_id as string,
    orgType: org.type,
    role: data.role as Actor["role"],
    mfaVerified: aal?.currentLevel === "aal2",
  };
});
