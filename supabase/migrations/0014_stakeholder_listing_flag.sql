-- Splits "is this stakeholder allowed to approve/receive digests" (active)
-- from "should this stakeholder show up in the requester's dropdown"
-- (is_listed). A stakeholder auto-created via the "Other" pick at
-- submission time (see findOrCreateStakeholder in src/lib/api.js) still
-- needs to be active — their magic link and digest keep working exactly as
-- before — but should never appear in the dropdown for future submissions;
-- only the deliberately curated stakeholder list should ever show there.

alter table stakeholders add column if not exists is_listed boolean not null default true;

grant select (is_listed) on stakeholders to anon, authenticated;

-- Hides the stray "me" stakeholder (vasundhra.khatter@zopper.com) from the
-- dropdown without touching their `active` flag or breaking any magic link
-- already tied to them.
update stakeholders set is_listed = false where id = 'd914bf31-4e93-433e-9978-c247decd1a22';
