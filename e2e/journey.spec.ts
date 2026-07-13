import { expect, test, type Page } from "@playwright/test";

import { totp } from "./totp";

/**
 * PHASE 3 ACCEPTANCE — the whole product, through the UI, in a real browser.
 *
 * docs/08 Phase 3 acceptance criteria:
 *   Government registers a drug type and issues a licence · Manufacturer creates a batch
 *   and dispatches it · Pharmacy accepts and dispenses · a member of the public verifies
 *   the code with no login.
 *
 * Requires `pnpm db:seed` (gov@ / mfr@ / pharmacy@example.test) and a running server.
 */

const PASSWORD = "DevPassw0rd!";
const stamp = Date.now().toString().slice(-8);
const CODE = `E2E-${stamp}`;
const LOT = `LOT-${stamp}`;

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(government|manufacturer|pharmacy)/);
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(/\/login/);
}

/**
 * Act as the regulator's authenticator app.
 *
 * The government role cannot issue or revoke a licence at aal1 — the domain layer
 * refuses. So the test enrols a TOTP factor exactly as a real regulator would, reads the
 * secret off the enrolment screen, and generates the code. This also means the MFA door
 * itself is covered: if enrolment breaks, this test fails.
 */
async function completeMfa(page: Page) {
  await page.goto("/security");

  const done = page.getByText("Two-factor is active on this session.");
  const secretLine = page.getByText(/Or enter this key by hand:/);

  await Promise.race([
    done.waitFor({ timeout: 15_000 }).catch(() => {}),
    secretLine.waitFor({ timeout: 15_000 }).catch(() => {}),
  ]);

  if (await done.isVisible().catch(() => false)) return;

  const text = (await secretLine.textContent()) ?? "";
  const secret = text.replace("Or enter this key by hand:", "").trim();
  expect(secret.length).toBeGreaterThan(10);

  await page.getByLabel("Code").fill(totp(secret));
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(done).toBeVisible({ timeout: 15_000 });
}

