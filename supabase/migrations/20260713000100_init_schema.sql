-- MSWP initial schema.
--
-- Deviations from docs/05-data-model.md are deliberate and recorded in the plan's
-- "Spec deviations register":
--   * `participants` is split into organizations / users / memberships.
--   * There is no `citizen` role and no citizen PII. Dispense is terminal and
--     records WHERE and WHEN, never WHO.
--   * Units are created in batches, not one at a time.
--   * Manufacturer -> Pharmacy custody moves via a two-phase shipment.

create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type org_type      as enum ('government', 'manufacturer', 'pharmacy');
create type org_status    as enum ('active', 'suspended');
create type member_role   as enum ('admin', 'operator', 'viewer');
create type license_status as enum ('valid', 'revoked');
create type batch_status  as enum ('generating', 'active', 'recalled');
create type unit_status   as enum ('active', 'in_transit', 'dispensed', 'expired', 'recalled');
create type shipment_status as enum ('dispatched', 'accepted', 'rejected', 'partially_accepted');

-- ---------------------------------------------------------------------------
-- Identity: organizations own things; users are people who log in.
-- ---------------------------------------------------------------------------

create table organizations (
  org_id           uuid primary key default gen_random_uuid(),
  type             org_type    not null,
  name             text        not null,
  registration_no  text        unique,
  status           org_status  not null default 'active',
  created_at       timestamptz not null default now(),
  created_by       uuid        references auth.users (id)
);

-- Mirrors auth.users. Kept separate so we can join/RLS without touching the auth schema.
create table users (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  email       text        not null,
  full_name   text,
  created_at  timestamptz not null default now()
);

create table memberships (
  user_id     uuid        not null references users (user_id) on delete cascade,
  org_id      uuid        not null references organizations (org_id) on delete cascade,
  role        member_role not null default 'operator',
  created_at  timestamptz not null default now(),
  primary key (user_id, org_id)
);

create index memberships_org_idx on memberships (org_id);

-- ---------------------------------------------------------------------------
-- Regulatory: drug types and production licenses (Government writes these).
-- ---------------------------------------------------------------------------

create table drug_types (
  drug_type_id  uuid primary key default gen_random_uuid(),
  code          text        not null unique,
  name          text        not null,
  description   text,
  created_at    timestamptz not null default now(),
  created_by    uuid        not null references users (user_id)
);

create table licenses (
  license_id           uuid primary key default gen_random_uuid(),
  drug_type_id         uuid           not null references drug_types (drug_type_id),
  manufacturer_org_id  uuid           not null references organizations (org_id),
  status               license_status not null default 'valid',
  issued_at            timestamptz    not null default now(),
  expires_at           date           not null,
  issued_by            uuid           not null references users (user_id),
  revoked_at           timestamptz,
  revoked_by           uuid           references users (user_id)
);

-- The hot path for CreateBatch: "does this manufacturer hold a valid license for this drug?"
create index licenses_lookup_idx
  on licenses (manufacturer_org_id, drug_type_id)
  where status = 'valid';

-- A manufacturer should not hold two concurrently-valid licenses for the same drug.
create unique index licenses_one_valid_per_pair_idx
  on licenses (manufacturer_org_id, drug_type_id)
  where status = 'valid';

-- ---------------------------------------------------------------------------
-- Production: a batch is one serialization run; units are its members.
-- ---------------------------------------------------------------------------

create table batches (
  batch_id             uuid primary key default gen_random_uuid(),
  drug_type_id         uuid         not null references drug_types (drug_type_id),
  license_id           uuid         not null references licenses (license_id),
  manufacturer_org_id  uuid         not null references organizations (org_id),
  lot_no               text         not null,
  quantity             integer      not null check (quantity > 0 and quantity <= 100000),
  expiration_date      date         not null,
  status               batch_status not null default 'generating',
  created_at           timestamptz  not null default now(),
  created_by           uuid         not null references users (user_id),
  unique (manufacturer_org_id, lot_no)
);

create table medicine_units (
  unit_id              uuid primary key default gen_random_uuid(),
  batch_id             uuid        not null references batches (batch_id),
  current_owner_org_id uuid        not null references organizations (org_id),
  status               unit_status not null default 'active',
  -- Dispense records the pharmacy and the moment. It never records the person.
  dispensed_by_org_id  uuid        references organizations (org_id),
  dispensed_at         timestamptz,
  created_at           timestamptz not null default now(),

  constraint dispensed_fields_consistent check (
    (status = 'dispensed' and dispensed_by_org_id is not null and dispensed_at is not null)
    or (status <> 'dispensed' and dispensed_by_org_id is null and dispensed_at is null)
  )
);

-- Inventory screens: "what does this org currently hold, by status?"
create index medicine_units_owner_idx on medicine_units (current_owner_org_id, status);
-- Batch drill-down and (later) partition key.
create index medicine_units_batch_idx on medicine_units (batch_id);

-- ---------------------------------------------------------------------------
-- Custody: two-phase shipment. Ownership moves only on accept.
-- ---------------------------------------------------------------------------

create table shipments (
  shipment_id   uuid primary key default gen_random_uuid(),
  from_org_id   uuid            not null references organizations (org_id),
  to_org_id     uuid            not null references organizations (org_id),
  status        shipment_status not null default 'dispatched',
  dispatched_at timestamptz     not null default now(),
  dispatched_by uuid            not null references users (user_id),
  resolved_at   timestamptz,
  resolved_by   uuid            references users (user_id),
  note          text,

  constraint no_self_shipment check (from_org_id <> to_org_id)
);

create index shipments_inbox_idx on shipments (to_org_id, status);

create table shipment_lines (
  shipment_id uuid not null references shipments (shipment_id) on delete cascade,
  unit_id     uuid not null references medicine_units (unit_id),
  -- Set on partial acceptance: which lines the receiver actually took.
  accepted    boolean,
  primary key (shipment_id, unit_id)
);

create index shipment_lines_unit_idx on shipment_lines (unit_id);

-- ---------------------------------------------------------------------------
-- Append-only: audit trail and public scan telemetry.
-- ---------------------------------------------------------------------------

create table audit_log (
  id            bigserial primary key,
  actor_user_id uuid        references users (user_id),
  actor_org_id  uuid        references organizations (org_id),
  action        text        not null,
  entity_type   text        not null,
  entity_id     text        not null,
  payload       jsonb       not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index audit_log_entity_idx on audit_log (entity_type, entity_id, created_at desc);
create index audit_log_actor_idx  on audit_log (actor_org_id, created_at desc);

-- Every public verification. No personal data: IP and UA are salted hashes,
-- location is coarse region only. This is what detects a cloned QR code.
--
-- unit_id deliberately has NO foreign key: a scan of a UUID that does not exist
-- is precisely the signal we most want to keep (someone is holding a fake box).
create table verification_scans (
  id          bigserial primary key,
  unit_id     uuid        not null,
  scanned_at  timestamptz not null default now(),
  region      text,
  ip_hash     text,
  ua_hash     text
);

create index verification_scans_unit_idx on verification_scans (unit_id, scanned_at desc);
