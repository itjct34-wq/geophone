-- Server-side OSINT response cache (provider + target hash, ~24h TTL).
-- Written only via SUPABASE_SERVICE_ROLE_KEY from Vercel /api proxies.
-- Clients never read/write this table directly.

create table if not exists public.osint_cache (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (char_length(provider) between 1 and 64),
  target_hash text not null check (target_hash ~ '^[a-f0-9]{64}$'),
  target_preview text check (target_preview is null or char_length(target_preview) <= 200),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint osint_cache_provider_target_unique unique (provider, target_hash)
);

create index if not exists osint_cache_expires_idx on public.osint_cache (expires_at);
create index if not exists osint_cache_provider_created_idx on public.osint_cache (provider, created_at desc);

alter table public.osint_cache enable row level security;

-- No policies for anon/authenticated: browser clients cannot access rows.
-- Service role bypasses RLS for Edge / Vercel API routes.

comment on table public.osint_cache is
  'Cached OSINT API responses keyed by provider + sha256(target). TTL typically 24h. Server-only.';
