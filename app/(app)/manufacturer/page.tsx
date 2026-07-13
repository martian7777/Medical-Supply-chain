import Link from "next/link";

import { ActionForm, Field, Row } from "@/components/action-form";
import { Chip, Empty, Panel } from "@/components/ui";
import { currentActor } from "@/lib/auth/actor";
import { MAX_BATCH_QUANTITY } from "@/lib/domain/types";
import { listBatches } from "@/lib/services/batches";
import { listDrugTypes } from "@/lib/services/drug-types";
import { listLicenses } from "@/lib/services/licenses";
import { listOrganizationsByType } from "@/lib/services/oversight";
import { listShipments } from "@/lib/services/shipments";

import { createBatchAction, dispatchAction } from "../actions";

export const dynamic = "force-dynamic";

/** The plant's console: what we may make, making it, and sending it out. */
export default async function ManufacturerConsole() {
  const actor = await currentActor();

  const [licences, drugTypes, batches, pharmacies, outbox] = await Promise.all([
    listLicenses(actor),
    listDrugTypes(actor),
    listBatches(actor),
    listOrganizationsByType("pharmacy"),
    listShipments(actor, "out"),
  ]);

  // You may only produce what you are licensed to produce, today. Offering the others
  // in the dropdown would be offering a refusal.
  const producible = licences.filter((l) => l.usable);
  const producibleDrugIds = new Set(producible.map((l) => l.drugTypeId));
  const producibleDrugs = drugTypes.filter((d) => producibleDrugIds.has(d.drugTypeId));

  return (
    <>
      <div>
        <h1 style={{ fontSize: "var(--text-2xl)" }}>Production</h1>
        <p style={{ color: "var(--color-ink-3)", fontSize: "var(--text-sm)" }}>
          Serialize a batch, then send it to a pharmacy.
        </p>
      </div>

      <Panel title="Your licences">
        {licences.length === 0 ? (
          <Empty>
            The regulator has not issued you any licences. You cannot produce yet.
          </Empty>
        ) : (
          <div className="table-scroll" style={{ border: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Drug</th>
                  <th>Expires</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {licences.map((l) => (
                  <tr key={l.licenseId}>
                    <td style={{ color: "var(--color-ink)" }}>{l.drugName}</td>
                    <td className="mono">{l.expiresAt}</td>
                    <td>
                      {l.status === "revoked" ? (
                        <Chip tone="danger">revoked</Chip>
                      ) : l.usable ? (
                        <Chip tone="ok">valid</Chip>
                      ) : (
                        <Chip tone="warn">expired</Chip>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Create a batch">
        {producibleDrugs.length === 0 ? (
          <Empty>
            No usable licence, so there is nothing you may produce. A revoked or expired
            licence cannot be used, even for a drug you have made before.
          </Empty>
        ) : (
          <ActionForm action={createBatchAction} submitLabel="Serialize batch">
            <Row>
              <Field label="Drug type" hint="Only drugs you hold a valid licence for">
                <select name="drugTypeId" className="input" required>
                  {producibleDrugs.map((d) => (
                    <option key={d.drugTypeId} value={d.drugTypeId}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Lot number">
                <input name="lotNo" className="input mono" required maxLength={64} />
              </Field>
              <Field
                label="Quantity"
                hint={`Up to ${MAX_BATCH_QUANTITY.toLocaleString()} units`}
              >
                <input
                  type="number"
                  name="quantity"
                  className="input mono"
                  required
                  min={1}
                  max={MAX_BATCH_QUANTITY}
                  defaultValue={100}
                />
              </Field>
              <Field label="Expiration date">
                <input type="date" name="expirationDate" className="input mono" required />
              </Field>
            </Row>
          </ActionForm>
        )}
      </Panel>

      <Panel title="Batches">
        {batches.length === 0 ? (
          <Empty>Nothing produced yet.</Empty>
        ) : (
          <div className="table-scroll" style={{ border: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Lot</th>
                  <th>Drug</th>
                  <th className="num">Units</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.batchId}>
                    <td className="mono" style={{ color: "var(--color-ink)" }}>
                      {b.lotNo}
                    </td>
                    <td>{b.drugName}</td>
                    <td className="num">{b.quantity.toLocaleString()}</td>
                    <td className="mono">{b.expirationDate}</td>
                    <td>
                      {b.status === "recalled" ? (
                        <Chip tone="danger">recalled</Chip>
                      ) : (
                        <Chip tone="ok">{b.status}</Chip>
                      )}
                    </td>
                    <td>
                      {/* The codes have to get onto the boxes somehow. */}
                      <Link
                        href={`/manufacturer/batches/${b.batchId}/codes`}
                        className="btn"
                      >
                        Print codes
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Dispatch to a pharmacy">
        <p
          style={{
            padding: "var(--space-sm) var(--space-md) 0",
            fontSize: "var(--text-sm)",
            color: "var(--color-ink-2)",
          }}
        >
          Dispatching does not transfer ownership. The units stay yours, marked in
          transit, until the pharmacy accepts them.
        </p>

        {pharmacies.length === 0 ? (
          <Empty>No pharmacies are registered yet.</Empty>
        ) : (
          <ActionForm action={dispatchAction} submitLabel="Dispatch">
            <Field label="To pharmacy">
              <select name="toOrgId" className="input" required>
                {pharmacies.map((p) => (
                  <option key={p.orgId} value={p.orgId}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Unit codes"
              hint="One per line, or comma-separated. Paste from a picking list or scan them in."
            >
              <textarea
                name="unitIds"
                className="input mono"
                required
                rows={5}
                style={{ resize: "vertical" }}
              />
            </Field>
            <Field label="Note" hint="Optional — carrier, consignment reference">
              <input name="note" className="input" maxLength={500} />
            </Field>
          </ActionForm>
        )}

        {outbox.length > 0 ? (
          <div
            className="table-scroll"
            style={{ border: 0, borderTop: "1px solid var(--color-rule)" }}
          >
            <table className="table">
              <thead>
                <tr>
                  <th>Sent to</th>
                  <th className="num">Units</th>
                  <th>Dispatched</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {outbox.map((s) => (
                  <tr key={s.shipmentId}>
                    <td style={{ color: "var(--color-ink)" }}>{s.counterparty}</td>
                    <td className="num">{s.unitCount}</td>
                    <td className="mono">
                      {new Date(s.dispatchedAt).toISOString().slice(0, 10)}
                    </td>
                    <td>
                      {s.status === "dispatched" ? (
                        <Chip tone="accent">awaiting acceptance</Chip>
                      ) : s.status === "accepted" ? (
                        <Chip tone="ok">accepted</Chip>
                      ) : s.status === "rejected" ? (
                        <Chip tone="danger">rejected</Chip>
                      ) : (
                        <Chip tone="warn">partially accepted</Chip>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Panel>
    </>
  );
}
