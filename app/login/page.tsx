import { redirect } from "next/navigation";

import { userClient } from "@/lib/supabase/server";

/**
 * Sign-in. There is no sign-up: Government registers an organisation and invites its
 * first admin, who invites their staff. A self-serve registration form would let
 * anyone create an account with no organisation, which is a role we deliberately
 * have no seat for.
 */

async function signIn(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  const supabase = await userClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Never distinguish "no such user" from "wrong password" — that turns the login
    // form into an oracle for which email addresses are registered.
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Medical Supply Web Project
      </p>

      <form action={signIn} className="mt-8 flex flex-col gap-4">
        <input type="hidden" name="next" value={params.next ?? "/dashboard"} />

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            className="rounded-md border border-[var(--color-line)] px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Password</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="rounded-md border border-[var(--color-line)] px-3 py-2"
          />
        </label>

        {params.error ? (
          <p role="alert" className="text-sm text-[var(--color-danger)]">
            Those credentials were not recognised.
          </p>
        ) : null}

        <button
          type="submit"
          className="mt-2 rounded-md bg-[var(--color-ink)] px-4 py-2 font-medium text-[var(--color-canvas)]"
        >
          Sign in
        </button>
      </form>
    </main>
  );
}
