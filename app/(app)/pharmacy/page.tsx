import { DispenseForm } from "@/components/dispense-form";
import { ConfirmAction } from "@/components/modal";
import { Chip, Empty, Panel, UnitStatus, Uuid } from "@/components/ui";
import { currentActor } from "@/lib/auth/actor";
import { listInventory } from "@/lib/services/dispense";
import { listShipments, listShipmentUnits } from "@/lib/services/shipments";

import {
  acceptShipmentAction,
  dispenseAction,
  partiallyAcceptShipmentAction,
  rejectShipmentAction,
} from "../actions";

export const dynamic = "force-dynamic";

/** The counter's console: what's arriving, what we hold, what we're selling. */
export default async function PharmacyConsole() {
  const actor = await currentActor();

  const [inbox, inventory] = await Promise.all([
    listShipments(actor, "in"),
    listInventory(actor),
  ]);

  const awaiting = inbox.filter((s) => s.status === "dispatched");
  const expiring = inventory.filter((u) => u.expired);

  // The unit-by-unit pick list, but only for consignments that can still be resolved.
  // Fetching lines for every shipment ever received would be a query per row for data
  // nobody can act on.
  const lines = new Map(
    await Promise.all(
      awaiting.map(
        async (s) =>
          [s.shipmentId, await listShipmentUnits(actor, s.shipmentId)] as const,
      ),
    ),
  );

  return (
    <>
      <div>
        <h1 style={{ fontSize: "var(--text-2xl)" }}>Dispensing</h1>
        <p style={{ color: "var(--color-ink-3)", fontSize: "var(--text-sm)" }}>
          Accept what arrives, then sell it.
        </p>
      </div>

      {/* Dispensing sits at the top: it is the thing done a hundred times a day, and it
          should be reachable without scrolling past anything. */}
      <Panel title="Dispense a unit">
        <DispenseForm action={dispenseAction} />
      </Panel>

      <Panel
        title="Incoming"
        action={
          awaiting.length > 0 ? (
            <Chip tone="accent">{awaiting.length} awaiting you</Chip>
          ) : undefined
        }
      >
        <p
          style={{
            padding: "var(--space-sm) var(--space-md) 0",
            fontSize: "var(--text-sm)",
            color: "var(--color-ink-2)",
          }}
        >
          These units are not yours until you accept them. If a consignment never
          arrived, or arrived damaged, reject it — the units go back to the sender and
          the discrepancy is recorded.
        </p>

        {inbox.length === 0 ? (
          <Empty>Nothing has been sent to you.</Empty>
        ) : (
          <div
            className="table-scroll"
            style={{ border: 0, borderTop: "1px solid var(--color-rule)" }}
          >
            <table className="table">
              <thead>
                <tr>
                  <th>From</th>
                  <th className="num">Units</th>
                  <th>Dispatched</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {inbox.map((s) => (
                  <tr key={s.shipmentId}>
                    <td style={{ color: "var(--color-ink)" }}>{s.counterparty}</td>
                    <td className="num">{s.unitCount}</td>
                    <td className="mono">
                      {new Date(s.dispatchedAt).toISOString().slice(0, 10)}
                    </td>
                    <td>
                      {s.status === "dispatched" ? (
                        <Chip tone="accent">awaiting you</Chip>
                      ) : s.status === "accepted" ? (
                        <Chip tone="ok">accepted</Chip>
                      ) : s.status === "rejected" ? (
                        <Chip tone="danger">rejected</Chip>
                      ) : (
                        <Chip tone="warn">partially accepted</Chip>
                      )}
                    </td>
                    <td>
                      {s.status === "dispatched" ? (
                        <div
                          style={{
                            display: "flex",
                            gap: "var(--space-xs)",
                            flexWrap: "wrap",
                          }}
                        >
                          <ConfirmAction
                            action={acceptShipmentAction}
                            trigger="Accept all"
                            triggerVariant="btn--primary"
                            title="Accept the whole consignment?"
                            body={`All ${s.unitCount} unit${s.unitCount === 1 ? "" : "s"} from ${s.counterparty} become yours, and you become answerable for them. Only accept what you have physically counted.`}
                            confirmLabel="Accept all"
                            fields={{ shipmentId: s.shipmentId }}
                          />

                          {/* Some arrived, some did not — the case the domain layer has
                              always supported and the UI never let anyone express. */}
                          <ConfirmAction
                            action={partiallyAcceptShipmentAction}
                            trigger="Accept some…"
                            title="Which units actually arrived?"
                            body="Tick only the units you have in your hands. Everything left unticked goes back to the sender, and the discrepancy is recorded against this consignment."
                            confirmLabel="Accept ticked units"
                            fields={{ shipmentId: s.shipmentId }}
                          >
                            <div className="modal__list">
                              {(lines.get(s.shipmentId) ?? []).map((u) => (
                                <label key={u.unitId} className="modal__pick">
                                  <input
                                    type="checkbox"
                                    name="acceptedUnitIds"
                                    value={u.unitId}
                                    defaultChecked
                                  />
                                  <span
                                    className="mono"
                                    style={{ fontSize: "var(--text-xs)" }}
                                  >
                                    {u.unitId.slice(0, 8)}…{u.unitId.slice(-4)}
                                  </span>
                                  <span style={{ color: "var(--color-ink-3)" }}>
                                    {u.drugName} · {u.lotNo}
                                  </span>
                                </label>
                              ))}
                            </div>
                            <label className="field">
                              <span
                                style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}
                              >
                                What was wrong?
                              </span>
                              <input
                                name="note"
                                className="input"
                                maxLength={500}
                                placeholder="Short by 4 boxes; carton 3 crushed"
                              />
                            </label>
                          </ConfirmAction>

                          <ConfirmAction
                            action={rejectShipmentAction}
                            trigger="Reject"
                            triggerVariant="btn--danger"
                            title="Reject the whole consignment?"
                            body={`All ${s.unitCount} unit${s.unitCount === 1 ? "" : "s"} go back to ${s.counterparty}, who owns them and always did. Nothing enters your inventory.`}
                            confirmLabel="Reject consignment"
                            confirmVariant="btn--danger"
                            fields={{ shipmentId: s.shipmentId }}
                          >
                            {/* This field is why the dialog exists. rejectShipmentAction
                                has always read a `note`, but the old row button posted
                                only the shipment id — so every rejection reason the page
                                promised to record was silently the empty string. */}
                            <label className="field">
                              <span
                                style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}
                              >
                                Reason
                              </span>
                              <input
                                name="note"
                                className="input"
                                required
                                maxLength={500}
                                placeholder="Never arrived; seal broken; wrong drug"
                              />
                            </label>
                          </ConfirmAction>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        title="Inventory"
        action={
          expiring.length > 0 ? (
            <Chip tone="warn">{expiring.length} expired</Chip>
          ) : undefined
        }
      >
        {inventory.length === 0 ? (
          <Empty>You hold no units.</Empty>
        ) : (
          <div className="table-scroll" style={{ border: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Drug</th>
                  <th>Lot</th>
                  <th>Expires</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {/* Sorted by expiry ascending server-side — the ones about to go out of
                    date are the ones the clerk needs to see. */}
                {inventory.map((u) => (
                  <tr key={u.unitId}>
                    <td>
                      <Uuid value={u.unitId} />
                    </td>
                    <td style={{ color: "var(--color-ink)" }}>{u.drugName}</td>
                    <td className="mono">{u.lotNo}</td>
                    <td className="mono">{u.expirationDate}</td>
                    <td>
                      {u.expired ? (
                        <Chip tone="danger">expired — do not sell</Chip>
                      ) : (
                        <UnitStatus status={u.status} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
