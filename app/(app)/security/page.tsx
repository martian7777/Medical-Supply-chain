import { Mfa } from "@/components/mfa";

export const dynamic = "force-dynamic";

export default function SecurityPage() {
  return (
    <>
      <div>
        <h1 style={{ fontSize: "var(--text-2xl)" }}>Two-factor authentication</h1>
        <p style={{ color: "var(--color-ink-3)", fontSize: "var(--text-sm)" }}>
          Required before you can issue or revoke a licence, or register an organization.
          A stolen password on a regulator&apos;s account is a national problem; a second
          factor is what stops one becoming the other.
        </p>
      </div>

      <Mfa />
    </>
  );
}
