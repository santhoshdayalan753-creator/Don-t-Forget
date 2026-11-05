-- Add pg_cron and pg_net extensions if available in Supabase Project
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Scheduled cron job running every minute to evaluate due reminders
-- Calls the Supabase Edge Function 'check-scheduled-reminders' securely
select
  cron.schedule(
    'process-scheduled-reminders-every-minute',
    '* * * * *',
    $$
    select
      net.http_post(
        url := (select coalesce(current_setting('app.settings.edge_function_url', true), 'https://your-project-id.supabase.co/functions/v1/check-scheduled-reminders')),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || coalesce(current_setting('app.settings.service_role_key', true), '')
        ),
        body := '{}'::jsonb
      ) as request_id;
    $$
  );
