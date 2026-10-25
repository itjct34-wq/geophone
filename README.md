# GeoPhone Intelligence

Consent-based phone metadata, IP/network lookup, OpenStreetMap visualization, and cell-tower triangulation. GeoPhone is a React + Vite app (Leaflet / MapLibre) with optional Supabase auth and Vercel serverless proxies for tower and geocode APIs.

**What this is not:** covert phone tracking or “find anyone by number.” A number yields public numbering metadata (validity, country, carrier / MCC–MNC). Live maps require the person to open a consent link and agree.

## Run locally

Prerequisite: Node.js 20+.

1. `npm install`
2. Copy `.env.example` → `.env.local` and fill at least:
   - `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` (auth / history)
   - `OPENCELLID_KEY` (tower resolve via `/api/cell`)
   - `OPENCAGE_KEY` (forward/reverse geocode via `/api/geocode`)
3. `npm run dev` → http://localhost:3000  
   Vite serves `/api/cell` and `/api/geocode` in development so keys stay server-side.
4. `npm run lint` (TypeScript) · `npm run build` (production bundle)

Do not commit `.env`, `.env.local`, service-role keys, or SMS credentials.

## Public APIs & attribution

| Capability | Source | Key / notes |
|---|---|---|
| Phone parse / carrier hints | [libphonenumber-js](https://github.com/catamphetamine/libphonenumber-js) + local MCC/MNC tables | None |
| Maps & place search | [OpenStreetMap](https://www.openstreetmap.org) / [Nominatim](https://nominatim.org) (+ Photon fallback) | Respect Nominatim [usage policy](https://operations.osmfoundation.org/policies/nominatim/) |
| Map tiles | OSM, Esri World Imagery, OpenTopoMap, CARTO | Attribution in map chrome / footer |
| Geocoding enrichment | [OpenCage](https://opencagedata.com) via `/api/geocode` | `OPENCAGE_KEY` |
| Cell tower locate | [OpenCelliD](https://opencellid.org) → [BeaconDB](https://beacondb.net) → optional [Unwired Labs](https://unwiredlabs.com) | `OPENCELLID_KEY`, optional `UNWIREDLABS_TOKEN` |
| IP geolocation | Public IP APIs used by `ipService` | See service file for provider |
| Plus Codes | [open-location-code](https://github.com/google/open-location-code) | None |

Tower resolve order is documented in `api/cell.ts`. Unwired Labs is only called when `?deep=1` because free quotas are tiny.

## Freemium & monetization

| Tier | What you get |
|---|---|
| **Free** (no account or free plan) | Phone + IP lookups with **daily caps** (see `src/services/usageLimits.ts`), OSINT links, resource hub |
| **Paid** (`profiles.plan` / `paid_until` via Supabase admin) | Unlimited lookups, consent live location, towers + triangulation, God Eye, investigations, campaigns |

**Checkout paths (pick what you configure):**

1. **Stripe Payment Link** — set `VITE_STRIPE_PAYMENT_LINK` (+ optional `VITE_STRIPE_PRICE_LABEL`). Plan page opens Stripe; webhook fulfilment is stubbed in `src/services/stripeCheckout.ts` until you add a signed webhook that sets `paid_until`.
2. **Admin payment link** — customer requests access; admin pastes any HTTPS pay link (Stripe, bank, affiliate); customer taps “I’ve paid”; admin unlocks.
3. Do **not** invent fake “paid HLR APIs.” Paid value is consent tooling + higher usage + tower DB keys you already own.

## Product surfaces

- **Landing** — marketing + free tool entry (EN / UR)
- **Single Lookup** — carrier / MCC-MNC + Leaflet map (prefix area ≠ GPS)
- **Live GPS & Towers** (paid) — survey dump map, OpenCelliD resolve, triangulation, consent share links
- **IP & Network** — public IP geolocation (network region, not handset GPS)
- **God Eye** (paid) — MapLibre globe
- **Investigations / Campaigns** (paid) — see `docs/`

## Legal / ethics framing

Location sharing is opt-in only (`/s/:code`). Campaign pages do not harvest GPS on open. Phone intel is framed as **carrier / public-data lookup**. See Terms and Privacy routes.

## Related docs

- [Automated OSINT Monitoring](docs/AUTOMATED_OSINT_MONITORING.md)
- Campaign / Robo SMS setup in this README’s prior section and `.env.example`

### Campaign links and test SMS

1. Apply `supabase/migrations/20261025000200_campaign_links.sql`
2. Set server env vars from `.env.example` (`ROBOSMS_*`, `SMS_TEST_RECIPIENTS`)
3. Only allowlist your own verified numbers
4. Confirm `/c/:code` before sending SMS

Robo SMS is a paid provider — see [Robo SMS API docs](https://robosms.pk/api-documentation/).
