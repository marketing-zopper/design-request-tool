-- The one way a stakeholder can now record an approval/rejection/changes-
-- requested decision. Replaces the direct `approvals`/`design_requests`
-- table writes recordApproval()+updateRequestStatus() used to perform from
-- the browser (see src/lib/api.js) — those tables have no INSERT/UPDATE
-- policy left for anon/authenticated as of 0017, so this SECURITY DEFINER
-- function is the only path.
--
-- Critically, this function does NOT trust the magic-link token at all for
-- authorization — it independently re-derives the invited stakeholder's
-- email for p_request_id and compares it to the caller's own
-- Google-verified auth.jwt() email. A forwarded link opened by a different
-- Google account resolves the token fine for *display* purposes elsewhere,
-- but raises 'email_mismatch' here and writes nothing.

create or replace function record_stakeholder_approval(
  p_request_id uuid,
  p_approval_type text,
  p_decision text,
  p_comment text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_stakeholder_name text;
  v_matches boolean;
  v_existing_id uuid;
  v_design_status text;
begin
  if v_caller_email = '' then
    raise exception 'not_authenticated';
  end if;

  if p_approval_type not in ('requirement', 'final_design') then
    raise exception 'invalid_approval_type';
  end if;
  if p_decision not in ('approved', 'rejected', 'changes_requested') then
    raise exception 'invalid_decision';
  end if;

  select
    (lower(s.email) = v_caller_email or lower(b.custom_stakeholder_email) = v_caller_email),
    coalesce(s.name, b.custom_stakeholder_name)
  into v_matches, v_stakeholder_name
  from design_requests dr
  join request_batches b on b.id = dr.batch_id
  left join stakeholders s on s.id = b.stakeholder_id
  where dr.id = p_request_id;

  if v_matches is null then
    raise exception 'request_not_found';
  end if;

  if v_matches is distinct from true then
    raise exception 'email_mismatch';
  end if;

  select id into v_existing_id
  from approvals
  where request_id = p_request_id and approval_type = p_approval_type
  order by created_at desc
  limit 1;

  if v_existing_id is not null then
    update approvals
    set status = p_decision,
        stakeholder_name = v_stakeholder_name,
        comment = p_comment,
        approved_at = case when p_decision = 'approved' then now() else null end
    where id = v_existing_id;
  else
    insert into approvals (request_id, approval_type, status, stakeholder_name, comment, approved_at)
    values (
      p_request_id, p_approval_type, p_decision, v_stakeholder_name, p_comment,
      case when p_decision = 'approved' then now() else null end
    );
  end if;

  v_design_status := case when p_decision = 'approved' then 'approved' else 'rejected' end;
  update design_requests set status = v_design_status where id = p_request_id;
end;
$$;

grant execute on function record_stakeholder_approval(uuid, text, text, text) to authenticated;
