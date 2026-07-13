import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  reporter: [["list"]],

  // In dev, the FIRST request to a route compiles it — /dashboard took ~7s cold, which
  // silently blew the default 5s expect timeout and looked like a broken login. It was
  // not. Give navigation room; CI runs a production build where this does not arise.
  expect: { timeout: 20_000 },

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    navigationTimeout: 30_000,
    trace: "retain-on-failure",
  },
});
