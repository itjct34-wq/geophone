create table if not exists public.campaign_links (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Za-z0-9]{10,16}$'),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  destination_url text not null check (destination_url ~ '^https://'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  click_count integer not null default 0 check (click_count >= 0),
  last_clicked_at timestamptz,
  sms_sent_at timestamptz,
  sms_provider_id text
);

alter table public.campaign_links enable row level security;
drop policy if exists "Owners can read their campaign links" on public.campaign_links;
create policy "Owners can read their campaign links"
  on public.campaign_links for select to authenticated
  using (auth.uid() = owner_id);

create index if not exists campaign_links_owner_created_idx
  on public.campaign_links (owner_id, created_at desc);
create index if not exists campaign_links_expiry_idx
  on public.campaign_links (expires_at);

comment on table public.campaign_links is
  'Expiring campaign links. Opening a link does not collect location; the landing page must offer a separate optional and disclosed location-sharing action.';
