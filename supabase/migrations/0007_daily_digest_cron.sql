-- Schedules the daily approval-digest email via pg_cron + pg_net, calling the
-- send-approval-digest Edge Function once a day.
--
-- IMPORTANT — run this once, BEFORE this migration, in the SQL Editor
-- (never commit the real value to a file):
--
--   select vault.create_secret('<same-random-string-as-DIGEST_INVOKE_SECRET>', 'digest_invoke_secret');
--
-- That's the same secret you set on the Edge Function with
-- `supabase secrets set DIGEST_INVOKE_SECRET=...` — this is how the cron job
-- authenticates to the function without embedding the secret in plain SQL
-- that ends up in git.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'daily-approval-digest',
  '0 9 * * *', -- 9:00 UTC daily — adjust to suit your stakeholders' timezone
  $$
  select net.http_post(
    url := 'https://nbgqzqdvaflmjsmvfqkw.supabase.co/functions/v1/send-approval-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-digest-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'digest_invoke_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- To change the schedule later:
--   select cron.alter_job((select jobid from cron.job where jobname = 'daily-approval-digest'), schedule := '0 9 * * *');
-- To stop it:
--   select cron.unschedule('daily-approval-digest');