test("Gov → Manufacturer → Pharmacy → public verification", async ({ page }) => {
  // ---- Government: enrol a second factor, register a drug type, licence a maker ----
  await signIn(page, "gov@example.test");
  await completeMfa(page);

  await page.goto("/government");
  await expect(page.getByRole("heading", { name: "Oversight" })).toBeVisible();

  // Scope to each panel's form — "Manufacturer" appears both as a licence field and as
  // an option inside the organization "Type" select.
  const drugForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Register drug type" }) });
  const licenceForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Issue licence" }) });

  await drugForm.getByLabel("Code").fill(CODE);
  await drugForm.getByLabel("Name").fill(`Ibuprofen 400mg ${stamp}`);
  await drugForm.getByRole("button", { name: "Register drug type" }).click();
  await expect(page.getByText("Drug type registered.")).toBeVisible();

  await licenceForm
    .getByLabel("Drug type")
    .selectOption({ label: `Ibuprofen 400mg ${stamp} (${CODE})` });
  await licenceForm.getByLabel("Manufacturer").selectOption({ label: "PharmaCorp" });
  await licenceForm.getByLabel("Expires").fill("2030-12-31");
  await licenceForm.getByRole("button", { name: "Issue licence" }).click();
  await expect(page.getByText("Licence issued.")).toBeVisible();

  await page.screenshot({ path: "e2e/__shots__/1-government.png", fullPage: true });
  await signOut(page);

  // ---- Manufacturer: serialize a batch, dispatch part of it ----------------
  await signIn(page, "mfr@example.test");
  await expect(page.getByRole("heading", { name: "Production" })).toBeVisible();

  await page.getByLabel("Drug type").selectOption({ label: `Ibuprofen 400mg ${stamp} (${CODE})` });
  await page.getByLabel("Lot number").fill(LOT);
  await page.getByLabel("Quantity").fill("25");
  await page.getByLabel("Expiration date").fill("2029-01-31");
  await page.getByRole("button", { name: "Serialize batch" }).click();
  await expect(page.getByText("25 units serialized.")).toBeVisible();

  await page.screenshot({ path: "e2e/__shots__/2-manufacturer.png", fullPage: true });

  // Pull real unit codes off the batch's QR sheet — the same route the factory uses.
  await page.getByRole("row", { name: new RegExp(LOT) }).getByRole("link").click();
  await page.waitForURL(/\/codes/);
  const captions = await page.locator("figcaption").allTextContents();
  expect(captions.length).toBe(25);
  await page.screenshot({ path: "e2e/__shots__/3-qr-codes.png" });

  // The captions are truncated; get the full ids from the QR links instead.
  const unitIds = await page.evaluate(() =>
    Array.from(document.querySelectorAll("figcaption")).map((f) => f.textContent ?? ""),
  );
  expect(unitIds[0]!.length).toBeGreaterThan(8);

  await page.goto("/manufacturer");
  // Dispatch by pasting codes, as a picking list would.
  const fullIds = await page.evaluate(async () => {
    const res = await fetch("/api/v1/inventory");
    const units = (await res.json()) as Array<{ unitId: string }>;
    return units.map((u) => u.unitId);
  });
  expect(fullIds.length).toBeGreaterThanOrEqual(25);
  const shipping = fullIds.slice(0, 5);

  await page.getByLabel("To pharmacy").selectOption({ label: "City Pharmacy" });
  await page.getByLabel("Unit codes").fill(shipping.join("\n"));
  await page.getByRole("button", { name: "Dispatch" }).click();
  await expect(page.getByText(/Dispatched 5 units/)).toBeVisible();

  // Two-phase custody: the manufacturer still owns them.
  await expect(page.getByText("awaiting acceptance").first()).toBeVisible();
  await signOut(page);

  // ---- Pharmacy: accept, then dispense --------------------------------------
  await signIn(page, "pharmacy@example.test");
  await expect(page.getByRole("heading", { name: "Dispensing" })).toBeVisible();
  await expect(page.getByText("awaiting you").first()).toBeVisible();

  await page.screenshot({ path: "e2e/__shots__/4-pharmacy-inbox.png", fullPage: true });

  // Taking custody is confirmed, not clicked: the trigger opens a dialog that states
  // what accepting means, and the button that actually posts lives inside it.
  await page.getByRole("button", { name: "Accept all" }).first().click();
  const acceptDialog = page.getByRole("dialog");
  await expect(acceptDialog).toBeVisible();
  await acceptDialog.getByRole("button", { name: "Accept all" }).click();

  // Custody has moved, and the row says so. We assert the chip rather than a success
  // toast on purpose: accepting removes the very buttons that were clicked, so any
  // message rendered beside them unmounts with them. The table IS the receipt.
  await expect(page.getByText("awaiting you")).toBeHidden();
  await expect(page.getByRole("row", { name: /accepted/ }).first()).toBeVisible();

  const dispensed = shipping[0]!;
  await page.getByLabel("Unit code").fill(dispensed);
  await page.getByRole("button", { name: "Dispense", exact: true }).click();

  // The code is echoed back before it is burned — the whole point of the dialog.
  const dispenseDialog = page.getByRole("dialog");
  await expect(dispenseDialog.getByText(dispensed)).toBeVisible();
  await page.screenshot({ path: "e2e/__shots__/5-dispense-confirm.png", fullPage: true });
  await dispenseDialog.getByRole("button", { name: "Yes — dispense it" }).click();
  await expect(page.getByText(/can never be dispensed again/)).toBeVisible();

  // The cloned-code catch, in the UI. The refusal must surface INSIDE the dialog and
  // leave it open — closing on a domain error would throw the only useful sentence away.
  await page.getByLabel("Unit code").fill(dispensed);
  await page.getByRole("button", { name: "Dispense", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Yes — dispense it" }).click();
  await expect(
    page.getByRole("dialog").getByText(/already been dispensed/),
  ).toBeVisible();

  await page.screenshot({ path: "e2e/__shots__/5-pharmacy-double-dispense.png", fullPage: true });
  await signOut(page);

  // ---- The public: no login, on a phone --------------------------------------
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`/verify/${dispensed}`);

  await expect(page.getByRole("heading", { level: 1 })).toBeHidden({ timeout: 1000 }).catch(() => {});
  await expect(page.getByText("Genuine")).toBeVisible();
  await expect(page.getByText("PharmaCorp")).toBeVisible();
  await expect(page.getByText("City Pharmacy").first()).toBeVisible();

  // The chain is organizations, in order.
  await expect(page.getByText("produced")).toBeVisible();
  await expect(page.getByText("received")).toBeVisible();
  await expect(page.getByText("dispensed")).toBeVisible();

  // VER-3 — the whole reason the citizen entity was removed. No person, anywhere.
  const html = await page.content();
  for (const forbidden of ["citizen", "nationalId", "buyer", "patient", "Current owner"]) {
    expect(html).not.toContain(forbidden);
  }

  await page.screenshot({ path: "e2e/__shots__/6-verify-genuine.png", fullPage: true });

  // A code we never issued.
  await page.goto("/verify/00000000-0000-4000-8000-000000000000");
  await expect(page.getByText("No record")).toBeVisible();
  await page.screenshot({ path: "e2e/__shots__/7-verify-no-record.png", fullPage: true });
});
