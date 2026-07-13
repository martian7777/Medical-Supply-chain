import { describe, expect, it } from "vitest";

import { validateCreateBatch } from "./batches";
import { validateDispense } from "./dispense";
import { DomainError } from "./errors";
import {
  isLicenseUsable,
  validateIssueLicense,
  validateProlongLicense,
  validateRevokeLicense,
} from "./licenses";
import {
  resolutionStatus,
  validateDispatch,
  validateResolveShipment,
} from "./shipments";
import type {
  Actor,
  Batch,
  License,
  MedicineUnit,
  Organization,
} from "./types";
import { buildVerification, detectAnomalies } from "./verification";

const TODAY = "2026-07-13";

const gov: Actor = {
  userId: "u-gov",
  orgId: "org-gov",
  orgType: "government",
  role: "admin",
  mfaVerified: true,
};
const mfr: Actor = {
  userId: "u-mfr",
  orgId: "org-mfr",
  orgType: "manufacturer",
  role: "operator",
  mfaVerified: false,
};
const pharm: Actor = {
  userId: "u-ph",
  orgId: "org-ph",
  orgType: "pharmacy",
  role: "operator",
  mfaVerified: false,
};

const license: License = {
  licenseId: "lic-1",
  drugTypeId: "drug-1",
  manufacturerOrgId: "org-mfr",
  status: "valid",
  expiresAt: "2026-12-31",
};

const batch: Batch = {
  batchId: "b-1",
  drugTypeId: "drug-1",
  licenseId: "lic-1",
  manufacturerOrgId: "org-mfr",
  lotNo: "LOT-1",
  quantity: 1000,
  expirationDate: "2027-01-31",
  status: "active",
};

const unit: MedicineUnit = {
  unitId: "550e8400-e29b-41d4-a716-446655440000",
  batchId: "b-1",
  currentOwnerOrgId: "org-ph",
  status: "active",
};

const pharmacyOrg: Organization = {
  orgId: "org-ph",
  type: "pharmacy",
  name: "City Pharmacy",
  status: "active",
};

/** Assert the call failed for the reason we expect, not merely that it failed. */
const expectDomainError = (fn: () => void, code: DomainError["code"]) => {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(DomainError);
    expect((e as DomainError).code).toBe(code);
    return;
  }
  throw new Error(`expected a ${code} DomainError, but nothing was thrown`);
};

// ---------------------------------------------------------------------------

describe("licence validity (docs/05 §3 expiration logic)", () => {
  it("a valid, unexpired licence is usable", () => {
    expect(isLicenseUsable(license, TODAY)).toBe(true);
  });

  it("revocation disqualifies regardless of expiry date", () => {
    expect(
      isLicenseUsable({ ...license, status: "revoked" }, TODAY),
    ).toBe(false);
  });

  it("an expired licence is unusable even though its status is still 'valid'", () => {
    expect(
      isLicenseUsable({ ...license, expiresAt: "2026-07-12" }, TODAY),
    ).toBe(false);
  });

  it("a licence expiring today is still usable today", () => {
    expect(isLicenseUsable({ ...license, expiresAt: TODAY }, TODAY)).toBe(true);
  });
});

describe("IssueLicense (GOV-3)", () => {
  it("government may issue with a future expiry", () => {
    expect(() =>
      validateIssueLicense(
        gov,
        {
          drugTypeId: "drug-1",
          manufacturerOrgId: "org-mfr",
          expiresAt: "2027-01-01",
        },
        TODAY,
      ),
    ).not.toThrow();
  });

  it("a manufacturer may not issue itself a licence", () => {
    expectDomainError(
      () =>
        validateIssueLicense(
          mfr,
          {
            drugTypeId: "drug-1",
            manufacturerOrgId: "org-mfr",
            expiresAt: "2027-01-01",
          },
          TODAY,
        ),
      "FORBIDDEN",
    );
  });

  it("rejects an expiry in the past", () => {
    expectDomainError(
      () =>
        validateIssueLicense(
          gov,
          {
            drugTypeId: "drug-1",
            manufacturerOrgId: "org-mfr",
            expiresAt: "2020-01-01",
          },
          TODAY,
        ),
      "INVALID_INPUT",
    );
  });

  it("refuses a government user who has not completed MFA", () => {
    expectDomainError(
      () =>
        validateIssueLicense(
          { ...gov, mfaVerified: false },
          {
            drugTypeId: "drug-1",
            manufacturerOrgId: "org-mfr",
            expiresAt: "2027-01-01",
          },
          TODAY,
        ),
      "FORBIDDEN",
    );
  });
});

