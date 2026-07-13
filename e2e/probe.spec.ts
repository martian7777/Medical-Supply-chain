import { expect, test } from "@playwright/test";

/** Temporary: where is the time going, and does each console actually render? */
test("time each console", async ({ page }) => {
  page.on("pageerror", (e) => console.log("  PAGE ERROR:", e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) console.log("  HTTP", r.status(), r.url());
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill("gov@example.test");
  await page.getByLabel("Password").fill("DevPassw0rd!");

  const t0 = Date.now();
  await Promise.all([
    page.waitForURL(/\/dashboard|\/government/, { timeout: 120_000 }),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);
  console.log(`  sign-in → ${page.url()} in ${Date.now() - t0}ms`);

  const t1 = Date.now();
  const res = await page.goto("/government", { waitUntil: "domcontentloaded" });
  console.log(`  /government: ${Date.now() - t1}ms  status=${res?.status()}`);
  console.log(`  heading: ${await page.locator("h1").first().textContent()}`);

  const t3 = Date.now();
  await page.goto("/government", { waitUntil: "domcontentloaded" });
  console.log(`  /government (warm): ${Date.now() - t3}ms`);

  const t2 = Date.now();
  await page.goto("/verify", { waitUntil: "domcontentloaded" });
  console.log(`  /verify: ${Date.now() - t2}ms`);

  expect(true).toBe(true);
});
