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
