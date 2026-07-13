# Setup — local development

## 1. Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Name it `mswp-dev`. Pick the region closest to you. Save the database password.
3. Wait ~2 minutes for it to provision.

## 2. Collect four values

| Where in the dashboard | Value | Goes into |
|---|---|---|
| **Project Settings → API** → Project URL | `https://xxxx.supabase.co` | `NEXT_PUBLIC_SUPABASE_URL` |
| **Project Settings → API** → `anon` `public` key | `eyJ...` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **Project Settings → API** → `service_role` `secret` key | `eyJ...` | `SUPABASE_SERVICE_ROLE_KEY` |
| **Project Settings → Database** → Connection string → **Transaction pooler** | `postgresql://...pooler.supabase.com:6543/postgres` | `DATABASE_URL` |

> **Use the transaction pooler URI (port 6543), not the direct one (5432).**
> Vercel runs each request in its own process. Direct connections exhaust Postgres'
> connection limit under load; the pooler is what makes serverless survivable. Spike (d)
> checks that you got this right.

> The `service_role` key bypasses every RLS policy in this repo. It belongs in
> `.env.local` and in Vercel's server-side env vars — nowhere else, ever. CI runs
> gitleaks specifically to catch it being committed.

## 3. Fill in `.env.local`

```bash
cp .env.example .env.local
# then paste the four values in
```

## 4. Apply the migrations

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>   # the xxxx in your project URL
npx supabase db push
```

This applies, in order:

| Migration | What it does |
|---|---|
| `20260713000100_init_schema.sql` | Tables, enums, indexes, constraints |
| `20260713000200_rls.sql` | RLS deny-by-default, org-scoped read policies, append-only grants |
| `20260713000300_batch_generation.sql` | `generate_batch_units()` — 100k units in one statement |

## 5. Run the integration spike

```bash
pnpm spike
```

This is the Phase-1 risk kill. It proves, against your real database:

- **(b)** a 100,000-unit batch serializes in one transaction, fast enough for a serverless function — so no job queue is needed;
- **(c)** organization B cannot read organization A's units with a real user JWT, cannot write to the database directly, and anonymous callers see nothing;
- **(d)** 50 concurrent queries survive the pooler without exhausting connections;
- **(e)** the audit log cannot be updated or deleted **even by the service-role key our own API holds**.

It cleans up its fixtures afterwards. If any check fails, do not start Phase 2 — the
plan's assumptions are wrong and we need to know which one.

## Everyday commands

```bash
pnpm dev         # http://localhost:3000
pnpm test        # domain rules (no database needed)
pnpm typecheck
pnpm db:push     # apply new migrations
```
