/**
 * Load .env for integration tests. Absent in CI (no secrets there), which is why the
 * integration suite skips itself rather than failing — see flow.test.ts.
 */
try {
  process.loadEnvFile(".env");
} catch {
  // no .env — integration tests will skip
}
