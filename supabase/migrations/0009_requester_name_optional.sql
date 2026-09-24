-- The submit form no longer collects the requester's name (email + team is
-- enough to identify who submitted a request). The column stays — dropping
-- it would lose history on existing rows — but it's no longer required.

alter table request_batches
  alter column requester_name drop not null;
