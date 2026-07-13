-- One organization per name.
--
-- Found when the seed script, run three times, produced three PharmaCorps — and the
-- manufacturer user ended up a member of all three while government issued a licence to
-- just one. The manufacturer console then correctly reported "no licences": its
-- actor.orgId pointed at a different PharmaCorp than the licensed one.
--
-- The root cause was `insert ... on conflict do nothing` with nothing to conflict ON.
-- A real registry does not let two "PharmaCorp"s exist, so the constraint belongs in the
-- schema, not just the seed. registration_no is already unique; a name collision is a
-- data-entry error the regulator should see immediately.
--
-- Duplicates must be removed before the index can be built. We keep the earliest row of
-- each name and delete the rest — but only when the later duplicates are safe to remove
-- (nothing depends on them). In this dev database they are seed noise; in production this
-- migration would need a considered merge, which is why it fails loudly rather than
-- cascading if anything real references a duplicate.

do $$
declare
  dup record;
begin
  for dup in
    select name, min(created_at) as keep_from
    from organizations
    group by name
    having count(*) > 1
  loop
    delete from organizations o
    where o.name = dup.name
      and o.created_at > dup.keep_from
      -- Refuse to delete a duplicate that anything points at. If this raises, the
      -- duplicates are not mere seed noise and need a hand-written merge.
      and not exists (select 1 from licenses l where l.manufacturer_org_id = o.org_id)
      and not exists (select 1 from batches b where b.manufacturer_org_id = o.org_id)
      and not exists (select 1 from medicine_units u where u.current_owner_org_id = o.org_id)
      and not exists (select 1 from shipments s where s.from_org_id = o.org_id or s.to_org_id = o.org_id)
      and not exists (select 1 from memberships m where m.org_id = o.org_id);
  end loop;
end $$;

create unique index organizations_name_unique on organizations (name);
