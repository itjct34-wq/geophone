-- GeoPhone access control: profiles, upgrade requests, reports, admin RPCs.
-- Required for the in-app Customers admin tab (profiles.role = 'admin').

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'customer' check (role in ('admin', 'customer')),
  plan text not null default 'free' check (plan in ('free', 'paid')),
  paid_until timestamptz,
  disabled boolean not null default false,
  terms_version text,
  terms_agreed_at timestamptz,
  daily_link_limit integer not null default 10 check (daily_link_limit >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'done')),
  note text not null default '',
  payment_link text,
  price_note text not null default '',
  paid_claimed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists upgrade_requests_one_open_per_user
  on public.upgrade_requests (user_id)
  where status = 'pending';

create table if not exists public.lookup_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  raw_input text not null,
  e164 text,
  carrier text,
  region text,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

create table if not exists public.batch_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  numbers jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.share_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  token text not null unique,
  label text not null default '',
  requested_by text not null default '',
  phone_e164 text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  ended_at timestamptz,
  started_at timestamptz,
  last_lat double precision,
  last_lng double precision,
  last_accuracy double precision,
  last_at timestamptz,
  shared_info jsonb
);

create table if not exists public.blocked_numbers (
  phone_e164 text primary key,
  reason text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.link_reports (
  id uuid primary key default gen_random_uuid(),
  share_id uuid references public.share_sessions (id) on delete set null,
  owner_user_id uuid references auth.users (id) on delete set null,
  email text,
  phone_e164 text,
  reason text not null default '',
  blocked boolean not null default false,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- Design-system preferences editable from the Impeccable admin panel.
create table if not exists public.design_settings (
  id text primary key default 'default',
  brand_name text not null default 'GeoPhone',
  tagline text not null default 'Consent-based phone intelligence',
  primary_color text not null default '#22d3ee',
  accent_color text not null default '#34d399',
  surface_mode text not null default 'operate' check (surface_mode in ('persuade', 'operate', 'read', 'experience')),
  notes text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

insert into public.design_settings (id) values ('default')
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.upgrade_requests enable row level security;
alter table public.lookup_history enable row level security;
alter table public.batch_lists enable row level security;
alter table public.share_sessions enable row level security;
alter table public.blocked_numbers enable row level security;
alter table public.link_reports enable row level security;
alter table public.design_settings enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'admin'
      and p.disabled = false
  );
$$;

create or replace function public.has_paid_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.disabled = false
      and (
        p.role = 'admin'
        or (p.plan = 'paid' and p.paid_until is not null and p.paid_until > now())
      )
  );
$$;

create or replace function public.current_terms_version()
returns text
language sql
immutable
as $$
  select '2026-10-25'::text;
$$;

create or replace function public.admin_assert()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;
  if exists (
    select 1
    from auth.mfa_factors f
    where f.user_id = auth.uid()
      and f.status = 'verified'
      and f.factor_type = 'totp'
  ) then
    if coalesce(auth.jwt() ->> 'aal', 'aal1') is distinct from 'aal2' then
      raise exception 'Two-step login required';
    end if;
  end if;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, role, plan)
  values (new.id, 'customer', 'free')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for existing auth users.
insert into public.profiles (user_id, role, plan)
select u.id, 'customer', 'free'
from auth.users u
on conflict (user_id) do nothing;

-- Elevate the product owner.
update public.profiles
set role = 'admin', plan = 'paid', paid_until = null, disabled = false
where user_id = (
  select id from auth.users where lower(email) = lower('itjct34@gmail.com') limit 1
);

