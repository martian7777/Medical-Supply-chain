import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Supabase clients. There are two, and confusing them is the single easiest way to
 * open a hole in this system.
 *
 *   userClient()    — carries the caller's session. Subject to RLS. Use it to find
 *                     out WHO is asking.
 *   serviceClient() — bypasses RLS entirely. Use it only after the domain layer has
 *                     authorised the action. It must never be imported into anything
 *                     that could reach the browser.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/** Session-bound, RLS-enforced. Safe by default. */
export async function userClient() {
  const cookieStore = await cookies();

  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: CookieToSet[]) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot set cookies. The middleware refreshes the
            // session instead, so this is safe to swallow — see middleware.ts.
          }
        },
      },
    },
  );
}

/**
 * RLS-bypassing. Every call site must have already passed through lib/domain.
 *
 * `persistSession: false` matters: this client has no user and must never write a
 * session into shared storage.
 */
export function serviceClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
