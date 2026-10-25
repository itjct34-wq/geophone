# GeoPhone Intelligence

GeoPhone is a React + Vite application for phone-number metadata, IP/network lookups, batch review, and consent-based location sharing.

## Run locally

Prerequisite: Node.js.

1. Run `npm install`.
2. Copy `.env.example` to `.env.local` and configure the public Supabase URL and publishable key required by `src/lib/supabase.ts`.
3. Run `npm run dev`.
4. Run `npm run build` to produce the Vite build, and `npm run lint` for the TypeScript check.

Do not commit local environment files, service-role keys, API credentials, or scheduler secrets.

## Automated investigation monitoring

The feature implementation and setup steps are documented in [Automated OSINT Monitoring](docs/AUTOMATED_OSINT_MONITORING.md). Scheduled domain/IP checks use public RDAP records. Phone and username values are investigation notes, not live location methods. The monitoring worker requires an applied Supabase migration, server-side secrets, and a configured scheduler before it will execute.

Live location features must remain consent-based.


## Campaign links and test SMS

The Campaigns & SMS section creates expiring HTTPS short links and can send a test message through Robo SMS Pakistan. The API requires an authenticated GeoPhone user and only sends to numbers in the server-side `SMS_TEST_RECIPIENTS` allowlist.

1. Apply `supabase/migrations/20261025000200_campaign_links.sql` to Supabase.
2. Configure the server-side Vercel environment variables documented in `.env.example`.
3. Add only your own verified numbers to `SMS_TEST_RECIPIENTS`. Keep secrets in server environment settings; never commit real credentials.
4. Deploy and confirm the `/c/:code` landing route before sending a test SMS.

Robo SMS requires account setup and a balance; sender-ID approval may be required. It is not a free/unlimited SMS service. See the [Robo SMS API documentation](https://robosms.pk/api-documentation/).

Campaign pages identify themselves and do not request or collect location when opened. Location sharing remains separate and optional. A visitor can decline location sharing and still access the campaign.
