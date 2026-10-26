-- Security hardening: lock privileged profile columns; atomic API quota; stronger share tokens.

-- 1) Prevent privilege escalation via profiles UPDATE (RLS alone still allows setting role/plan).
create or replace function public.profiles_lock_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  -- Non-admins may only touch terms fields (accept_terms RPC is preferred).
  new.role := old.role;
  new.plan := old.plan;
  new.paid_until := old.paid_until;
  new.disabled := old.disabled;
  new.daily_link_limit := old.daily_link_limit;
  new.user_id := old.user_id;
  return new;
end;
$$;

drop trigger if exists profiles_lock_privileged_columns on public.profiles;
create trigger profiles_lock_privileged_columns
  before update on public.profiles
  for each row
  execute function public.profiles_lock_privileged_columns();

-- 2) Atomic monthly quota consume (closes TOCTOU race on concurrent /api/v1/intel).
create or replace function public.consume_api_quota(p_key_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  k public.api_keys;
  period text := to_char(timezone('utc', now()), 'YYYY-MM');
  used integer := 0;
  lim integer;
  next_count integer;
  reset_at timestamptz := date_trunc('month', timezone('utc', now())) + interval '1 month';
begin
  if p_key_hash is null or char_length(p_key_hash) < 32 then
    return jsonb_build_object('ok', false, 'status', 401, 'error', 'Invalid API key.');
  end if;

  select * into k from public.api_keys where key_hash = p_key_hash limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'status', 401, 'error', 'Invalid API key.');
  end if;
  if k.disabled then
    return jsonb_build_object('ok', false, 'status', 403, 'error', 'API key is disabled.');
  end if;

  lim := coalesce(nullif(k.monthly_limit, 0), 100);

  insert into public.api_key_usage (key_id, period_yyyy_mm, request_count)
  values (k.id, period, 1)
  on conflict (key_id, period_yyyy_mm)
  do update set request_count = public.api_key_usage.request_count + 1
  where public.api_key_usage.request_count < lim
  returning request_count into next_count;

  if next_count is null then
    select request_count into used
    from public.api_key_usage
    where key_id = k.id and period_yyyy_mm = period;
    return jsonb_build_object(
      'ok', false,
      'status', 429,
      'error', format('Monthly quota exceeded (%s requests).', lim),
      'limit', lim,
      'remaining', 0,
      'reset', reset_at,
      'period', period,
      'plan', k.plan,
      'key_id', k.id
    );
  end if;

  update public.api_keys set last_used_at = now() where id = k.id;

  return jsonb_build_object(
    'ok', true,
    'status', 200,
    'limit', lim,
    'remaining', greatest(lim - next_count, 0),
    'reset', reset_at,
    'period', period,
    'plan', k.plan,
    'key_id', k.id
  );
end;
$$;

revoke all on function public.consume_api_quota(text) from public, anon, authenticated;
grant execute on function public.consume_api_quota(text) to service_role;

-- 3) Prefer longer tokens for new rows (RPC already rejects <12). Skip ALTER if legacy short tokens exist.
do $$
begin
  begin
    alter table public.permission_lab_campaigns
      drop constraint if exists permission_lab_campaigns_token_len;
    alter table public.permission_lab_campaigns
      add constraint permission_lab_campaigns_token_len check (char_length(token) between 12 and 80);
  exception when others then
    null;
  end;
end;
$$;

-- 4) Harden share_info / permission_lab_info against empty / tiny tokens.
create or replace function public.share_info(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.share_sessions;
begin
  if p_token is null or char_length(p_token) < 12 then
    return jsonb_build_object('state', 'invalid');
  end if;
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
  if p_token is null or char_length(p_token) < 12 then
    return false;
  end if;
  if p_lat is null or p_lng is null then
    return false;
  end if;
  if p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then
    return false;
  end if;
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

create or replace function public.permission_lab_info(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.permission_lab_campaigns;
begin
  if p_token is null or char_length(p_token) < 12 then
    return jsonb_build_object('state', 'invalid');
  end if;

  select * into c from public.permission_lab_campaigns where token = p_token;
  if not found then
    return jsonb_build_object('state', 'invalid');
  end if;
  if c.ended_at is not null then
    return jsonb_build_object('state', 'ended', 'label', c.label);
  end if;
  if c.expires_at <= now() then
    return jsonb_build_object('state', 'expired', 'label', c.label);
  end if;

  return jsonb_build_object(
    'state', 'active',
    'label', c.label,
    'expires_at', c.expires_at
  );
end;
$$;

create or replace function public.permission_lab_submit(p_token text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.permission_lab_campaigns;
  cleaned jsonb;
  snap text;
  new_id uuid;
  v_lat double precision;
  v_lng double precision;
  v_acc double precision;
  v_ip text;
  v_ua text;
begin
  if p_token is null or char_length(p_token) < 12 then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'invalid_payload');
  end if;

  select * into c from public.permission_lab_campaigns where token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;
  if c.ended_at is not null or c.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'inactive');
  end if;

  cleaned := p_payload - 'discord' - 'webhook' - 'webhook_url';

  snap := cleaned ->> 'camera_snapshot_jpeg_base64';
  if snap is not null then
    -- Reject non-base64 / script-smuggling payloads; keep only safe JPEG base64.
    if snap !~ '^[A-Za-z0-9+/=\s]+$' or char_length(snap) > 180000 then
      cleaned := cleaned - 'camera_snapshot_jpeg_base64';
      cleaned := cleaned || jsonb_build_object('camera_snapshot_truncated', true);
    end if;
  end if;

  begin
    v_lat := nullif(cleaned #>> '{gps,latitude}', '')::double precision;
    v_lng := nullif(cleaned #>> '{gps,longitude}', '')::double precision;
    v_acc := nullif(cleaned #>> '{gps,accuracy}', '')::double precision;
  exception when others then
    v_lat := null;
    v_lng := null;
    v_acc := null;
  end;

  v_ip := left(coalesce(cleaned ->> 'public_ip', cleaned #>> '{ip,query}', ''), 64);
  v_ua := left(coalesce(cleaned #>> '{device,userAgent}', ''), 512);

  insert into public.permission_lab_events (
    campaign_id, lat, lng, accuracy, client_ip, user_agent, payload
  ) values (
    c.id, v_lat, v_lng, v_acc, nullif(v_ip, ''), nullif(v_ua, ''), cleaned
  )
  returning id into new_id;

  return jsonb_build_object('ok', true, 'id', new_id);
end;
$$;

notify pgrst, 'reload schema';
