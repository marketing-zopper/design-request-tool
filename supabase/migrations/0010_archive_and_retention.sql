-- Archive support: the app no longer offers a hard "Delete" action on a
-- design request. Instead, the design team can archive it — a soft update
-- that just hides it from the default All Requests view (and from
-- pending-approval queries/digests) while keeping it fully intact until the
-- 60-day retention cleanup (see the sibling cleanup-old-requests Edge
-- Function, scheduled in 0011) removes it like any other request.

alter table design_requests
  add column if not exists archived boolean not null default false;

alter table design_requests
  add column if not exists archived_at timestamptz;

create index if not exists design_requests_archived_idx on design_requests (archived);

-- Deleting is now only ever done by the scheduled retention cleanup, which
-- runs with the service role key and therefore bypasses RLS entirely — so
-- drop the anon/authenticated delete policies added in 0005; nothing in the
-- app calls delete anymore.
drop policy if exists "design_requests_delete" on design_requests;
drop policy if exists "attachments_delete" on attachments;
drop policy if exists "approvals_delete" on approvals;
