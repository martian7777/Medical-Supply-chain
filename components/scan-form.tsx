"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * The way a real person actually verifies a medicine: they point their phone at the box.
 *
 * The original wireframe asked them to type a 36-character UUID into a text box. In a
 * pharmacy queue, on a phone, that fails — they mistype it, get "not found", and
 * conclude the medicine is fake or the system is broken. Both conclusions are wrong and
 * both are our fault.
 *
 * So the camera is the primary path. `BarcodeDetector` is native in Chrome/Android (the
 * majority of the phones this will meet) and needs no library. Where it is missing, we
 * fall back to the text field rather than shipping a 200 KB polyfill to everyone — and
 * the field also serves anyone reading a code off a printed sheet.
 */
export function ScanForm() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSupported("BarcodeDetector" in window);
  }, []);

  useEffect(() => {
    if (!scanning) return;

    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    (async () => {
      try {
        // @ts-expect-error — BarcodeDetector is not in lib.dom yet.
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (stopped) return;

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            for (const c of codes) {
              const match = UUID_RE.exec(String(c.rawValue));
              if (match) {
                stopped = true;
                router.push(`/verify/${match[0].toLowerCase()}`);
                return;
              }
            }
          } catch {
            // A dropped frame is not an error worth showing anyone.
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setError(
          "The camera could not be opened. Enter the code underneath the QR instead.",
        );
        setScanning(false);
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [scanning, router]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = new FormData(e.currentTarget).get("code");
    const match = UUID_RE.exec(String(raw ?? ""));
    if (!match) {
      setError("That does not look like a medicine code. Check it and try again.");
      return;
    }
    router.push(`/verify/${match[0].toLowerCase()}`);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
      {scanning ? (
        <div
          style={{
            position: "relative",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            border: "1px solid var(--color-rule-2)",
            aspectRatio: "1",
            background: "var(--color-graphite)",
          }}
        >
          <video
            ref={videoRef}
            muted
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <button
            type="button"
            className="btn"
            onClick={() => setScanning(false)}
            style={{
              position: "absolute",
              bottom: "var(--space-sm)",
              left: "50%",
              transform: "translateX(-50%)",
            }}
          >
            Stop
          </button>
        </div>
      ) : supported ? (
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            setError(null);
            setScanning(true);
          }}
          style={{
            width: "100%",
            padding: "var(--space-md)",
            fontSize: "var(--text-lg)",
          }}
        >
          Scan the code on the box
        </button>
      ) : null}

      <form onSubmit={onSubmit} className="field">
        <label
          htmlFor="code"
          style={{ fontSize: "var(--text-sm)", color: "var(--color-ink-3)" }}
        >
          {supported ? "Or type the code printed under the QR" : "Type the code printed on the box"}
        </label>
        <div style={{ display: "flex", gap: "var(--space-xs)" }}>
          <input
            id="code"
            name="code"
            className="input mono"
            inputMode="text"
            autoComplete="off"
            placeholder="550e8400-e29b-41d4-…"
            aria-invalid={error ? true : undefined}
          />
          <button type="submit" className="btn">
            Check
          </button>
        </div>
      </form>

      {error ? (
        <p role="alert" style={{ color: "var(--color-danger)", fontSize: "var(--text-sm)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
