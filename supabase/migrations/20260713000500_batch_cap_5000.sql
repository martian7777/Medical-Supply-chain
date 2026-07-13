-- Lower the per-batch ceiling from 100,000 to 5,000 units.
--
-- Not a database limitation: the Phase-1 spike generated 100,000 units in 4.3s
-- (~23,000 units/sec) on this very instance. The constraint is Vercel's HOBBY plan,
-- whose serverless functions are killed at 10 seconds. A 4.3s insert plus auth,
-- network and cold-start overhead leaves no margin, and a batch that dies halfway
-- through a deploy is exactly the kind of thing this system must never do.
--
-- 5,000 units generates in well under a second.
--
-- On Vercel Pro (60s) this can be raised again. It must be changed in lockstep with
-- MAX_BATCH_QUANTITY in lib/domain/types.ts; if the two disagree, the domain layer
-- either rejects work the database would accept, or waves through work the database
-- will refuse at the last moment.

alter table batches drop constraint if exists batches_quantity_check;

alter table batches add constraint batches_quantity_check
  check (quantity > 0 and quantity <= 5000);
