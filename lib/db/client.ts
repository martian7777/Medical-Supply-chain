import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

/**
 * Direct Postgres connection. Used for the things the PostgREST API cannot do well:
 * the bulk batch insert, multi-statement transactions, and migrations.
 *
 * CONNECTION POOLING — the thing that kills Next.js on Vercel.
 *
 * Every serverless invocation is potentially a fresh process. If each one opens its
 * own Postgres connection, a modest traffic spike exhausts the database's connection
 * limit and everything starts failing with "too many clients". So:
 *
 *   - DATABASE_URL must point at Supavisor in TRANSACTION mode (port 6543), which
 *     multiplexes many short-lived clients onto few real backends.
 *   - Transaction mode does not support prepared statements, hence `prepare: false`.
 *     Leaving it on produces intermittent "prepared statement already exists" errors
 *     under concurrency.
 *
 * MAX MUST EXCEED THE PEAK CONCURRENT QUERIES OF ANY SINGLE REQUEST. This one cost an
 * afternoon, so it is worth being precise about.
 *
 * The government console fetches six datasets in a Promise.all. With `max` below six,
 * postgres.js QUEUES the excess — and a queued query, handed a recycled Supavisor
 * transaction-mode connection, sometimes never comes back. It does not error and it does
 * not time out; it simply hangs. The page took over 30 seconds to render while every
 * individual query, measured on its own, took 100ms. Sequentially: fine. Concurrently:
 * five of six returned and the sixth vanished. (`scripts/perf.ts` reproduces exactly
 * this — it is what found it.)
 *
 * With `max: 10` nothing is ever queued and the same six queries finish in ~690ms.
 *
 * Ten client connections per instance is safe here: Supavisor accepts a large number of
 * CLIENT connections (that is its job) and multiplexes them onto a much smaller pool of
 * real backends. What must not happen is a request firing more concurrent queries than
 * this number.
 */

declare global {
  // eslint-disable-next-line no-var
  var __mswp_sql: postgres.Sql | undefined;
}

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
    );
  }
  return url;
}

// Reused across invocations on a warm Lambda; recreated on a cold start.
export const sql: postgres.Sql =
  globalThis.__mswp_sql ??
  postgres(connectionString(), {
    max: 10,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__mswp_sql = sql;
}

export const db = drizzle(sql);
