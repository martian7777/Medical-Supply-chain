-- Make audit_log immutable against EVERY role, including the one the app uses.
--
-- The earlier REVOKE (migration 000200) took UPDATE/DELETE away from anon,
-- authenticated and service_role. That covers a leaked API key hitting PostgREST — but
-- it does not cover the application itself, which connects directly to Postgres as the
-- table OWNER. An owner's privileges are implicit and re-grantable, so no combination
-- of GRANT/REVOKE can lock them out of their own table.
--
-- A trigger can. It fires on the statement regardless of who issued it, and it cannot
-- be shrugged off by re-granting a privilege. Rewriting history now requires dropping
-- this trigger — which is a schema change, which is itself a migration, which is
-- itself reviewable. That is the property a regulatory audit trail needs: not "nobody
-- has permission", but "nobody can do it quietly".
--
-- verification_scans is deliberately NOT locked this way: it is telemetry, it grows
-- without bound, and a retention job must be able to trim old rows. Its integrity
-- requirement is "cannot be tampered with from outside" (the REVOKE already does that),
-- not "can never be pruned".

create or replace function audit_log_is_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_log is append-only: % is not permitted', tg_op
    using errcode = 'insufficient_privilege',
          hint = 'Corrections are recorded as new entries, never as edits.';
end;
$$;

create trigger audit_log_no_update
  before update on audit_log
  for each row execute function audit_log_is_append_only();

create trigger audit_log_no_delete
  before delete on audit_log
  for each row execute function audit_log_is_append_only();
