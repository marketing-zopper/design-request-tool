-- Phase 3 (Google Login + centralized Upstash RBAC): replaces the old
-- blanket `using(true)`/`with check(true)` anon policies with real,
-- identity-scoped RLS now that every caller carries a verified Supabase
-- Auth JWT (Google-signed-in) instead of just the anon key.
--
-- Employees (Editor/Admin/Super Admin) no longer read/write these four
-- tables through PostgREST at all — see supabase/functions/employee-actions,
-- which verifies the caller's role against Upstash live and then uses the
-- service-role key (which bypasses RLS by design). So there is deliberately
-- no policy here granting employees anything — only the stakeholder's own
-- rows are reachable directly.
--
-- Stakeholders (external, Google-signed-in, never in Upstash) keep reading
-- directly via PostgREST, now scoped to rows where their verified JWT email
-- matches the invited stakeholder for that batch. Writes for stakeholders
-- move to record_stakeholder_approval() in 0018, which re-derives this same
-- match server-side before doing anything — so this migration only needs
-- to add SELECT policies for them, not INSERT/UPDATE.

create or replace function current_user_email()
returns text
language sql stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

-- request_batches --------------------------------------------------------
drop policy if exists "request_batches_insert" on request_batches;
drop policy if exists "request_batches_select" on request_batches;

create policy "request_batches_select_stakeholder"
  on request_batches for select
  to authenticated
  using (
    exists (
      select 1 from stakeholders s
      where s.id = request_batches.stakeholder_id
        and lower(s.email) = current_user_email()
    )
    or lower(request_batches.custom_stakeholder_email) = current_user_email()
  );

-- design_requests ----------------------------------------------------------
drop policy if exists "design_requests_insert" on design_requests;
drop policy if exists "design_requests_update" on design_requests;
drop policy if exists "design_requests_select" on design_requests;

create policy "design_requests_select_stakeholder"
  on design_requests for select
  to authenticated
  using (
    exists (
      select 1 from request_batches b
      left join stakeholders s on s.id = b.stakeholder_id
      where b.id = design_requests.batch_id
        and (lower(s.email) = current_user_email()
             or lower(b.custom_stakeholder_email) = current_user_email())
    )
  );

-- attachments ---------------------------------------------------------------
drop policy if exists "attachments_insert" on attachments;
drop policy if exists "attachments_select" on attachments;

create policy "attachments_select_stakeholder"
  on attachments for select
  to authenticated
  using (
    exists (
      select 1 from design_requests dr
      join request_batches b on b.id = dr.batch_id
      left join stakeholders s on s.id = b.stakeholder_id
      where dr.id = attachments.request_id
        and (lower(s.email) = current_user_email()
             or lower(b.custom_stakeholder_email) = current_user_email())
    )
  );

-- approvals -------------------------------------------------------------
drop policy if exists "approvals_insert" on approvals;
drop policy if exists "approvals_update" on approvals;
drop policy if exists "approvals_select" on approvals;

create policy "approvals_select_stakeholder"
  on approvals for select
  to authenticated
  using (
    exists (
      select 1 from design_requests dr
      join request_batches b on b.id = dr.batch_id
      left join stakeholders s on s.id = b.stakeholder_id
      where dr.id = approvals.request_id
        and (lower(s.email) = current_user_email()
             or lower(b.custom_stakeholder_email) = current_user_email())
    )
  );

-- storage: uploads now require some authenticated (Google-signed-in)
-- session — either an employee submitting/uploading via employee-actions'
-- client-side storage call, or a future authenticated flow. Reads stay open
-- (public bucket, no sensitive data in a filename).
drop policy if exists "design_assets_insert" on storage.objects;
create policy "design_assets_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'design-assets');
