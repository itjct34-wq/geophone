-- Public API keys + monthly usage counters for POST /api/v1/intel

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  name text not null default 'Default',
  key_prefix text not null,
  key_hash text not null unique,
  plan text not null default 'free' check (plan in ('free', 'pro', 'business')),
  monthly_limit integer not null default 100 check (monthly_limit > 0),
  disabled boolean not null default false,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create table if not exists public.api_key_usage (
  key_id uuid not null references public.api_keys (id) on delete cascade,
  period_yyyy_mm text not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (key_id, period_yyyy_mm)
);

create index if not exists api_keys_prefix_idx on public.api_keys (key_prefix);
create index if not exists api_keys_user_idx on public.api_keys (user_id);

alter table public.api_keys enable row level security;
alter table public.api_key_usage enable row level security;

drop policy if exists "Admins manage api keys" on public.api_keys;
create policy "Admins manage api keys"
  on public.api_keys for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Users read own api keys" on public.api_keys;
create policy "Users read own api keys"
  on public.api_keys for select to authenticated
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Admins read usage" on public.api_key_usage;
create policy "Admins read usage"
  on public.api_key_usage for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.api_keys k
      where k.id = api_key_usage.key_id and k.user_id = auth.uid()
    )
  );

-- Admin creates a key; plaintext returned once via RPC.
create or replace function public.admin_create_api_key(
  p_name text,
  p_plan text default 'free',
  p_user uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_key text;
  prefix text;
  digest text;
  lim integer;
  row_id uuid;
begin
  perform public.admin_assert();
  if p_plan not in ('free', 'pro', 'business') then
    raise exception 'Invalid plan';
  end if;
  lim := case p_plan
    when 'pro' then 5000
    when 'business' then 50000
    else 100
  end;
  raw_key := 'gp_' || encode(extensions.gen_random_bytes(24), 'hex');
  prefix := left(raw_key, 10);
  digest := encode(extensions.digest(raw_key, 'sha256'), 'hex');
  insert into public.api_keys (user_id, name, key_prefix, key_hash, plan, monthly_limit)
  values (p_user, left(trim(coalesce(p_name, 'API key')), 80), prefix, digest, p_plan, lim)
  returning id into row_id;
  return jsonb_build_object(
    'id', row_id,
    'name', trim(coalesce(p_name, 'API key')),
    'plan', p_plan,
    'monthly_limit', lim,
    'key', raw_key,
    'warning', 'Copy this key now. It will not be shown again.'
  );
end;
$$;

create or replace function public.admin_list_api_keys()
returns table (
  id uuid,
  name text,
  key_prefix text,
  plan text,
  monthly_limit integer,
  disabled boolean,
  created_at timestamptz,
  last_used_at timestamptz,
  user_id uuid,
  period_yyyy_mm text,
  request_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  period text := to_char(timezone('utc', now()), 'YYYY-MM');
begin
  perform public.admin_assert();
  return query
  select
    k.id,
    k.name,
    k.key_prefix,
    k.plan,
    k.monthly_limit,
    k.disabled,
    k.created_at,
    k.last_used_at,
    k.user_id,
    period,
    coalesce(u.request_count, 0)
  from public.api_keys k
  left join public.api_key_usage u
    on u.key_id = k.id and u.period_yyyy_mm = period
  order by k.created_at desc;
end;
$$;

create or replace function public.admin_set_api_key_disabled(p_id uuid, p_disabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_assert();
  update public.api_keys set disabled = coalesce(p_disabled, true) where id = p_id;
end;
$$;

grant select on public.api_keys to authenticated;
grant select on public.api_key_usage to authenticated;
grant execute on function public.admin_create_api_key(text, text, uuid) to authenticated;
grant execute on function public.admin_list_api_keys() to authenticated;
grant execute on function public.admin_set_api_key_disabled(uuid, boolean) to authenticated;

-- Service role uses these for the public API gateway (bypasses RLS).
grant select, insert, update on public.api_keys to service_role;
grant select, insert, update on public.api_key_usage to service_role;
