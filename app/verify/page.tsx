import { ScanForm } from "@/components/scan-form";

export const metadata = {
  title: "Check a medicine",
  description:
    "Scan the code on a medicine box to check that it is genuine and see where it came from.",
};

export default function VerifyPage() {
  return (
    <>
      <div>
        <h1 style={{ fontSize: "var(--text-3xl)", lineHeight: 1.15 }}>
          Is this medicine real?
        </h1>
        <p
          style={{
            marginTop: "var(--space-sm)",
            fontSize: "var(--text-lg)",
            color: "var(--color-ink-2)",
          }}
        >
          Point your phone at the code on the box. You&apos;ll see who made it, where it
          has been, and whether anything looks wrong.
        </p>
      </div>

      <ScanForm />
    </>
  );
}
