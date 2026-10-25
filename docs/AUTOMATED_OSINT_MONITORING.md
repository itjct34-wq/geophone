# Automated OSINT monitoring

This feature adds private investigation targets and scheduled public RDAP checks for domains/IPs. Phone and username entries are saved only; scheduled checks currently support domains and IPs. This does not provide live phone tracking or guaranteed attribution.

## Setup
1. Apply `supabase/migrations/20261025000100_investigation_monitoring.sql` in Supabase SQL Editor or via Supabase CLI.
2. Deploy `supabase/functions/run-monitoring/index.ts` as Edge Function `run-monitoring`. Set server-side secrets `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and a long random `MONITORING_CRON_SECRET`. Never put service-role keys in browser code or VITE variables.
3. Deploy with JWT verification disabled for this function because the handler authenticates the scheduler using its own secret: `supabase/config.toml`.
4. Enable Supabase Cron and pg_net. Store the project URL and scheduler secret in Supabase Vault; schedule an HTTP POST every 15 minutes to `https://YOUR_PROJECT_REF.supabase.co/functions/v1/run-monitoring` with `Authorization: Bearer YOUR_MONITORING_CRON_SECRET` and body `{}`. Do not hard-code secrets into SQL history.
5. Sign in to GeoPhone, add a domain you own or are authorized to assess, and verify the activity timeline after a scheduled run.

The worker processes at most 50 due targets per invocation. User data is protected with Row Level Security. See the official Supabase docs: https://supabase.com/docs/guides/database/postgres/row-level-security and https://supabase.com/docs/guides/functions/schedule-functions.
