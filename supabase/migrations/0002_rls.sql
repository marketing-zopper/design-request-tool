-- Row Level Security policies for the no-auth V1.
--
-- There is deliberately no login in V1, so every request from the browser is made
-- with the public "anon" key. RLS stays ON for every table (never disabled globally);
-- instead each table gets narrow, explicit policies that only allow the operations
-- the app actually performs. See README.md "No-auth security tradeoffs" for the
-- full reasoning and the migration path once real auth/roles are introduced.

alter table stakeholders enable row level security;
alter table request_batches enable row level security;
alter table design_requests enable row level security;
alter table attachments enable row level security;
alter table approvals enable row level security;

-- ---------------------------------------------------------
-- stakeholders: read-only from the app. Managed via SQL/dashboard for V1.
-- ---------------------------------------------------------
drop policy if exists "stakeholders_select" on stakeholders;
create policy "stakeholders_select"
  on stakeholders for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------
-- request_batches: created once at submission time, never edited from the app.
-- ---------------------------------------------------------
drop policy if exists "request_batches_select" on request_batches;
create policy "request_batches_select"
  on request_batches for select
  to anon, authenticated
  using (true);

drop policy if exists "request_batches_insert" on request_batches;
create policy "request_batches_insert"
  on request_batches for insert
  to anon, authenticated
  with check (true);

-- ---------------------------------------------------------
-- design_requests: created at submission, then transitioned by the design team
-- and stakeholders as the workflow progresses. No delete policy — requests are
-- never removed from the app, only re-statused.
-- ---------------------------------------------------------
drop policy if exists "design_requests_select" on design_requests;
create policy "design_requests_select"
  on design_requests for select
  to anon, authenticated
  using (true);

drop policy if exists "design_requests_insert" on design_requests;
create policy "design_requests_insert"
  on design_requests for insert
  to anon, authenticated
  with check (true);

drop policy if exists "design_requests_update" on design_requests;
create policy "design_requests_update"
  on design_requests for update
  to anon, authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------
-- attachments: added at submission time and by the design team when uploading
-- final designs. No update/delete policy — a new version is a new row.
-- ---------------------------------------------------------
drop policy if exists "attachments_select" on attachments;
create policy "attachments_select"
  on attachments for select
  to anon, authenticated
  using (true);

drop policy if exists "attachments_insert" on attachments;
create policy "attachments_insert"
  on attachments for insert
  to anon, authenticated
  with check (true);

-- ---------------------------------------------------------
-- approvals: one row created per approval step, updated when a stakeholder acts.
-- ---------------------------------------------------------
drop policy if exists "approvals_select" on approvals;
create policy "approvals_select"
  on approvals for select
  to anon, authenticated
  using (true);

drop policy if exists "approvals_insert" on approvals;
create policy "approvals_insert"
  on approvals for insert
  to anon, authenticated
  with check (true);

drop policy if exists "approvals_update" on approvals;
create policy "approvals_update"
  on approvals for update
  to anon, authenticated
  using (true)
  with check (true);
