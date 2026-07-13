import { ActionForm, Field } from "@/components/action-form";
import { RowAction } from "@/components/row-action";
import { Chip, Empty, Panel, UnitStatus, Uuid } from "@/components/ui";
import { currentActor } from "@/lib/auth/actor";
import { listInventory } from "@/lib/services/dispense";
import { listShipments } from "@/lib/services/shipments";

import {
  acceptShipmentAction,
  dispenseAction,
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
        <ActionForm action={dispenseAction} submitLabel="Dispense">
          <Field
            label="Unit code"
            hint="Scan the QR on the box, or type the code. Nothing about the customer is recorded."
          >
            <input
              name="unitId"
              className="input mono"
              required
              autoFocus
              placeholder="550e8400-e29b-41d4-a716-446655440000"
              pattern="[0-9a-fA-F-]{36}"
            />
          </Field>
        </ActionForm>
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
                          <RowAction
                            action={acceptShipmentAction}
                            label="Accept all"
                            variant="btn--primary"
                            fields={{ shipmentId: s.shipmentId }}
                          />
                          <RowAction
                            action={rejectShipmentAction}
                            label="Reject"
                            variant="btn--danger"
                            fields={{ shipmentId: s.shipmentId }}
                          />
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
