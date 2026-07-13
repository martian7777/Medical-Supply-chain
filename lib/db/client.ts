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
 *     Leaving it on produces intermittent, maddening "prepared statement already
 *     exists" errors under concurrency.
 *   - `max: 4` — small, but NOT 1.
 *
 * That last point cost an afternoon. `max: 1` looks right ("let Supavisor do the
 * pooling"), and it is fine for sequential queries. But a page that fires several
 * queries at once — the government console runs six in a Promise.all — makes postgres.js
 * PIPELINE them down the single connection, and Supavisor in transaction mode does not
 * handle pipelined extended-protocol queries. It does not error; it simply stalls. The
 * console took over 30 seconds to render and every individual query measured 100ms.
 *
 * A handful of connections lets concurrent queries take separate pooler sessions, which
 * is what the pooler is for. Keep the number small — this multiplies across serverless
 * invocations.
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
    max: 4,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__mswp_sql = sql;
}

export const db = drizzle(sql);
