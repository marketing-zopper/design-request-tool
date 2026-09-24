-- Adds delete support for design requests.
--
-- The original schema deliberately had no delete policy (requests were meant
-- to only ever change status). The product now needs a "Delete" action on a
-- request from All Requests, so this grants DELETE on design_requests plus
-- its cascaded children (attachments, approvals) — Postgres still enforces
-- RLS on rows removed via ON DELETE CASCADE, so both child tables need their
-- own delete policy too, or the cascade (and the whole delete) is rejected.

drop policy if exists "design_requests_delete" on design_requests;
create policy "design_requests_delete"
  on design_requests for delete
  to anon, authenticated
  using (true);

drop policy if exists "attachments_delete" on attachments;
create policy "attachments_delete"
  on attachments for delete
  to anon, authenticated
  using (true);

drop policy if exists "approvals_delete" on approvals;
create policy "approvals_delete"
  on approvals for delete
  to anon, authenticated
  using (true);