describe("RevokeLicense / ProlongLicense (GOV-4, GOV-5)", () => {
  it("government may revoke a valid licence", () => {
    expect(() => validateRevokeLicense(gov, license)).not.toThrow();
  });

  it("revoking twice is a conflict", () => {
    expectDomainError(
      () => validateRevokeLicense(gov, { ...license, status: "revoked" }),
      "CONFLICT",
    );
  });

  it("government may push the expiry out", () => {
    expect(() =>
      validateProlongLicense(gov, license, "2027-06-30"),
    ).not.toThrow();
  });

  it("prolonging cannot silently resurrect a revoked licence", () => {
    expectDomainError(
      () =>
        validateProlongLicense(
          gov,
          { ...license, status: "revoked" },
          "2027-06-30",
        ),
      "LICENSE_INVALID",
    );
  });

  it("the new expiry must actually be later", () => {
    expectDomainError(
      () => validateProlongLicense(gov, license, "2026-01-01"),
      "INVALID_INPUT",
    );
  });
});

describe("CreateBatch (MFR-1, MFR-5) — the core anti-counterfeit rule", () => {
  const input = {
    drugTypeId: "drug-1",
    lotNo: "LOT-9",
    quantity: 50_000,
    expirationDate: "2027-06-30",
  };

  it("a licensed manufacturer may produce", () => {
    expect(() =>
      validateCreateBatch(mfr, input, license, TODAY),
    ).not.toThrow();
  });

  it("MFR-5: refuses production under a REVOKED licence", () => {
    expectDomainError(
      () =>
        validateCreateBatch(
          mfr,
          input,
          { ...license, status: "revoked" },
          TODAY,
        ),
      "LICENSE_INVALID",
    );
  });

  it("MFR-5: refuses production under an EXPIRED licence", () => {
    expectDomainError(
      () =>
        validateCreateBatch(
          mfr,
          input,
          { ...license, expiresAt: "2026-07-12" },
          TODAY,
        ),
      "LICENSE_INVALID",
    );
  });

  it("refuses production of a drug the licence does not cover", () => {
    expectDomainError(
      () =>
        validateCreateBatch(
          mfr,
          { ...input, drugTypeId: "drug-OTHER" },
          license,
          TODAY,
        ),
      "INVALID_INPUT",
    );
  });

  it("refuses to produce under someone else's licence", () => {
    expectDomainError(
      () =>
        validateCreateBatch(
          { ...mfr, orgId: "org-other-mfr" },
          input,
          license,
          TODAY,
        ),
      "FORBIDDEN",
    );
  });

  it("a pharmacy cannot manufacture", () => {
    expectDomainError(
      () => validateCreateBatch(pharm, input, license, TODAY),
      "FORBIDDEN",
    );
  });

  it("a viewer cannot manufacture", () => {
    expectDomainError(
      () => validateCreateBatch({ ...mfr, role: "viewer" }, input, license, TODAY),
      "FORBIDDEN",
    );
  });

  it("caps a batch at 100,000 units", () => {
    expectDomainError(
      () =>
        validateCreateBatch(mfr, { ...input, quantity: 100_001 }, license, TODAY),
      "INVALID_INPUT",
    );
  });

  it("refuses to produce medicine that is already expired", () => {
    expectDomainError(
      () =>
        validateCreateBatch(
          mfr,
          { ...input, expirationDate: "2026-01-01" },
          license,
          TODAY,
        ),
      "INVALID_INPUT",
    );
  });
});

