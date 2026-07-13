import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";

import { currentActor } from "@/lib/auth/actor";
import { DomainError, httpStatusFor } from "@/lib/domain/errors";
import type { Actor } from "@/lib/domain/types";

/**
 * The HTTP boundary.
 *
 * Every route handler goes through here so that authentication, input validation and
 * error translation happen the same way everywhere. The alternative — each route
 * doing its own checks — is how one endpoint quietly ends up without an auth check.
 *
 * A handler receives an already-authenticated Actor and already-validated input. It
 * cannot forget to check either, because it never sees the raw request.
 */

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}

function toResponse(e: unknown): NextResponse<ApiError> {
  if (e instanceof DomainError) {
    return NextResponse.json(
      { error: { code: e.code, message: e.message, details: e.details } },
      { status: httpStatusFor[e.code] },
    );
  }

  if (e instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_INPUT",
          message: "request body failed validation",
          details: e.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  // Never leak a stack trace or a Postgres message to the caller — those disclose
  // schema, table names and constraint names. Log it; return nothing useful.
  console.error("[api] unhandled", e);
  return NextResponse.json(
    { error: { code: "INTERNAL", message: "internal error" } },
    { status: 500 },
  );
}

/** An authenticated endpoint with a JSON body. */
export function authed<TIn, TOut>(
  schema: ZodSchema<TIn>,
  handler: (actor: Actor, input: TIn) => Promise<TOut>,
) {
  return async (request: Request) => {
    try {
      const actor = await currentActor();
      const body = await request.json().catch(() => ({}));
      const input = schema.parse(body);
      return NextResponse.json(await handler(actor, input));
    } catch (e) {
      return toResponse(e);
    }
  };
}

/** An authenticated endpoint with no body (GET, or a POST whose id is in the path). */
export function authedQuery<TOut>(
  handler: (actor: Actor, request: Request) => Promise<TOut>,
) {
  return async (request: Request) => {
    try {
      const actor = await currentActor();
      return NextResponse.json(await handler(actor, request));
    } catch (e) {
      return toResponse(e);
    }
  };
}

/** An unauthenticated endpoint. Used by exactly one thing: public verification. */
export function publicEndpoint<TOut>(
  handler: (request: Request) => Promise<TOut>,
) {
  return async (request: Request) => {
    try {
      return NextResponse.json(await handler(request));
    } catch (e) {
      return toResponse(e);
    }
  };
}
