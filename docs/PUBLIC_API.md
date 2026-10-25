# GeoPhone Public API

One unified endpoint for all in-app intel services.

## Endpoint

```http
POST /api/v1/intel
```

Also: `GET /api/v1/intel` — discovery (no auth).

Production base: `https://geophone-jct16.vercel.app`

## Auth

Create a key in **Admin → API keys** (signed in as `itjct34@gmail.com` / app admin).

Send on every request:

```http
Authorization: Bearer gp_…
```

or

```http
X-Api-Key: gp_…
```

## Free quota

| Plan | Monthly limit (UTC calendar month) |
|------|-------------------------------------|
| Free | **100** |
| Pro | 5,000 |
| Business | 50,000 |

Enforcement: `api/_lib/apiKeys.ts` → `consumeApiQuota()` increments `api_key_usage` and rejects with HTTP **429** when exceeded.

Response headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 2026-11-01T00:00:00.000Z
```

## Request body

```json
{
  "type": "phone|email|username|ip|domain|url|mac",
  "value": "target string",
  "modules": ["phone", "sherlock", "holehe", "ip", "dns", "mac"]
}
```

`modules` is optional; omit to run all relevant modules for the type.

## Curl examples

```bash
# Username / Sherlock-style
curl -sS -X POST "https://geophone-jct16.vercel.app/api/v1/intel" \
  -H "Authorization: Bearer gp_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"username","value":"public_handle","modules":["sherlock"]}'

# Email / Holehe + Sherlock local-part
curl -sS -X POST "https://geophone-jct16.vercel.app/api/v1/intel" \
  -H "X-Api-Key: gp_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"email","value":"you@example.com"}'

# Phone parse
curl -sS -X POST "https://geophone-jct16.vercel.app/api/v1/intel" \
  -H "Authorization: Bearer gp_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"phone","value":"+14155552671"}'

# IP geo
curl -sS -X POST "https://geophone-jct16.vercel.app/api/v1/intel" \
  -H "Authorization: Bearer gp_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"ip","value":"1.1.1.1","modules":["ip"]}'
```

## Notes

- Keys are stored as SHA-256 hashes only; the plaintext is shown once at creation.
- Requires `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` on Vercel for quota.
- This public layer is the intended external integration surface — do not expose other `/api/*` secrets.
