/**
 * Domain types. Plain data — no ORM rows, no framework types, no `any`.
 *
 * Dates that carry a wall-clock meaning (licence expiry, medicine expiry) are
 * `YYYY-MM-DD` strings, not Date objects. A medicine expires on a calendar day in
 * a jurisdiction, not at an instant in UTC, and Date would silently drag timezone
 * semantics into a comparison that must not have any.
 */

export type IsoDate = string; // YYYY-MM-DD
export type IsoTimestamp = string; // ISO 8601 UTC

export type OrgType = "government" | "manufacturer" | "pharmacy";
export type MemberRole = "admin" | "operator" | "viewer";
export type LicenseStatus = "valid" | "revoked";
export type BatchStatus = "generating" | "active" | "recalled";
export type UnitStatus =
  | "active"
  | "in_transit"
  | "dispensed"
  | "expired"
  | "recalled";
export type ShipmentStatus =
  | "dispatched"
  | "accepted"
  | "rejected"
  | "partially_accepted";

/**
 * Who is asking. Assembled server-side from the session — never from the request
 * body. Every domain function takes one; none of them read ambient state.
 */
export interface Actor {
  userId: string;
  orgId: string;
  orgType: OrgType;
  role: MemberRole;
  mfaVerified: boolean;
}

export interface Organization {
  orgId: string;
  type: OrgType;
  name: string;
  status: "active" | "suspended";
}

export interface DrugType {
  drugTypeId: string;
  code: string;
  name: string;
  description?: string | null;
}

export interface License {
  licenseId: string;
  drugTypeId: string;
  manufacturerOrgId: string;
  status: LicenseStatus;
  expiresAt: IsoDate;
}

export interface Batch {
  batchId: string;
  drugTypeId: string;
  licenseId: string;
  manufacturerOrgId: string;
  lotNo: string;
  quantity: number;
  expirationDate: IsoDate;
  status: BatchStatus;
}

export interface MedicineUnit {
  unitId: string;
  batchId: string;
  currentOwnerOrgId: string;
  status: UnitStatus;
  dispensedByOrgId?: string | null;
  dispensedAt?: IsoTimestamp | null;
}

export interface Shipment {
  shipmentId: string;
  fromOrgId: string;
  toOrgId: string;
  status: ShipmentStatus;
}

/**
 * Hard ceiling on one serialization run. Mirrors the CHECK constraint on `batches`.
 *
 * Set by the deployment target, not by the database. The Phase-1 spike measured
 * 100,000 units generated in 4.3s (~23,000 units/sec) — Postgres is not the limit.
 * Vercel's HOBBY plan caps a function at 10s, and 4.3s of that is too close to the
 * edge to be safe once network and auth overhead are added.
 *
 * On Vercel Pro (60s limit) this can go back to 100_000. Change it here AND in the
 * batches CHECK constraint — the two must never disagree.
 */
export const MAX_BATCH_QUANTITY = 5_000;
