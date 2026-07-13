import Link from "next/link";

import { ActionForm, Field, Row } from "@/components/action-form";
import { ConfirmAction } from "@/components/modal";
import { Chip, Empty, Panel, Uuid } from "@/components/ui";
import { currentActor } from "@/lib/auth/actor";
import { listDrugTypes } from "@/lib/services/drug-types";
import { listLicenses } from "@/lib/services/licenses";
import {
  flaggedUnits,
  listOrganizations,
  oversightCounts,
  recentAudit,
} from "@/lib/services/oversight";

import {
  approveOrgAction,
  createDrugTypeAction,
  issueLicenseAction,
  prolongLicenseAction,
  registerOrgAction,
  rejectOrgAction,
  revokeLicenseAction,
} from "../actions";

export const dynamic = "force-dynamic";

/** The regulator's console. GOV-1 through GOV-7 on one screen. */
export default async function GovernmentConsole() {
  const actor = await currentActor();

  const [counts, drugTypes, licences, orgs, flagged, audit] = await Promise.all([
    oversightCounts(actor),
    listDrugTypes(actor),
    listLicenses(actor),
    listOrganizations(actor),
    flaggedUnits(actor),
    recentAudit(actor),
  ]);

  // A pending org is a claim, not a counterparty. It must not appear in the licence
  // dropdown — issuing a licence to an organisation nobody has approved is exactly the
  // hole the approval queue exists to close.
  const pending = orgs.filter((o) => o.status === "pending");
  const manufacturers = orgs.filter(
    (o) => o.type === "manufacturer" && o.status === "active",
  );
  const today = new Date().toISOString().slice(0, 10);

  const stats: Array<[string, number]> = [
    ["Drug types", counts.drugTypes],
    ["Valid licences", counts.validLicences],
    ["Organizations", counts.organizations],
    ["Units serialized", counts.unitsTotal],
    ["Units dispensed", counts.unitsDispensed],
  ];

  return (
    <>
      <div>
        <h1 style={{ fontSize: "var(--text-2xl)" }}>Oversight</h1>
        <p style={{ color: "var(--color-ink-3)", fontSize: "var(--text-sm)" }}>
          Every drug type, licence, organization and unit in the national chain.
        </p>
      </div>

      {/* Say WHY the buttons will refuse, before they refuse. A regulator who clicks
          "Revoke" and gets an opaque "requires multi-factor authentication" has been
          failed twice: once by the missing factor, once by us not warning them. */}
      {!actor.mfaVerified ? (
        <p
          role="status"
          style={{
            display: "flex",
            gap: "var(--space-sm)",
            alignItems: "center",
            flexWrap: "wrap",
            padding: "var(--space-sm) var(--space-md)",
            border: "1px solid var(--color-warn)",
            background: "var(--color-warn-weak)",
            borderRadius: "var(--radius)",
            fontSize: "var(--text-sm)",
            color: "var(--color-ink)",
          }}
        >
          You can read everything here, but issuing or revoking a licence needs a second
          factor on this session.
          <Link href="/security" className="btn">
            Set up two-factor
          </Link>
        </p>
      ) : null}

      {/* Real counts, queried live. No invented metrics. */}
      <div
        style={{
          display: "grid",
          gap: "var(--space-md)",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 10rem), 1fr))",
        }}
      >
        {stats.map(([label, value]) => (
          <div
            key={label}
            style={{
              border: "1px solid var(--color-rule)",
              borderRadius: "var(--radius)",
              padding: "var(--space-md)",
            }}
          >
            <div className="label">{label}</div>
            <div
              className="mono"
              style={{
                fontSize: "var(--text-2xl)",
                color: "var(--color-ink)",
                fontWeight: 500,
                marginTop: "var(--space-2xs)",
              }}
            >
              {value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* The counterfeit signal comes FIRST when there is one. It is the single most
          consequential thing on this page, and burying it under CRUD tables would be a
          failure of hierarchy, not a matter of taste. */}
      {flagged.length > 0 ? (
        <Panel title="Suspected counterfeits">
          <p
            style={{
              padding: "var(--space-sm) var(--space-md) 0",
              fontSize: "var(--text-sm)",
              color: "var(--color-ink-2)",
            }}
          >
            Codes whose scan pattern does not look like a real pack&apos;s. A genuine
            unit is checked a few times, in one place. These are not.
          </p>
          <div className="table-scroll" style={{ border: 0, margin: "var(--space-sm)" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Drug</th>
                  <th className="num">Scans</th>
                  <th className="num">Regions</th>
                  <th className="num">After sale</th>
                  <th>Signal</th>
                </tr>
              </thead>
              <tbody>
                {flagged.map((f) => (
                  <tr key={f.unitId}>
                    <td>
                      <Uuid value={f.unitId} />
                    </td>
                    <td>{f.drugName ?? "—"}</td>
                    <td className="num">{f.scans}</td>
                    <td className="num">{f.regions}</td>
                    <td className="num">{f.afterDispense}</td>
                    <td>
                      {f.known ? (
                        <Chip tone="warn">anomalous pattern</Chip>
                      ) : (
                        <Chip tone="danger">code never issued</Chip>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      <Panel title="Drug types">
        <ActionForm action={createDrugTypeAction} submitLabel="Register drug type">
          <Row>
            <Field label="Code" hint="Regulatory code, e.g. PARA-500">
              <input name="code" className="input mono" required maxLength={64} />
            </Field>
            <Field label="Name">
              <input name="name" className="input" required maxLength={200} />
            </Field>
            <Field label="Description" hint="Optional">
              <input name="description" className="input" maxLength={2000} />
            </Field>
          </Row>
        </ActionForm>

        {drugTypes.length === 0 ? (
          <Empty>No drug types registered yet.</Empty>
        ) : (
          <div className="table-scroll" style={{ border: 0, borderTop: "1px solid var(--color-rule)" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {drugTypes.map((d) => (
                  <tr key={d.drugTypeId}>
                    <td className="mono">{d.code}</td>
                    <td style={{ color: "var(--color-ink)" }}>{d.name}</td>
                    <td style={{ color: "var(--color-ink-3)" }}>
                      {d.description ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Licences">
        <ActionForm action={issueLicenseAction} submitLabel="Issue licence">
          <Row>
            <Field label="Drug type">
              <select name="drugTypeId" className="input" required>
                <option value="">Choose…</option>
                {drugTypes.map((d) => (
                  <option key={d.drugTypeId} value={d.drugTypeId}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Manufacturer">
              <select name="manufacturerOrgId" className="input" required>
                <option value="">Choose…</option>
                {manufacturers.map((m) => (
                  <option key={m.orgId} value={m.orgId}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Expires">
              <input
                type="date"
                name="expiresAt"
                className="input mono"
                required
                min={today}
              />
            </Field>
          </Row>
        </ActionForm>

        {licences.length === 0 ? (
          <Empty>No licences issued yet.</Empty>
        ) : (
          <div className="table-scroll" style={{ border: 0, borderTop: "1px solid var(--color-rule)" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Manufacturer</th>
                  <th>Drug</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {licences.map((l) => (
                  <tr key={l.licenseId}>
                    <td style={{ color: "var(--color-ink)" }}>{l.manufacturerName}</td>
                    <td>{l.drugName}</td>
                    <td className="mono">{l.expiresAt}</td>
                    <td>
                      {/* `usable` is computed server-side. "Valid" and "usable today"
                          are different questions and the UI must not re-derive the
                          difference — that gap is where unlicensed production hides. */}
                      {l.status === "revoked" ? (
                        <Chip tone="danger">revoked</Chip>
                      ) : l.usable ? (
                        <Chip tone="ok">valid</Chip>
                      ) : (
                        <Chip tone="warn">expired</Chip>
                      )}
                    </td>
                    <td>
                      {l.status === "valid" ? (
                        <div
                          style={{
                            display: "flex",
                            gap: "var(--space-xs)",
                            flexWrap: "wrap",
                          }}
                        >
                          {/* Prolonging has existed in the service layer and the REST API
                              since the first pass, with no button anywhere that reached
                              it — so a licence about to lapse could only be replaced, not
                              extended. */}
                          <ConfirmAction
                            action={prolongLicenseAction}
                            trigger="Extend"
                            title="Extend this licence"
                            body={`${l.manufacturerName} may continue producing ${l.drugName} until the new date. The licence must not be extended backwards.`}
                            confirmLabel="Extend licence"
                            fields={{ licenseId: l.licenseId }}
                          >
                            <label className="field">
                              <span
                                style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}
                              >
                                New expiry
                              </span>
                              <input
                                type="date"
                                name="newExpiresAt"
                                className="input mono"
                                required
                                min={l.expiresAt > today ? l.expiresAt : today}
                                defaultValue={l.expiresAt}
                              />
                            </label>
                          </ConfirmAction>

                          <ConfirmAction
                            action={revokeLicenseAction}
                            trigger="Revoke"
                            triggerVariant="btn--danger"
                            title="Revoke this licence?"
                            body={`${l.manufacturerName} will immediately be unable to serialize any new unit of ${l.drugName}. Units already produced keep their provenance and stay valid — this stops future production, it does not recall the past.`}
                            confirmLabel="Revoke licence"
                            confirmVariant="btn--danger"
                            fields={{ licenseId: l.licenseId }}
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

      {/* The approval queue. Organizations that registered themselves have proved nothing
          yet, and until a regulator looks at them they can do nothing — so this is the
          regulator's actual inbox, and it sits above the CRUD. */}
      {pending.length > 0 ? (
        <Panel
          title="Awaiting approval"
          action={<Chip tone="accent">{pending.length} waiting</Chip>}
        >
          <p
            style={{
              padding: "var(--space-sm) var(--space-md) 0",
              fontSize: "var(--text-sm)",
              color: "var(--color-ink-2)",
            }}
          >
            These organizations registered themselves. Check the registration number
            against your own register before approving — approving one is what allows it
            to serialize or dispense real medicine.
          </p>

          <div className="table-scroll" style={{ border: 0, margin: "var(--space-sm)" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Claims to be</th>
                  <th>Registration</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pending.map((o) => (
                  <tr key={o.orgId}>
                    <td style={{ color: "var(--color-ink)" }}>{o.name}</td>
                    <td>{o.type}</td>
                    <td className="mono">{o.registrationNo ?? "— none given —"}</td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: "var(--space-xs)",
                          flexWrap: "wrap",
                        }}
                      >
                        <ConfirmAction
                          action={approveOrgAction}
                          trigger="Approve"
                          triggerVariant="btn--primary"
                          title="Approve this organization?"
                          body={`${o.name} will be able to sign in and act as a ${o.type} in the national chain — and, if a manufacturer, to serialize units the public will be told are genuine. Approve only if you have verified who they are.`}
                          confirmLabel="Approve"
                          fields={{ orgId: o.orgId }}
                        />
                        <ConfirmAction
                          action={rejectOrgAction}
                          trigger="Reject"
                          triggerVariant="btn--danger"
                          title="Reject this registration?"
                          body={`${o.name} will be told, when they sign in, that they were not approved. The registration stays on the record — rejecting is not deleting.`}
                          confirmLabel="Reject"
                          confirmVariant="btn--danger"
                          fields={{ orgId: o.orgId }}
                        >
                          <label className="field">
                            <span style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>
                              Reason
                            </span>
                            <input
                              name="note"
                              className="input"
                              maxLength={500}
                              placeholder="No such registration number on our register"
                            />
                          </label>
                        </ConfirmAction>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      <Panel title="Organizations">
        <ActionForm action={registerOrgAction} submitLabel="Register organization">
          <Row>
            <Field label="Type">
              <select name="type" className="input" required>
                <option value="manufacturer">Manufacturer</option>
                <option value="pharmacy">Pharmacy</option>
              </select>
            </Field>
            <Field label="Name">
              <input name="name" className="input" required maxLength={200} />
            </Field>
            <Field label="Registration no." hint="Optional">
              <input name="registrationNo" className="input mono" maxLength={100} />
            </Field>
          </Row>
        </ActionForm>

        {orgs.length === 0 ? (
          <Empty>No organizations registered yet.</Empty>
        ) : (
          <div className="table-scroll" style={{ border: 0, borderTop: "1px solid var(--color-rule)" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Registration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((o) => (
                  <tr key={o.orgId}>
                    <td style={{ color: "var(--color-ink)" }}>{o.name}</td>
                    <td>{o.type}</td>
                    <td className="mono">{o.registrationNo ?? "—"}</td>
                    <td>
                      {o.status === "active" ? (
                        <Chip tone="ok">active</Chip>
                      ) : o.status === "pending" ? (
                        <Chip tone="accent">awaiting approval</Chip>
                      ) : (
                        <Chip tone="danger">suspended</Chip>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Audit trail">
        {audit.length === 0 ? (
          <Empty>Nothing has happened yet.</Empty>
        ) : (
          <div className="table-scroll" style={{ border: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>Organization</th>
                  <th>User</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a, i) => (
                  <tr key={`${a.at}-${i}`}>
                    <td className="mono" style={{ whiteSpace: "nowrap" }}>
                      {new Date(a.at).toISOString().slice(0, 16).replace("T", " ")}
                    </td>
                    <td className="mono" style={{ color: "var(--color-ink)" }}>
                      {a.action}
                    </td>
                    <td>{a.org ?? "—"}</td>
                    <td style={{ color: "var(--color-ink-3)" }}>{a.user ?? "—"}</td>
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
