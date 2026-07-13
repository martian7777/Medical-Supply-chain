"use server";

import { revalidatePath } from "next/cache";

import { currentActor } from "@/lib/auth/actor";
import { DomainError } from "@/lib/domain/errors";
import { createBatch } from "@/lib/services/batches";
import { dispenseUnit } from "@/lib/services/dispense";
import { createDrugType } from "@/lib/services/drug-types";
import {
  issueLicense,
  prolongLicense,
  registerOrganization,
  revokeLicense,
} from "@/lib/services/licenses";
import { dispatchShipment, resolveShipment } from "@/lib/services/shipments";

/**
 * Server actions — the dashboards' write path.
 *
 * They go straight to the service layer rather than HTTP-fetching our own /api/v1. The
 * REST API exists for external integrations (PRD item 7); having the UI loop back
 * through it would add a network hop and a second auth pass to reach code already
 * running on this server.
 *
 * Same rules apply either way: the actor is resolved from the session, and the domain
 * layer decides. An action cannot do anything the API would refuse.
 */

export type ActionState = { error?: string; ok?: string } | null;

/**
 * Domain refusals are the interesting output of this system, not an exception path —
 * "you hold no valid licence for this drug type" is a sentence the operator needs to
 * read. So we surface the message and swallow nothing.
 */
async function run(fn: () => Promise<unknown>, ok: string): Promise<ActionState> {
  try {
    await fn();
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    console.error("[action]", e);
    return { error: "Something went wrong. Nothing was changed." };
  }
  revalidatePath("/", "layout");
  return { ok };
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function createDrugTypeAction(_: ActionState, fd: FormData) {
  const actor = await currentActor();
  return run(
    () =>
      createDrugType(actor, {
        code: str(fd, "code"),
        name: str(fd, "name"),
        description: str(fd, "description") || undefined,
      }),
    "Drug type registered.",
  );
}

export async function registerOrgAction(_: ActionState, fd: FormData) {
  const actor = await currentActor();
  return run(
    () =>
      registerOrganization(actor, {
        type: str(fd, "type") as "manufacturer" | "pharmacy",
        name: str(fd, "name"),
        registrationNo: str(fd, "registrationNo") || undefined,
      }),
    "Organization registered.",
  );
}

export async function issueLicenseAction(_: ActionState, fd: FormData) {
  const actor = await currentActor();
  return run(
    () =>
      issueLicense(actor, {
        drugTypeId: str(fd, "drugTypeId"),
        manufacturerOrgId: str(fd, "manufacturerOrgId"),
        expiresAt: str(fd, "expiresAt"),
      }),
    "Licence issued.",
  );
}

export async function revokeLicenseAction(_: ActionState, fd: FormData) {
  const actor = await currentActor();
  return run(
    () => revokeLicense(actor, str(fd, "licenseId")),
    "Licence revoked. No new units can be produced under it.",
  );
}

export async function prolongLicenseAction(_: ActionState, fd: FormData) {
  const actor = await currentActor();
  return run(
    () => prolongLicense(actor, str(fd, "licenseId"), str(fd, "newExpiresAt")),
    "Licence extended.",
  );
}

export async function createBatchAction(_: ActionState, fd: FormData) {
  const actor = await currentActor();
  const quantity = Number(fd.get("quantity"));
  return run(
    () =>
      createBatch(actor, {
        drugTypeId: str(fd, "drugTypeId"),
        lotNo: str(fd, "lotNo"),
        quantity,
        expirationDate: str(fd, "expirationDate"),
      }),
    `Batch created. ${quantity.toLocaleString()} units serialized.`,
  );
}

export async function dispatchAction(_: ActionState, fd: FormData) {
  const actor = await currentActor();
  // The textarea takes pasted unit ids — one per line, or comma-separated. A dispatch
  // is assembled from a picking list or a barcode gun, not typed by hand.
  const unitIds = str(fd, "unitIds")
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return run(
    () =>
      dispatchShipment(actor, {
        toOrgId: str(fd, "toOrgId"),
        unitIds,
        note: str(fd, "note") || undefined,
      }),
    `Dispatched ${unitIds.length} unit${unitIds.length === 1 ? "" : "s"}. Awaiting the pharmacy's acceptance.`,
  );
}

export async function acceptShipmentAction(_: ActionState, fd: FormData) {
  const actor = await currentActor();
  return run(
    () => resolveShipment(actor, str(fd, "shipmentId"), {}),
    "Shipment accepted. The units are now yours.",
  );
}

export async function rejectShipmentAction(_: ActionState, fd: FormData) {
  const actor = await currentActor();
  return run(
    () =>
      resolveShipment(actor, str(fd, "shipmentId"), {
        acceptedUnitIds: [], // accept nothing
        note: str(fd, "note") || undefined,
      }),
    "Shipment rejected. The units returned to the sender.",
  );
}

export async function dispenseAction(_: ActionState, fd: FormData) {
  const actor = await currentActor();
  return run(
    () => dispenseUnit(actor, str(fd, "unitId")),
    "Dispensed. This code can never be dispensed again.",
  );
}
