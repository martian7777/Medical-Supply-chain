import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client — anon key only, subject to RLS.
 *
 * Used for exactly one thing: enrolling and challenging a TOTP factor, which is a
 * conversation between the user's device and the auth server. Never for reading or
 * writing business data — RLS has no write policies at all, so it could not anyway.
 */
export function browserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
