import QRCode from "qrcode";

import { currentActor } from "@/lib/auth/actor";
import { listBatchUnits } from "@/lib/services/batches";

export const dynamic = "force-dynamic";

const PER_PAGE = 100;

/**
 * The QR sheet — where a unit id stops being a database row and becomes a thing on a box.
 *
 * Each code deep-links to /verify/<uuid>, so a phone camera goes straight to the trust
 * page with no typing. Nobody was ever going to key in 36 hex characters, and the
 * wireframe's "paste the UUID" text box was the weakest link in the whole design.
 *
 * Rendered as inline SVG server-side: sharp at any print size, no image requests, and
 * nothing to fetch from a CDN a factory printer may not be able to reach.
 */
export default async function BatchCodes({
  params,
  searchParams,
}: {
  params: Promise<{ batchId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const actor = await currentActor();
  const { batchId } = await params;
  const page = Math.max(Number((await searchParams).page ?? 1), 1);

  // listBatchUnits enforces ownership: another manufacturer asking for this batch gets
  // a 404, not a 403.
  const units = await listBatchUnits(actor, batchId, PER_PAGE, (page - 1) * PER_PAGE);

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const codes = await Promise.all(
    units.map(async (u) => ({
      unitId: u.unitId,
      svg: await QRCode.toString(`${origin}/verify/${u.unitId}`, {
        type: "svg",
        margin: 0,
        errorCorrectionLevel: "M", // survives a scuffed carton
      }),
    })),
  );

  return (
    <>
      <div className="no-print">
        <h1 style={{ fontSize: "var(--text-2xl)" }}>Unit codes</h1>
        <p style={{ color: "var(--color-ink-3)", fontSize: "var(--text-sm)" }}>
          Page {page} · {codes.length} codes. Each QR opens the public verification page
          for that unit.
        </p>
        <div
          style={{
            display: "flex",
            gap: "var(--space-sm)",
            marginTop: "var(--space-md)",
            flexWrap: "wrap",
          }}
        >
          {page > 1 ? (
            <a href={`?page=${page - 1}`} className="btn">
              Previous
            </a>
          ) : null}
          {codes.length === PER_PAGE ? (
            <a href={`?page=${page + 1}`} className="btn">
              Next {PER_PAGE}
            </a>
          ) : null}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: "var(--space-md)",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 7.5rem), 1fr))",
        }}
      >
        {codes.map((c) => (
          <figure
            key={c.unitId}
            style={{
              border: "1px solid var(--color-rule)",
              borderRadius: "var(--radius-sm)",
              padding: "var(--space-xs)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "var(--space-2xs)",
              breakInside: "avoid",
            }}
          >
            <div
              style={{ width: "100%", aspectRatio: "1" }}
              // qrcode emits a plain <svg> with no scripts or external refs.
              dangerouslySetInnerHTML={{ __html: c.svg }}
            />
            <figcaption
              className="mono"
              style={{
                fontSize: "0.5625rem",
                color: "var(--color-ink-3)",
                wordBreak: "break-all",
                textAlign: "center",
              }}
            >
              {c.unitId.slice(0, 13)}
            </figcaption>
          </figure>
        ))}
      </div>
    </>
  );
}
