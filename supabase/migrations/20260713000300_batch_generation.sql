-- Batch unit generation.
--
-- docs/04-business-logic-specification.md §2.5 specifies CreateMedicineUnit as one
-- unit per call. A real serialization run is 10k-100k units, which as row-by-row
-- inserts would be tens of thousands of round trips and would exceed any serverless
-- function budget.
--
-- Postgres can do the whole run in a single statement. generate_series produces the
-- row count, gen_random_uuid() serializes each one, and the whole thing is one
-- transaction: either the batch exists in full, or it does not exist at all. There
-- is no partial batch, and there is no queue to operate.
--
-- Eligibility (valid, non-revoked, non-expired licence held by the caller's org for
-- this drug type) is enforced in lib/domain/batches.ts BEFORE this is called. It is
-- re-asserted here as a backstop, because a batch created against a revoked licence
-- is the exact failure this whole system exists to prevent.

create or replace function generate_batch_units(
  p_batch_id uuid,
  p_owner_org_id uuid
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_quantity integer;
  v_license_id uuid;
  v_manufacturer_org_id uuid;
  v_status batch_status;
  v_inserted integer;
begin
  select quantity, license_id, manufacturer_org_id, status
    into v_quantity, v_license_id, v_manufacturer_org_id, v_status
  from batches
  where batch_id = p_batch_id
  for update;

  if not found then
    raise exception 'batch % not found', p_batch_id using errcode = 'no_data_found';
  end if;

  if v_status <> 'generating' then
    raise exception 'batch % already generated (status=%)', p_batch_id, v_status
      using errcode = 'invalid_parameter_value';
  end if;

  if v_manufacturer_org_id <> p_owner_org_id then
    raise exception 'batch % does not belong to org %', p_batch_id, p_owner_org_id
      using errcode = 'insufficient_privilege';
  end if;

  -- Backstop: the licence must still be good at the instant of generation.
  if not exists (
    select 1 from licenses
    where license_id = v_license_id
      and status = 'valid'
      and expires_at >= current_date
  ) then
    raise exception 'licence % is revoked or expired', v_license_id
      using errcode = 'insufficient_privilege';
  end if;

  insert into medicine_units (unit_id, batch_id, current_owner_org_id, status)
  select gen_random_uuid(), p_batch_id, p_owner_org_id, 'active'
  from generate_series(1, v_quantity);

  get diagnostics v_inserted = row_count;

  update batches set status = 'active' where batch_id = p_batch_id;

  return v_inserted;
end;
$$;

revoke execute on function generate_batch_units(uuid, uuid) from anon, authenticated;