describe("Shipments — two-phase custody", () => {
  const mfrUnit: MedicineUnit = {
    ...unit,
    currentOwnerOrgId: "org-mfr",
  };

  it("a manufacturer may dispatch units it owns to an active pharmacy", () => {
    expect(() =>
      validateDispatch(
        mfr,
        { toOrgId: "org-ph", unitIds: [mfrUnit.unitId] },
        [mfrUnit],
        pharmacyOrg,
      ),
    ).not.toThrow();
  });

  it("SYS-2: refuses to dispatch a unit the sender does not own", () => {
    expectDomainError(
      () =>
        validateDispatch(
          mfr,
          { toOrgId: "org-ph", unitIds: [unit.unitId] },
          [unit], // owned by org-ph, not org-mfr
          pharmacyOrg,
        ),
      "FORBIDDEN",
    );
  });

  it("refuses to dispatch a unit that is already in transit", () => {
    expectDomainError(
      () =>
        validateDispatch(
          mfr,
          { toOrgId: "org-ph", unitIds: [mfrUnit.unitId] },
          [{ ...mfrUnit, status: "in_transit" }],
          pharmacyOrg,
        ),
      "UNIT_NOT_TRANSFERABLE",
    );
  });

  it("refuses to dispatch to a suspended pharmacy", () => {
    expectDomainError(
      () =>
        validateDispatch(
          mfr,
          { toOrgId: "org-ph", unitIds: [mfrUnit.unitId] },
          [mfrUnit],
          { ...pharmacyOrg, status: "suspended" },
        ),
      "INVALID_INPUT",
    );
  });

  it("reports which requested units do not exist", () => {
    expectDomainError(
      () =>
        validateDispatch(
          mfr,
          { toOrgId: "org-ph", unitIds: [mfrUnit.unitId, "ghost"] },
          [mfrUnit],
          pharmacyOrg,
        ),
      "NOT_FOUND",
    );
  });

  it("only the addressee may accept — this is the whole point of two-phase", () => {
    const shipment = {
      shipmentId: "s-1",
      fromOrgId: "org-mfr",
      toOrgId: "org-ph",
      status: "dispatched" as const,
    };
    expect(() => validateResolveShipment(pharm, shipment)).not.toThrow();

    // The SENDER cannot accept on the receiver's behalf. If they could, we would be
    // right back to the one-sided model where inventory can be pushed onto a pharmacy.
    expectDomainError(
      () => validateResolveShipment(mfr, shipment),
      "FORBIDDEN",
    );
  });

  it("a shipment cannot be resolved twice", () => {
    expectDomainError(
      () =>
        validateResolveShipment(pharm, {
          shipmentId: "s-1",
          fromOrgId: "org-mfr",
          toOrgId: "org-ph",
          status: "accepted",
        }),
      "CONFLICT",
    );
  });

  it("classifies full, partial and zero acceptance", () => {
    expect(resolutionStatus(10, 10)).toBe("accepted");
    expect(resolutionStatus(4, 10)).toBe("partially_accepted");
    expect(resolutionStatus(0, 10)).toBe("rejected");
  });
});

