-- Self-serve signup, without letting anyone mint themselves a regulator.
--
-- Until now the only way an account came into existence was scripts/seed.ts writing rows
-- with a service-role key. That is not a product: a pharmacy cannot be told to run a
-- TypeScript file to get an account. So signup is now open — but an organisation that
-- signed itself up has proved nothing about who it is.
--
-- 'pending' is that gap, made explicit. A self-registered organisation starts here: its
-- admin can sign in and see that they are waiting, and can do nothing else. The regulator
-- approves it, and only then does it get a seat in the chain.
--
-- lib/auth/actor.ts refuses to build an Actor for any org that is not 'active', so every
-- ownership and licence check downstream inherits this for free.

alter type org_status add value if not exists 'pending' before 'active';

-- Existing organisations were created by the regulator and stay active. The new default
-- is deliberately NOT changed: registerOrganization() is a government action and its
-- output is trusted. Only the signup path writes 'pending', and it says so explicitly.

comment on column organizations.status is
  'pending = self-registered, awaiting regulator approval; active = may act; suspended = stopped.';
