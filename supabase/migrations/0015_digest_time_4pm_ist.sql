-- Moves the daily approval-digest send time to 4:00 PM IST (= 10:30 UTC).
-- See 0007_daily_digest_cron.sql for the original schedule and job name.

select cron.alter_job(
  (select jobid from cron.job where jobname = 'daily-approval-digest'),
  schedule := '30 10 * * *'
);
