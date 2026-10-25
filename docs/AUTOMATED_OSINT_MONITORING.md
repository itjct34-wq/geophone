# Automated OSINT monitoring

This feature adds private investigation targets and scheduled public RDAP checks for domains/IPs. Phone and username entries are saved only; scheduled checks currently support domains and IPs. This does not provide live phone tracking or guaranteed attribution.

## Setup
1. Apply `supabase/migrations/20261025000100_investigation_monitoring.sql` to the **same** Supabase project as `VITE_SUPABASE_URL` (local `.env.local` currently points at `https://akvatwieicqlwunfgjvj.supabase.co`).

   **SQL Editor (fastest if the project is not linked in CLI/MCP):**
   - Open [Supabase Dashboard → SQL](https://supabase.com/dashboard/project/akvatwieicqlwunfgjvj/sql/new)
   - Paste the full contents of `supabase/migrations/20261025000100_investigation_monitoring.sql`
   - Run it (creates `investigation_targets` + `monitoring_runs`, RLS, and `NOTIFY pgrst, 'reload schema'`)

   **CLI (when logged into that project):**
   ```bash
   npx supabase link --project-ref akvatwieicqlwunfgjvj
   npx supabase db push
   ```

   Until this migration is applied, Investigation Center returns: `Could not find the table 'public.investigation_targets' in the schema cache`.
   Related: `monitoring_runs` is created by the same migration; `campaign_links` is a separate migration and may already exist.
2. Deploy `supabase/functions/run-monitoring/index.ts` as Edge Function `run-monitoring`. Set server-side secrets `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and a long random `MONITORING_CRON_SECRET`. Never put service-role keys in browser code or VITE variables.
3. Deploy with JWT verification disabled for this function because the handler authenticates the scheduler using its own secret: `supabase/config.toml`.
4. Enable Supabase Cron and pg_net. Store the project URL and scheduler secret in Supabase Vault; schedule an HTTP POST every 15 minutes to `https://YOUR_PROJECT_REF.supabase.co/functions/v1/run-monitoring` with `Authorization: Bearer YOUR_MONITORING_CRON_SECRET` and body `{}`. Do not hard-code secrets into SQL history.
5. Sign in to GeoPhone, add a domain you own or are authorized to assess, and verify the activity timeline after a scheduled run.

The worker processes at most 50 due targets per invocation. User data is protected with Row Level Security. See the official Supabase docs: https://supabase.com/docs/guides/database/postgres/row-level-security and https://supabase.com/docs/guides/functions/schedule-functions.
