-- The audit log must outlive the actors it describes.
--
-- Found by the Phase-1 spike: audit_log carried foreign keys to organizations and
-- users, while also being append-only (UPDATE/DELETE revoked). Those two facts are
-- individually reasonable and jointly fatal —
--
--   * the FK means an org/user with any audit history cannot be deleted;
--   * the append-only grant means the audit rows holding that FK cannot be deleted
--     either, so the reference can never be released;
--   * ON DELETE SET NULL does not rescue it, because that is an UPDATE, and UPDATE
--     is revoked too.
--
-- So any organization that ever acted became permanently undeletable — including
-- when erasure is legally required.
--
-- An audit entry is a statement about the PAST: "at 14:03, user X acting for org Y
-- revoked licence Z". That statement remains true whether or not X and Y still exist.
-- Audit tables therefore record actor identifiers as plain values, not as live
-- references. verification_scans already does this (its unit_id has no FK, so a scan
-- of a counterfeit code is still recorded).
--
-- Referential integrity is not lost where it matters: every WRITE goes through the
-- domain layer, which resolves a real Actor from a real membership before anything
-- reaches this table.

alter table audit_log drop constraint if exists audit_log_actor_user_id_fkey;
alter table audit_log drop constraint if exists audit_log_actor_org_id_fkey;

comment on column audit_log.actor_user_id is
  'User id as of the event. Intentionally NOT a foreign key: the record must survive the user.';
comment on column audit_log.actor_org_id is
  'Org id as of the event. Intentionally NOT a foreign key: the record must survive the organization.';
