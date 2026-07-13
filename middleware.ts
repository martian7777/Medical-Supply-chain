import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Session refresh + route guard.
 *
 * Server Components cannot write cookies, so a rotated refresh token would be lost.
 * The middleware is the one place that can set them, so it runs on every request and
 * hands the fresh session down.
 *
 * `getUser()` — not `getSession()`. getSession reads the cookie and trusts it;
 * getUser revalidates against the auth server. On a guard, trusting an unverified
 * cookie is the whole vulnerability.
 */

/**
 * Anything a visitor with no account must be able to read. Forgetting to list a
 * marketing page here does not 404 it — it bounces the reader to /login, which reads
 * as a broken link and asks a stranger to sign in to learn what the product is.
 */
const PUBLIC_PATHS = [
  "/",
  "/verify",
  "/login",
  "/auth", // the callback that turns an emailed code into a session
  "/forgot-password",
  "/access",
  "/signup",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
];

// NOT public: /reset-password. Reaching it means /auth/callback already exchanged the
// emailed code for a session, so the guard below is exactly the check that page needs —
// no session, no password change.

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: CookieToSet[]) => {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and the QR/image files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
