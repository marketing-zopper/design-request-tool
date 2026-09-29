-- Schedules the 60-day retention cleanup via pg_cron + pg_net, calling the
-- cleanup-old-requests Edge Function once a day. Reuses the same
-- digest_invoke_secret Vault secret and DIGEST_INVOKE_SECRET env var as
-- send-approval-digest (see 0007) — both are cron-only, service-role
-- functions, so one shared secret is enough. No extra `vault.create_secret`
-- step needed if you already ran 0007's.

select cron.schedule(
  'retention-cleanup',
  '15 3 * * *', -- 3:15 UTC daily
  $$
  select net.http_post(
    url := 'https://nbgqzqdvaflmjsmvfqkw.supabase.co/functions/v1/cleanup-old-requests',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-digest-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'digest_invoke_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- To change the schedule later:
--   select cron.alter_job((select jobid from cron.job where jobname = 'retention-cleanup'), schedule := '15 3 * * *');
-- To stop it:
--   select cron.unschedule('retention-cleanup');
