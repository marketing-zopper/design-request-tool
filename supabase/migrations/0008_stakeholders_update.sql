-- Lets the app deactivate a stakeholder (soft-delete via `active = false`)
-- instead of hard-deleting the row. Hard-deleting isn't safe here anyway:
-- request_batches.stakeholder_id has no ON DELETE CASCADE, so removing a
-- stakeholder who's ever been referenced by a submission would fail with a
-- foreign-key violation. Deactivating keeps history intact and simply drops
-- them from fetchStakeholders() (which already filters on active = true).

drop policy if exists "stakeholders_update" on stakeholders;
create policy "stakeholders_update"
  on stakeholders for update
  to anon, authenticated
  using (true)
  with check (true);
