-- ============================================================================
-- Don't Forget — server-side reminder runner (pg_cron + pg_net)
-- ----------------------------------------------------------------------------
-- Runs `check-scheduled-reminders` every minute so reminders are emailed even
-- when the user's browser is closed.
--
-- BEFORE RUNNING THIS FILE:
--   1. Deploy the edge functions:
--        supabase functions deploy check-scheduled-reminders
--        supabase functions deploy send-reminder-email
--      and set secrets:
--        supabase secrets set RESEND_API_KEY=... SENDER_EMAIL="Don't Forget <reminders@yourdomain.com>"
--   2. Store the project URL + service role key in Supabase Vault (run once):
--
--        select vault.create_secret('https://YOUR-PROJECT-REF.supabase.co', 'project_url');
--        select vault.create_secret('YOUR-SERVICE-ROLE-KEY', 'service_role_key');
--
--      Or, alternatively, use database settings (simpler, key is stored in
--      database config instead of Vault):
--
--        alter database postgres set app.settings.project_url = 'https://YOUR-PROJECT-REF.supabase.co';
--        alter database postgres set app.settings.service_role_key = 'YOUR-SERVICE-ROLE-KEY';
--
-- The service role key is only stored server-side; it must never be shipped in
-- the Vite bundle (VITE_* variables are public).
-- ============================================================================

create extension if not exists pg_cron;
-- Supabase installs pg_net in the `extensions` schema, not `public`.
create extension if not exists pg_net with schema extensions;

-- Remove any previous version of the job (replace, do not duplicate)
select cron.unschedule(jobid)
  from cron.job
 where jobname = 'process-scheduled-reminders-every-minute';

-- Every minute, POST to the reminder worker.
select cron.schedule(
  'process-scheduled-reminders-every-minute',
  '* * * * *',
  $cron$
  select net.http_post(
    url := coalesce(
      (select decrypted_secret from vault.decrypted_secrets where name = 'project_url'),
      current_setting('app.settings.project_url', true),
      'https://YOUR-PROJECT-REF.supabase.co'
    ) || '/functions/v1/check-scheduled-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(
        (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
        current_setting('app.settings.service_role_key', true),
        ''
      )
    ),
    body := jsonb_build_object('source', 'pg_cron'),
    timeout_milliseconds := 10000
  );
  $cron$
);

-- ---------------------------------------------------------------------------
-- Observability
-- ---------------------------------------------------------------------------
-- Scheduled jobs:
--   select jobid, jobname, schedule, active from cron.job;
-- Recent runs + failures:
--   select jobid, status, return_message, start_time
--     from cron.job_run_details order by start_time desc limit 20;
-- HTTP results from pg_net (status_code should be 200):
--   select id, status_code, content, created from net._http_response
--    order by created desc limit 10;
-- Reminder ledger:
--   select channel, status, count(*) from public.reminder_dispatch_logs group by 1,2;
