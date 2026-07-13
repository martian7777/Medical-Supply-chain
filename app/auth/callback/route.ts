import { NextResponse, type NextRequest } from "next/server";

import { userClient } from "@/lib/supabase/server";

/**
 * Where every emailed link lands: an invitation, and a password reset.
 *
 * Supabase mails a one-time code; this exchanges it for a real session and writes the
 * cookies. It has to be a route handler rather than a page because Server Components
 * cannot set cookies, and a session that cannot be persisted is not a session.
 *
 * `next` is clamped to a path on this origin. An open redirect on the one URL that
 * arrives carrying a fresh credential is how a phishing mail turns a legitimate
 * invitation into a session handed to someone else's host.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const raw = url.searchParams.get("next") ?? "/dashboard";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=1", url.origin));
  }

  const supabase = await userClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Expired, or already used. Both mean "ask for a fresh link", not "you are banned".
    return NextResponse.redirect(new URL("/forgot-password?expired=1", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