create or replace function public.accept_terms(p_version text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;
  if p_version is distinct from public.current_terms_version() then
    raise exception 'Terms version is out of date';
  end if;
  update public.profiles
  set terms_version = p_version, terms_agreed_at = now()
  where user_id = auth.uid();
end;
$$;

create or replace function public.claim_paid()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated int;
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;
  update public.upgrade_requests
  set paid_claimed_at = now()
  where user_id = auth.uid()
    and status = 'pending'
    and payment_link is not null
    and paid_claimed_at is null;
  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

create or replace function public.admin_list_customers()
returns table (
  user_id uuid,
  email text,
  role text,
  plan text,
  paid_until timestamptz,
  disabled boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  links bigint,
  lookups bigint,
  request_note text,
  requested_at timestamptz,
  payment_link text,
  price_note text,
  paid_claimed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_assert();
  return query
  select
    p.user_id,
    coalesce(u.email, '')::text,
    p.role,
    p.plan,
    p.paid_until,
    p.disabled,
    p.created_at,
    u.last_sign_in_at,
    (select count(*) from public.share_sessions s where s.user_id = p.user_id),
    (select count(*) from public.lookup_history h where h.user_id = p.user_id),
    ur.note,
    ur.created_at,
    ur.payment_link,
    ur.price_note,
    ur.paid_claimed_at
  from public.profiles p
  join auth.users u on u.id = p.user_id
  left join lateral (
    select r.note, r.created_at, r.payment_link, r.price_note, r.paid_claimed_at
    from public.upgrade_requests r
    where r.user_id = p.user_id and r.status = 'pending'
    order by r.created_at desc
    limit 1
  ) ur on true
  order by
    case when ur.created_at is not null then 0 else 1 end,
    p.created_at desc;
end;
$$;

create or replace function public.admin_set_access(
  p_user uuid,
  p_plan text,
  p_days integer,
  p_disabled boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  until_at timestamptz;
begin
  perform public.admin_assert();
  if p_plan not in ('free', 'paid') then
    raise exception 'Invalid plan';
  end if;
  if p_plan = 'paid' and coalesce(p_days, 0) > 0 then
    until_at := now() + make_interval(days => p_days);
  else
    until_at := null;
  end if;
  update public.profiles
  set
    plan = p_plan,
    paid_until = case when p_plan = 'paid' then until_at else null end,
    disabled = coalesce(p_disabled, false)
  where user_id = p_user;

  if p_plan = 'paid' then
    update public.upgrade_requests
    set status = 'done'
    where user_id = p_user and status = 'pending';
  end if;
end;
$$;

create or replace function public.admin_set_payment_link(
  p_user uuid,
  p_link text,
  p_price text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_assert();
  if p_link is null or p_link !~* '^https://\S+$' then
    raise exception 'Payment link must be an https URL';
  end if;
  update public.upgrade_requests
  set payment_link = trim(p_link), price_note = coalesce(trim(p_price), '')
  where user_id = p_user and status = 'pending';
  if not found then
    insert into public.upgrade_requests (user_id, note, payment_link, price_note)
    values (p_user, '', trim(p_link), coalesce(trim(p_price), ''));
  end if;
end;
$$;

create or replace function public.admin_list_reports()
returns table (
  id uuid,
  email text,
  phone_e164 text,
  reason text,
  blocked boolean,
  resolved boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_assert();
  return query
  select r.id, r.email, r.phone_e164, r.reason, r.blocked, r.resolved, r.created_at
  from public.link_reports r
  order by r.resolved asc, r.created_at desc
  limit 200;
end;
$$;

create or replace function public.admin_resolve_report(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_assert();
  update public.link_reports set resolved = true where id = p_id;
end;
$$;

create or replace function public.admin_get_design_settings()
returns public.design_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.design_settings;
begin
  perform public.admin_assert();
  select * into row from public.design_settings where id = 'default';
  return row;
end;
$$;

create or replace function public.admin_set_design_settings(
  p_brand_name text,
  p_tagline text,
  p_primary_color text,
  p_accent_color text,
  p_surface_mode text,
  p_notes text
)
returns public.design_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.design_settings;
begin
  perform public.admin_assert();
  if p_surface_mode not in ('persuade', 'operate', 'read', 'experience') then
    raise exception 'Invalid surface mode';
  end if;
  update public.design_settings
  set
    brand_name = left(trim(coalesce(p_brand_name, 'GeoPhone')), 80),
    tagline = left(trim(coalesce(p_tagline, '')), 200),
    primary_color = left(trim(coalesce(p_primary_color, '#22d3ee')), 32),
    accent_color = left(trim(coalesce(p_accent_color, '#34d399')), 32),
    surface_mode = p_surface_mode,
    notes = left(coalesce(p_notes, ''), 4000),
    updated_at = now(),
    updated_by = auth.uid()
  where id = 'default'
  returning * into row;
  return row;
end;
$$;

-- Minimal share RPCs so consent links work against this project.
create or replace function public.share_info(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.share_sessions;
begin
  select * into s from public.share_sessions where token = p_token;
  if not found then
    return jsonb_build_object('state', 'invalid');
  end if;
  if s.ended_at is not null then
    return jsonb_build_object('state', 'ended', 'requested_by', s.requested_by, 'expires_at', s.expires_at);
  end if;
  if s.expires_at <= now() then
    return jsonb_build_object('state', 'expired', 'requested_by', s.requested_by, 'expires_at', s.expires_at);
  end if;
  return jsonb_build_object('state', 'active', 'requested_by', s.requested_by, 'expires_at', s.expires_at);
end;
$$;

create or replace function public.share_post(
  p_token text,
  p_lat double precision,
  p_lng double precision,
  p_accuracy double precision
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.share_sessions
  set
    last_lat = p_lat,
    last_lng = p_lng,
    last_accuracy = p_accuracy,
    last_at = now(),
    started_at = coalesce(started_at, now())
  where token = p_token
    and ended_at is null
    and expires_at > now();
  return found;
end;
$$;

create or replace function public.share_stop(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.share_sessions
  set ended_at = now()
  where token = p_token and ended_at is null;
end;
$$;

create or replace function public.share_set_info(p_token text, p_info jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.share_sessions
  set shared_info = coalesce(p_info, '{}'::jsonb)
  where token = p_token
    and ended_at is null
    and expires_at > now();
  return found;
end;
$$;

create or replace function public.report_link(p_token text, p_block boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.share_sessions;
  owner_email text;
begin
  select * into s from public.share_sessions where token = p_token;
  if not found then
    raise exception 'Link not found';
  end if;
  select email into owner_email from auth.users where id = s.user_id;
  insert into public.link_reports (share_id, owner_user_id, email, phone_e164, reason, blocked)
  values (s.id, s.user_id, owner_email, s.phone_e164, coalesce(left(p_reason, 500), ''), coalesce(p_block, false));
  if coalesce(p_block, false) and s.phone_e164 is not null then
    insert into public.blocked_numbers (phone_e164, reason)
    values (s.phone_e164, coalesce(left(p_reason, 500), 'opt-out'))
    on conflict (phone_e164) do update set reason = excluded.reason;
  end if;
end;
$$;

-- RLS policies
drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users update own non-role profile" on public.profiles;
create policy "Users update own non-role profile"
  on public.profiles for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own upgrade requests" on public.upgrade_requests;
create policy "Users manage own upgrade requests"
  on public.upgrade_requests for all to authenticated
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users own lookup history" on public.lookup_history;
create policy "Users own lookup history"
  on public.lookup_history for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users own batch lists" on public.batch_lists;
create policy "Users own batch lists"
  on public.batch_lists for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users own share sessions" on public.share_sessions;
create policy "Users own share sessions"
  on public.share_sessions for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Admins read reports" on public.link_reports;
create policy "Admins read reports"
  on public.link_reports for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins read blocked numbers" on public.blocked_numbers;
create policy "Admins read blocked numbers"
  on public.blocked_numbers for select to authenticated
  using (public.is_admin());

drop policy if exists "Anyone can read design settings" on public.design_settings;
create policy "Anyone can read design settings"
  on public.design_settings for select to authenticated, anon
  using (true);

drop policy if exists "Admins update design settings" on public.design_settings;
create policy "Admins update design settings"
  on public.design_settings for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update on public.upgrade_requests to authenticated;
grant select, insert, delete on public.lookup_history to authenticated;
grant select, insert, delete on public.batch_lists to authenticated;
grant select, insert, update, delete on public.share_sessions to authenticated;
grant select on public.link_reports to authenticated;
grant select on public.blocked_numbers to authenticated;
grant select on public.design_settings to anon, authenticated;
grant update on public.design_settings to authenticated;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.has_paid_access() to authenticated;
grant execute on function public.current_terms_version() to authenticated, anon;
grant execute on function public.accept_terms(text) to authenticated;
grant execute on function public.claim_paid() to authenticated;
grant execute on function public.admin_list_customers() to authenticated;
grant execute on function public.admin_set_access(uuid, text, integer, boolean) to authenticated;
grant execute on function public.admin_set_payment_link(uuid, text, text) to authenticated;
grant execute on function public.admin_list_reports() to authenticated;
grant execute on function public.admin_resolve_report(uuid) to authenticated;
grant execute on function public.admin_get_design_settings() to authenticated;
grant execute on function public.admin_set_design_settings(text, text, text, text, text, text) to authenticated;
grant execute on function public.share_info(text) to anon, authenticated;
grant execute on function public.share_post(text, double precision, double precision, double precision) to anon, authenticated;
grant execute on function public.share_stop(text) to anon, authenticated;
grant execute on function public.share_set_info(text, jsonb) to anon, authenticated;
grant execute on function public.report_link(text, boolean, text) to anon, authenticated;
