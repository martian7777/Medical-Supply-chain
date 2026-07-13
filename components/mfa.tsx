"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { browserClient } from "@/lib/supabase/client";

type Phase = "loading" | "enrol" | "challenge" | "done";

/**
 * Two-factor enrolment and challenge.
 *
 * Government users and org admins can revoke licences, onboard organizations, and remove
 * people. A stolen password on one of those accounts is a national-scale problem, so the
 * domain layer refuses those actions at anything below aal2.
 *
 * This is the door that requirement implies. Without it the policy is not "secure" — it
 * is just "broken", which is how the government console shipped in the first pass.
 */
export function Mfa() {
  const router = useRouter();
  const supabase = browserClient();

  const [phase, setPhase] = useState<Phase>("loading");
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: aal } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === "aal2") {
        setPhase("done");
        return;
      }

      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verified = factors?.totp?.find((f) => f.status === "verified");

      if (verified) {
        // A factor exists; this session just hasn't proved it yet.
        setFactorId(verified.id);
        setPhase("challenge");
        return;
      }

      // No factor at all — enrol one.
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `MSWP ${Date.now()}`,
      });
      if (error) {
        setError(error.message);
        return;
      }
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      setPhase("enrol");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true);
    setError(null);

    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({
      factorId,
    });
    if (cErr || !challenge) {
      setError(cErr?.message ?? "Could not start the challenge.");
      setBusy(false);
      return;
    }

    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: code.trim(),
    });

    if (vErr) {
      setError("That code was not accepted. Codes expire every 30 seconds — try the next one.");
      setBusy(false);
      return;
    }

    setPhase("done");
    router.refresh(); // the session is now aal2; the server needs to see that
    setBusy(false);
  }

  if (phase === "loading") {
    return <p style={{ color: "var(--color-ink-3)" }}>Checking…</p>;
  }

  if (phase === "done") {
    return (
      <div className="panel" style={{ padding: "var(--space-lg)" }}>
        <p style={{ color: "var(--color-ok)", fontWeight: 500 }}>
          Two-factor is active on this session.
        </p>
        <p
          style={{
            marginTop: "var(--space-xs)",
            fontSize: "var(--text-sm)",
            color: "var(--color-ink-3)",
          }}
        >
          You can now issue and revoke licences, and register organizations.
        </p>
      </div>
    );
  }

  return (
    <div className="panel" style={{ padding: "var(--space-lg)" }}>
      {phase === "enrol" ? (
        <>
          <p style={{ marginBottom: "var(--space-md)" }}>
            Scan this with an authenticator app — 1Password, Google Authenticator, Authy.
          </p>
          {qr ? (
            // Supabase returns a self-contained SVG data URI. No external request.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qr}
              alt="Two-factor QR code"
              width={200}
              height={200}
              style={{
                border: "1px solid var(--color-rule)",
                borderRadius: "var(--radius)",
                background: "#fff",
              }}
            />
          ) : null}
          {secret ? (
            <p
              className="mono"
              style={{
                marginTop: "var(--space-sm)",
                fontSize: "var(--text-xs)",
                color: "var(--color-ink-3)",
                wordBreak: "break-all",
              }}
            >
              Or enter this key by hand: {secret}
            </p>
          ) : null}
        </>
      ) : (
        <p style={{ marginBottom: "var(--space-md)" }}>
          Enter the six-digit code from your authenticator app.
        </p>
      )}

      <form
        onSubmit={submit}
        style={{
          marginTop: "var(--space-md)",
          display: "flex",
          gap: "var(--space-xs)",
          alignItems: "flex-end",
          flexWrap: "wrap",
        }}
      >
        <label className="field">
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>Code</span>
          <input
            className="input mono"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            style={{ width: "8rem", letterSpacing: "0.2em" }}
            aria-invalid={error ? true : undefined}
          />
        </label>
        <button
          type="submit"
          className="btn btn--primary"
          disabled={busy}
          data-loading={busy}
        >
          {busy ? "Checking…" : "Confirm"}
        </button>
      </form>

      {error ? (
        <p
          role="alert"
          style={{
            marginTop: "var(--space-sm)",
            color: "var(--color-danger)",
            fontSize: "var(--text-sm)",
          }}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
