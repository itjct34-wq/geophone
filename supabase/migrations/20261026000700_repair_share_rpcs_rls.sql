-- Repair incomplete profiles_admin apply: missing tables, share RPCs, terms RPCs, profiles RLS.

create table if not exists public.batch_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  numbers jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.blocked_numbers (
  phone_e164 text primary key,
  reason text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.batch_lists enable row level security;
alter table public.blocked_numbers enable row level security;

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
grant execute on function public.share_info(text) to anon, authenticated;
grant execute on function public.share_post(text, double precision, double precision, double precision) to anon, authenticated;
grant execute on function public.share_stop(text) to anon, authenticated;
grant execute on function public.share_set_info(text, jsonb) to anon, authenticated;
grant execute on function public.report_link(text, boolean, text) to anon, authenticated;
