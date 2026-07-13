/**
 * Domain errors.
 *
 * The domain layer never knows about HTTP. It raises these; the route handlers in
 * app/api/v1 translate them (see `httpStatusFor`). Keeping the mapping here rather
 * than in each handler is what stops one endpoint returning 403 and another 404 for
 * the same underlying refusal.
 */

export type DomainErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  // Signed in, correctly attached to an organisation — but that organisation has
  // registered itself and no regulator has approved it yet. Distinct from FORBIDDEN
  // because the answer is "wait", not "you may not", and the UI must not bounce these
  // people back to a login form they have already passed.
  | "ORG_PENDING"
  | "NOT_FOUND"
  | "INVALID_INPUT"
  | "LICENSE_INVALID"
  | "UNIT_NOT_TRANSFERABLE"
  | "CONFLICT";

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: DomainErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.details = details;
  }
}

export const httpStatusFor: Record<DomainErrorCode, number> = {
  UNAUTHENTICATED: 401,
  // Deliberately 404, not 403: telling an attacker "this exists but isn't yours"
  // confirms the resource exists. Refusals about other orgs' data look like absence.
  FORBIDDEN: 404,
  // A real 403: the caller is who they say they are, and is simply not cleared yet.
  ORG_PENDING: 403,
  NOT_FOUND: 404,
  INVALID_INPUT: 400,
  LICENSE_INVALID: 422,
  UNIT_NOT_TRANSFERABLE: 422,
  CONFLICT: 409,
};

export const forbidden = (msg: string, details?: Record<string, unknown>) =>
  new DomainError("FORBIDDEN", msg, details);

export const notFound = (msg: string, details?: Record<string, unknown>) =>
  new DomainError("NOT_FOUND", msg, details);

export const invalid = (msg: string, details?: Record<string, unknown>) =>
  new DomainError("INVALID_INPUT", msg, details);
