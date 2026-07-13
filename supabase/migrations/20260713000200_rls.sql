-- Row-Level Security: the second lock.
--
-- The API/domain layer is the PRIMARY authorization boundary (it runs server-side
-- with the service-role key, which bypasses RLS). These policies exist so that if
-- that boundary is ever bypassed — a leaked anon key, a stray client-side query,
-- a future developer wiring supabase-js into a component — cross-tenant reads
-- still fail closed.
--
-- Note what is NOT here: there are no INSERT/UPDATE/DELETE policies for the
-- `authenticated` role on ANY table. Clients cannot write. Ever. That is deliberate.

-- ---------------------------------------------------------------------------
-- Helpers. SECURITY DEFINER so they can read memberships without recursing
-- through the very policies that call them.
-- ---------------------------------------------------------------------------

create or replace function auth_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from memberships where user_id = auth.uid();
$$;

create or replace function auth_is_government()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from memberships m
    join organizations o on o.org_id = m.org_id
    where m.user_id = auth.uid()
      and o.type = 'government'
      and o.status = 'active'
  );
$$;

revoke execute on function auth_org_ids()        from anon;
revoke execute on function auth_is_government()  from anon;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere. With RLS on and no matching policy, access is denied.
-- ---------------------------------------------------------------------------

alter table organizations      enable row level security;
alter table users              enable row level security;
alter table memberships        enable row level security;
alter table drug_types         enable row level security;
alter table licenses           enable row level security;
alter table batches            enable row level security;
alter table medicine_units     enable row level security;
alter table shipments          enable row level security;
alter table shipment_lines     enable row level security;
alter table audit_log          enable row level security;
alter table verification_scans enable row level security;

-- ---------------------------------------------------------------------------
-- Read policies (authenticated only; anon gets nothing anywhere).
-- ---------------------------------------------------------------------------

-- The register of licensed entities is common knowledge among participants —
-- a manufacturer must be able to pick a pharmacy to ship to.
create policy orgs_read on organizations
  for select to authenticated
  using (true);

create policy users_read_self on users
  for select to authenticated
  using (user_id = auth.uid() or auth_is_government());

create policy memberships_read_own on memberships
  for select to authenticated
  using (user_id = auth.uid() or auth_is_government());

-- Every participant needs the drug catalogue (PRD B.2/B.3: "DrugType — Read: All").
create policy drug_types_read on drug_types
  for select to authenticated
  using (true);

create policy licenses_read on licenses
  for select to authenticated
  using (
    auth_is_government()
    or manufacturer_org_id in (select auth_org_ids())
  );

create policy batches_read on batches
  for select to authenticated
  using (
    auth_is_government()
    or manufacturer_org_id in (select auth_org_ids())
  );

-- An org sees the units it holds — plus units inbound to it on an open shipment,
-- so a pharmacy can inspect a consignment before accepting it.
create policy units_read on medicine_units
  for select to authenticated
  using (
    auth_is_government()
    or current_owner_org_id in (select auth_org_ids())
    or exists (
      select 1
      from shipment_lines sl
      join shipments s on s.shipment_id = sl.shipment_id
      where sl.unit_id = medicine_units.unit_id
        and s.to_org_id in (select auth_org_ids())
    )
  );

create policy shipments_read on shipments
  for select to authenticated
  using (
    auth_is_government()
    or from_org_id in (select auth_org_ids())
    or to_org_id   in (select auth_org_ids())
  );

create policy shipment_lines_read on shipment_lines
  for select to authenticated
  using (
    exists (
      select 1 from shipments s
      where s.shipment_id = shipment_lines.shipment_id
        and (
          auth_is_government()
          or s.from_org_id in (select auth_org_ids())
          or s.to_org_id   in (select auth_org_ids())
        )
    )
  );

create policy audit_read on audit_log
  for select to authenticated
  using (
    auth_is_government()
    or actor_org_id in (select auth_org_ids())
  );

-- Scan telemetry is a regulator-only signal.
create policy scans_read_gov on verification_scans
  for select to authenticated
  using (auth_is_government());

-- ---------------------------------------------------------------------------
-- Append-only enforcement.
--
-- RLS alone is not enough: service_role bypasses it. Table grants do NOT get
-- bypassed, so we revoke the verbs outright. Even a fully-compromised API key
-- cannot rewrite or erase the audit trail — only the migration role can.
-- ---------------------------------------------------------------------------

revoke update, delete on audit_log          from anon, authenticated, service_role;
revoke update, delete on verification_scans from anon, authenticated, service_role;
