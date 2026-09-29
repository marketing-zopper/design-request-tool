-- Moves the daily approval-digest send time to 15:25 IST (= 09:55 UTC).
-- See 0007_daily_digest_cron.sql for the original schedule and job name.

select cron.alter_job(
  (select jobid from cron.job where jobname = 'daily-approval-digest'),
  schedule := '55 9 * * *'
);
