import { z } from "zod";

import { MAX_BATCH_QUANTITY } from "@/lib/domain/types";

/**
 * Wire schemas. These are the only place a raw request is trusted enough to become a
 * typed value — the domain layer assumes its inputs are already shaped correctly and
 * concerns itself with *rules*, not with whether a date is a string.
 */

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD")
  .refine((s) => !Number.isNaN(Date.parse(s)), "not a real date");

const uuid = z.string().uuid();

export const registerOrgSchema = z.object({
  type: z.enum(["manufacturer", "pharmacy"]), // government is not self-registerable
  name: z.string().trim().min(1).max(200),
  registrationNo: z.string().trim().min(1).max(100).optional(),
});

export const createDrugTypeSchema = z.object({
  code: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
});

export const issueLicenseSchema = z.object({
  drugTypeId: uuid,
  manufacturerOrgId: uuid,
  expiresAt: isoDate,
});

export const prolongLicenseSchema = z.object({
  newExpiresAt: isoDate,
});

export const createBatchSchema = z.object({
  drugTypeId: uuid,
  lotNo: z.string().trim().min(1).max(64),
  quantity: z.number().int().min(1).max(MAX_BATCH_QUANTITY),
  expirationDate: isoDate,
});

export const dispatchSchema = z.object({
  toOrgId: uuid,
  // A shipment is bounded by the batch cap: you cannot ship units that cannot exist.
  unitIds: z.array(uuid).min(1).max(MAX_BATCH_QUANTITY),
  note: z.string().trim().max(500).optional(),
});

export const resolveShipmentSchema = z.object({
  /** Omit to accept the whole shipment. Provide a subset for a partial acceptance. */
  acceptedUnitIds: z.array(uuid).optional(),
  note: z.string().trim().max(500).optional(),
});

export const verifyParamSchema = z.object({ unitId: uuid });
