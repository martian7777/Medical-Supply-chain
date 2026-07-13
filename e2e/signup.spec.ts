import { expect, test, type Page } from "@playwright/test";

import { totp } from "./totp";

/**
 * Signup, the approval wall, and the regulator's queue.
 *
 * The thing worth testing here is not that a form posts. It is that a self-registered
 * organisation can do NOTHING until a regulator approves it — that 'pending' is a real
 * wall and not a decoration on a page that still lets you in.
 *
 * The pending organisation comes from `pnpm fixture:pending` rather than from driving the
 * signup form, because Supabase throttles confirmation emails to a couple an hour on a
 * project with no custom SMTP, and a test that depends on that is a test that fails on
 * Tuesdays. The form's own logic is covered separately below, up to the point where it
 * hands off to Supabase.
 */

const PASSWORD = "DevPassw0rd!";

const PENDING_EMAIL = process.env.PENDING_EMAIL;
const PENDING_ORG = process.env.PENDING_ORG;

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(/\/login/);
}

/** Approving a claimant is privileged — the regulator must prove a second factor first. */
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
  await page
    .getByLabel("Code")
    .fill(totp(text.replace("Or enter this key by hand:", "").trim()));
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(done).toBeVisible({ timeout: 15_000 });
}

test("the signup form refuses to duplicate an organisation that already exists", async ({
  page,
}) => {
  // Registering an org that is already on MSWP would split its records in two — the
  // second copy would hold none of the first's licences. The service refuses BEFORE it
  // asks Supabase for an account, so this covers the real path without sending mail.
  await page.goto("/signup");
  await page.getByRole("radio", { name: "Pharmacy" }).check();
  await page.getByLabel("Registered name").fill("City Pharmacy"); // seeded, exists
  await page.getByLabel("Your email").fill(`dupe.${Date.now()}@mswp-qa.dev`);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /Register and create/ }).click();

  await expect(
    page.getByText(/already registered under that name/),
  ).toBeVisible();
  await page.screenshot({ path: "e2e/__shots__/6-signup-duplicate.png", fullPage: true });
});

test("a pending organisation is walled off, then approved, and only then can act", async ({
  page,
}) => {
  test.skip(
    !PENDING_EMAIL || !PENDING_ORG,
    "run `pnpm fixture:pending` and pass PENDING_EMAIL / PENDING_ORG",
  );

  // ---- The wall ------------------------------------------------------------------
  await signIn(page, PENDING_EMAIL!);
  await expect(page).toHaveURL(/\/pending/);
  await expect(page.getByRole("heading", { name: "Awaiting approval" })).toBeVisible();
  await expect(page.getByText(PENDING_ORG!)).toBeVisible();
  await page.screenshot({ path: "e2e/__shots__/7-pending.png", fullPage: true });

  // Typing the console's URL does not get you past it either.
  await page.goto("/pharmacy");
  await expect(page).toHaveURL(/\/pending/);
  await signOut(page);

  // ---- The regulator approves -----------------------------------------------------
  await signIn(page, "gov@example.test");
  await page.waitForURL(/\/government/);
  await completeMfa(page);
  await page.goto("/government");

  const row = page.getByRole("row", { name: new RegExp(PENDING_ORG!) }).first();
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Approve" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(new RegExp(PENDING_ORG!))).toBeVisible();
  await page.screenshot({ path: "e2e/__shots__/8-approve-confirm.png", fullPage: true });
  await dialog.getByRole("button", { name: "Approve", exact: true }).click();

  // The queue is the receipt: an approved claimant is no longer waiting in it.
  await expect(dialog).toBeHidden();
  await signOut(page);

  // ---- And only now can they act ---------------------------------------------------
  await signIn(page, PENDING_EMAIL!);
  await page.waitForURL(/\/pharmacy/);
  await expect(page.getByRole("heading", { name: "Dispensing" })).toBeVisible();
  await page.screenshot({ path: "e2e/__shots__/9-approved.png", fullPage: true });
});
