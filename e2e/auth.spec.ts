import { expect, test } from "@playwright/test";

/**
 * SPIKE (a) — the authenticated thread, end to end in a real browser.
 *
 * This is the chain everything in Phase 2 and 3 sits on top of, and the part of the
 * Next.js + Supabase combination that most often turns out to be subtly broken:
 *
 *   sign in (server action, sets cookies)
 *     -> middleware refreshes and forwards the session
 *       -> a Server Component calls getUser() and it is actually populated
 *         -> memberships resolve that user to an org + role
 *           -> the domain layer receives a trustworthy Actor
 *
 * Run against a seeded database (`pnpm db:seed`) with the dev server up.
 */

const GOV = { email: "gov@example.test", password: "DevPassw0rd!" };

test("an unauthenticated visitor cannot reach a dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
});

test("signing in resolves a real organization and role in a Server Component", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(GOV.email);
  await page.getByLabel("Password").fill(GOV.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL("/dashboard");

  // The Actor was assembled server-side from the session + memberships table.
  // If the session did not survive the hop into the RSC, this page would have
  // redirected back to /login instead.
  await expect(page.getByRole("heading", { name: "Signed in" })).toBeVisible();
  await expect(page.getByText("government")).toBeVisible();
  await expect(page.getByText("admin")).toBeVisible();
});

test("bad credentials do not reveal whether the account exists", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("nobody@example.test");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  const wrongUser = await page.getByRole("alert").textContent();

  await page.goto("/login");
  await page.getByLabel("Email").fill(GOV.email);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  const wrongPassword = await page.getByRole("alert").textContent();

  // A real account with a bad password must look identical to no account at all.
  expect(wrongUser).toBe(wrongPassword);
});
