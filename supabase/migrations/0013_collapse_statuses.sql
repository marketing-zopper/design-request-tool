-- Collapses the request lifecycle from 7 statuses down to 3: Awaited
-- Approval, Approved, Rejected. The design team still uploads a final
-- design and the stakeholder still separately approves/rejects it — that
-- workflow itself is unchanged — it just no longer gets its own distinct
-- statuses (In Design, Ready for Review, Changes Requested, Completed).
-- Whether a request needs a first-time upload vs. is fully done vs. needs a
-- revision is now inferred from its attachments/approval history instead
-- (see hasFinalDesign in src/lib/api.js, StatusUpdatePanel, and the
-- equivalent in send-approval-digest).

alter table design_requests drop constraint if exists design_requests_status_check;

update design_requests set status = 'awaited_approval' where status in ('pending_requirement_approval', 'ready_for_review');
update design_requests set status = 'approved' where status in ('in_design', 'completed');
update design_requests set status = 'rejected' where status = 'changes_requested';
-- rows already 'approved' or 'rejected' need no change.

alter table design_requests alter column status set default 'awaited_approval';

alter table design_requests
  add constraint design_requests_status_check
  check (status in ('awaited_approval', 'approved', 'rejected'));