describe("Dispense — terminal, and never records a person", () => {
  it("a pharmacy may dispense an active unit it holds", () => {
    expect(() => validateDispense(pharm, unit, batch, TODAY)).not.toThrow();
  });

  it("refuses to dispense the same unit twice (the cloned-code catch)", () => {
    expectDomainError(
      () =>
        validateDispense(
          pharm,
          { ...unit, status: "dispensed", dispensedAt: "2026-07-01T10:00:00Z" },
          batch,
          TODAY,
        ),
      "UNIT_NOT_TRANSFERABLE",
    );
  });

  it("refuses to dispense expired medicine", () => {
    expectDomainError(
      () =>
        validateDispense(pharm, unit, { ...batch, expirationDate: "2026-01-01" }, TODAY),
      "UNIT_NOT_TRANSFERABLE",
    );
  });

  it("refuses to dispense a recalled unit", () => {
    expectDomainError(
      () => validateDispense(pharm, { ...unit, status: "recalled" }, batch, TODAY),
      "UNIT_NOT_TRANSFERABLE",
    );
  });

  it("SYS-2: a pharmacy cannot dispense a unit it does not hold", () => {
    expectDomainError(
      () =>
        validateDispense(
          pharm,
          { ...unit, currentOwnerOrgId: "org-other-pharmacy" },
          batch,
          TODAY,
        ),
      "FORBIDDEN",
    );
  });

  it("a manufacturer cannot dispense to the public", () => {
    expectDomainError(
      () =>
        validateDispense(
          mfr,
          { ...unit, currentOwnerOrgId: "org-mfr" },
          batch,
          TODAY,
        ),
      "FORBIDDEN",
    );
  });
});

describe("Public verification (VER-1/2/3)", () => {
  const manufacturerOrg: Organization = {
    orgId: "org-mfr",
    type: "manufacturer",
    name: "PharmaCorp",
    status: "active",
  };
  const drugType = {
    drugTypeId: "drug-1",
    code: "PARA-500",
    name: "Paracetamol 500mg",
  };
  const quietStats = {
    totalScans: 2,
    distinctRegions: 1,
    scansAfterDispense: 0,
  };

  const build = (stats = quietStats) =>
    buildVerification({
      unit: {
        ...unit,
        status: "dispensed",
        dispensedByOrgId: "org-ph",
        dispensedAt: "2026-08-01T09:15:00Z",
      },
      batch,
      drugType,
      manufacturer: manufacturerOrg,
      chain: [
        { org: "PharmaCorp", at: "2026-01-15T00:00:00Z", event: "produced" },
        { org: "City Pharmacy", at: "2026-02-20T00:00:00Z", event: "received" },
      ],
      dispensedBy: pharmacyOrg,
      stats,
    });

  it("a normal unit verifies as authentic", () => {
    const result = build();
    expect(result.verdict).toBe("authentic");
    expect(result.drug?.name).toBe("Paracetamol 500mg");
    expect(result.manufacturer?.name).toBe("PharmaCorp");
    expect(result.warnings).toBeUndefined();
  });

  /**
   * The regression test for the privacy defect that started all of this. If someone
   * later adds a `citizen` or `owner` field to the public payload, this fails.
   */
  it("NEVER discloses a person, only organisations", () => {
    const result = build();
    const serialized = JSON.stringify(result);

    for (const key of [
      "citizen",
      "citizenId",
      "nationalId",
      "buyer",
      "patient",
      "currentOwner",
      "owner",
      "email",
    ]) {
      expect(serialized).not.toContain(key);
    }

    // What it DOES say about the sale is the shop and the moment — nothing more.
    expect(result.dispensedBy).toEqual({
      name: "City Pharmacy",
      at: "2026-08-01T09:15:00Z",
    });
  });

  it("flags a code being checked from many regions (a cloned QR)", () => {
    const result = build({
      totalScans: 412,
      distinctRegions: 30,
      scansAfterDispense: 300,
    });
    expect(result.verdict).toBe("flagged");
    expect(result.warnings?.length).toBeGreaterThan(0);
  });

  it("stays quiet for ordinary scan volumes", () => {
    expect(detectAnomalies(quietStats)).toEqual([]);
  });

  it("flags scans that continue after the medicine was sold", () => {
    const warnings = detectAnomalies({
      totalScans: 10,
      distinctRegions: 1,
      scansAfterDispense: 9,
    });
    expect(warnings.some((w) => w.includes("already sold"))).toBe(true);
  });
});
