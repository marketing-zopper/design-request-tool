-- Per-stakeholder magic-link access for the Approvals page.
--
-- There is still no login. Instead, each stakeholder gets a personal
-- `access_token`, embedded in every digest email as an "Approve Now" link
-- (?token=...). Anyone who opens that link is trusted as that stakeholder —
-- per the product decision, there's no further verification. What this
-- migration protects against is something else: the anon key must never be
-- able to read anyone's token by just querying the table (that would let
-- anyone enumerate every stakeholder's private link). See the column grants
-- and the resolve_stakeholder_by_token() function below.

alter table stakeholders
  add column if not exists access_token uuid not null default gen_random_uuid();

alter table stakeholders
  add constraint stakeholders_access_token_key unique (access_token);

-- Case-insensitive uniqueness on email so repeated "Other" submissions from
-- the same person reuse one stakeholder row (and one token) instead of
-- creating a duplicate every time. NULL emails are exempt.
create unique index if not exists stakeholders_email_unique_idx
  on stakeholders (lower(email))
  where email is not null;

-- The submit flow now upserts a stakeholder row when the requester picks
-- "Other" and types a name/email (see findOrCreateStakeholder in
-- src/lib/api.js), so that person also gets a token and future digest email.
drop policy if exists "stakeholders_insert" on stakeholders;
create policy "stakeholders_insert"
  on stakeholders for insert
  to anon, authenticated
  with check (true);

-- RLS controls which ROWS are visible; it does not hide columns. Revoke
-- table-wide select and re-grant only the columns the app's normal queries
-- need, so a plain `select * from stakeholders` (or the equivalent REST call)
-- can never return access_token.
revoke select on stakeholders from anon, authenticated;
grant select (id, name, email, active, created_at) on stakeholders to anon, authenticated;

-- The one sanctioned way to turn a token into an identity. SECURITY DEFINER
-- runs with the function owner's privileges (bypassing the column grant
-- above internally), but the query only ever returns the single row whose
-- token matches exactly what the caller already has — never a list, and
-- there's no way to enumerate tokens through it.
create or replace function resolve_stakeholder_by_token(p_token uuid)
returns table (id uuid, name text, email text)
language sql
security definer
set search_path = public
as $$
  select id, name, email
  from stakeholders
  where access_token = p_token and active = true;
$$;

grant execute on function resolve_stakeholder_by_token(uuid) to anon, authenticated;
