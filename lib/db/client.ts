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
  // `var` is the only declaration form TypeScript accepts for augmenting globalThis.
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
// Lazy: the connection is only opened on the first actual use, so importing
// this module without DATABASE_URL (e.g. in CI where integration tests skip
// themselves) does not throw.
function getSql(): postgres.Sql {
  if (globalThis.__mswp_sql) return globalThis.__mswp_sql;

  const instance = postgres(connectionString(), {
    max: 10,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  if (process.env.NODE_ENV !== "production") {
    globalThis.__mswp_sql = instance;
  }

  return instance;
}

/**
 * Tagged-template proxy: forwards every call to the lazily-created instance.
 * The target must be a function so the `apply` trap fires for sql`...` calls.
 *
 * NOTHING may touch this proxy at module scope. Reading any property of it calls
 * getSql(), which demands DATABASE_URL — so a single eager use at import time turns the
 * whole lazy scheme into an eager one. That is exactly what `export const db =
 * drizzle(sql)` used to do here: it ran on import, defeated the laziness, and took CI
 * down with "DATABASE_URL is not set" before tests/flow.test.ts could reach its
 * `describe.skipIf(!hasDb)`. Drizzle was never actually used — every service in
 * lib/services talks raw SQL through this proxy — so the ORM went rather than the guard.
 */
export const sql: postgres.Sql = new Proxy(function () {} as unknown as postgres.Sql, {
  get(_target, prop, receiver) {
    const real = getSql();
    const value = Reflect.get(real, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
  apply(_target, _thisArg, args) {
    return (getSql() as unknown as (...a: unknown[]) => unknown)(...args);
  },
});
