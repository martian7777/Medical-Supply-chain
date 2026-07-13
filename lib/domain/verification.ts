import type {
  Batch,
  DrugType,
  IsoDate,
  IsoTimestamp,
  MedicineUnit,
  Organization,
} from "./types";

/**
 * Public verification. VER-1/2/3.
 *
 * This module answers exactly one question — "is the thing in my hand genuine?" —
 * for an unauthenticated stranger. Everything it returns is deliberate; anything not
 * listed in `PublicVerification` is not disclosed, and there is no code path from a
 * person's identity to this response because no person is ever recorded.
 */

export type Verdict = "authentic" | "not_found" | "flagged";

export interface PublicVerification {
  verdict: Verdict;
  unitId?: string;
  drug?: { name: string; code: string };
  manufacturer?: { name: string };
  expirationDate?: IsoDate;
  status?: MedicineUnit["status"];
  /** Custody chain by ORGANISATION only. Never a person. */
  chain?: Array<{ org: string; at: IsoTimestamp; event: string }>;
  dispensedBy?: { name: string; at: IsoTimestamp };
  warnings?: string[];
}

/**
 * Scan telemetry, aggregated. This is what catches the attack the spec is blind to:
 * a counterfeiter photocopying ONE genuine QR code onto ten thousand fake boxes.
 * Every one of those boxes verifies as authentic on a naive lookup — but they
 * produce a scan signature no legitimate unit ever produces.
 */
export interface ScanStats {
  totalScans: number;
  distinctRegions: number;
  scansAfterDispense: number;
}

/** Tuned to be quiet. A genuine unit gets scanned a handful of times, in one place. */
export const ANOMALY_THRESHOLDS = {
  totalScans: 25,
  distinctRegions: 5,
  scansAfterDispense: 3,
} as const;

export function detectAnomalies(stats: ScanStats): string[] {
  const warnings: string[] = [];

  if (stats.distinctRegions > ANOMALY_THRESHOLDS.distinctRegions) {
    warnings.push(
      `This code has been checked from ${stats.distinctRegions} different regions. A genuine pack is normally checked in one place.`,
    );
  }
  if (stats.totalScans > ANOMALY_THRESHOLDS.totalScans) {
    warnings.push(
      `This code has been checked ${stats.totalScans} times, which is unusually often.`,
    );
  }
  if (stats.scansAfterDispense > ANOMALY_THRESHOLDS.scansAfterDispense) {
    warnings.push(
      "This code is still being checked after the medicine was already sold.",
    );
  }
  return warnings;
}

export function notFound(): PublicVerification {
  return { verdict: "not_found" };
}

export function buildVerification(input: {
  unit: MedicineUnit;
  batch: Batch;
  drugType: DrugType;
  manufacturer: Organization;
  chain: Array<{ org: string; at: IsoTimestamp; event: string }>;
  dispensedBy?: Organization | null;
  stats: ScanStats;
}): PublicVerification {
  const warnings = detectAnomalies(input.stats);

  return {
    // A flagged unit is still a real unit — we say so, and we say why. Telling a
    // worried person "not found" here would be a lie, and telling them "authentic"
    // with no caveat would be worse.
    verdict: warnings.length > 0 ? "flagged" : "authentic",
    unitId: input.unit.unitId,
    drug: { name: input.drugType.name, code: input.drugType.code },
    manufacturer: { name: input.manufacturer.name },
    expirationDate: input.batch.expirationDate,
    status: input.unit.status,
    chain: input.chain,
    dispensedBy:
      input.dispensedBy && input.unit.dispensedAt
        ? { name: input.dispensedBy.name, at: input.unit.dispensedAt }
        : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
