import { NextResponse } from "next/server";

import { DomainError, httpStatusFor } from "@/lib/domain/errors";
import { verifyUnit } from "@/lib/services/verification";

/**
 * VER-1/2/3 — public, unauthenticated verification by UUID.
 *
 * The only endpoint in the system with no session. Everything about it is defensive:
 * it is rate-limited, it never discloses a person, and a malformed or unknown code
 * gets the same calm "not found" as any other miss.
 */
export async function GET(request: Request) {
  const unitId = new URL(request.url).pathname.split("/").at(-1)!;

  // VER-2: a malformed code is not an error, it is simply not a code we issued.
  // Returning 400 here would let a caller distinguish "bad shape" from "no such unit",
  // and it would look like a crash to a frightened person holding a suspicious box.
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(unitId)
  ) {
    return NextResponse.json({ verdict: "not_found" }, { status: 200 });
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";

  try {
    const result = await verifyUnit(unitId, {
      ip,
      userAgent: request.headers.get("user-agent") ?? "unknown",
      // Vercel supplies a coarse region header. Country-level at most — never precise
      // location, which we neither want nor store.
      region: request.headers.get("x-vercel-ip-country"),
    });

    return NextResponse.json(result, {
      headers: {
        // A dispensed unit's answer is stable, so let the CDN carry the load and keep
        // the origin out of the hot path. Short TTL: a flagged unit must start warning
        // people quickly, not in an hour.
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (e) {
    if (e instanceof DomainError) {
      const status = e.code === "CONFLICT" ? 429 : httpStatusFor[e.code];
      return NextResponse.json(
        { error: { code: e.code, message: e.message } },
        {
          status,
          headers:
            status === 429 ? { "Retry-After": "60", "Cache-Control": "no-store" } : {},
        },
      );
    }
    console.error("[verify] unhandled", e);
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "internal error" } },
      { status: 500 },
    );
  }
}
