import Link from "next/link";

import { ActionForm, Field, Row } from "@/components/action-form";
import { ConfirmAction } from "@/components/modal";
import { Chip, Empty, Panel } from "@/components/ui";
import { currentActor } from "@/lib/auth/actor";
import { listMembers } from "@/lib/services/members";

import { inviteMemberAction, removeMemberAction } from "../actions";

export const dynamic = "force-dynamic";

/**
 * Step 3 of /access — "administrators invite their staff from inside the console" —
 * finally exists. Until this page there was no invite path in the product at all: the
 * only accounts that had ever existed were written by the seed script with a
 * service-role key, which is not a thing a regulator can be asked to do.
 */
export default async function OrganizationPage() {
  const actor = await currentActor();
  const members = await listMembers(actor);

  const isAdmin = actor.role === "admin";
  const admins = members.filter((m) => m.role === "admin").length;

  return (
    <>
      <div>
        <h1 style={{ fontSize: "var(--text-2xl)" }}>Your organization</h1>
        <p style={{ color: "var(--color-ink-3)", fontSize: "var(--text-sm)" }}>
          Everyone who can act for this {actor.orgType}. Every licence, unit, shipment and
          dispense is attributed to one of these people.
        </p>
      </div>

      {!isAdmin ? (
        <p
          role="status"
          style={{
            padding: "var(--space-sm) var(--space-md)",
            border: "1px solid var(--color-rule)",
            borderRadius: "var(--radius)",
            fontSize: "var(--text-sm)",
          }}
        >
          You can see who is here, but only an administrator can invite or remove people.
        </p>
      ) : !actor.mfaVerified ? (
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
          Inviting and removing people needs a second factor on this session — an admin
          who can mint colleagues is an admin worth stealing.
          <Link href="/security" className="btn">
            Set up two-factor
          </Link>
        </p>
      ) : null}

      {isAdmin ? (
        <Panel title="Invite someone">
          <ActionForm action={inviteMemberAction} submitLabel="Send invitation">
            <Row>
              <Field label="Email" hint="They receive a link and choose their own password.">
                <input name="email" type="email" className="input" required />
              </Field>
              <Field
                label="Role"
                hint="Viewers read. Operators do the daily work. Admins also manage people."
              >
                <select name="role" className="input" required defaultValue="operator">
                  <option value="viewer">Viewer</option>
                  <option value="operator">Operator</option>
                  <option value="admin">Administrator</option>
                </select>
              </Field>
            </Row>
          </ActionForm>
        </Panel>
      ) : null}

      <Panel title="People">
        {members.length === 0 ? (
          <Empty>Nobody is in this organization yet.</Empty>
        ) : (
          <div className="table-scroll" style={{ border: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  {isAdmin ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.userId}>
                    <td style={{ color: "var(--color-ink)" }}>
                      {m.email}
                      {m.isYou ? (
                        <span
                          style={{
                            marginLeft: "var(--space-xs)",
                            color: "var(--color-ink-3)",
                            fontSize: "var(--text-xs)",
                          }}
                        >
                          (you)
                        </span>
                      ) : null}
                    </td>
                    <td>{m.role}</td>
                    <td>
                      {m.pending ? (
                        <Chip tone="warn">invited — not signed in yet</Chip>
                      ) : (
                        <Chip tone="ok">active</Chip>
                      )}
                    </td>
                    {isAdmin ? (
                      <td>
                        {/* An org that loses its last admin cannot invite one back —
                            the recovery is a hand-written database row, so the button
                            simply is not offered. */}
                        {m.isYou || (m.role === "admin" && admins === 1) ? null : (
                          <ConfirmAction
                            action={removeMemberAction}
                            trigger="Remove"
                            triggerVariant="btn--danger"
                            title="Remove this person?"
                            body={`${m.email} will no longer be able to sign in for this organization. Everything they have already done stays in the audit trail under their name — removing someone does not remove their record.`}
                            confirmLabel="Remove them"
                            confirmVariant="btn--danger"
                            fields={{ userId: m.userId }}
                          />
                        )}
                      </td>
                    ) : null}
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
