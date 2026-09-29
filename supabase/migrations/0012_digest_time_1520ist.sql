-- Moves the daily approval-digest send time to 15:20 IST (= 09:50 UTC).
-- See 0007_daily_digest_cron.sql for the original schedule and job name.

select cron.alter_job(
  (select jobid from cron.job where jobname = 'daily-approval-digest'),
  schedule := '50 9 * * *'
);
