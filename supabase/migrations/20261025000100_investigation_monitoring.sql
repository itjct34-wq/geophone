create table if not exists public.investigation_targets (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 label text not null check (char_length(label) between 1 and 160),
 target_type text not null check (target_type in ('domain','ip','phone','username')),
 target_value text not null check (char_length(target_value) between 1 and 253),
 monitor_enabled boolean not null default false,
 frequency_minutes integer check (frequency_minutes is null or frequency_minutes in (60,360,1440,10080)),
 next_run_at timestamptz, last_run_at timestamptz, last_status text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint scheduled_supported_types check (not monitor_enabled or target_type in ('domain','ip')),
 constraint scheduled_frequency_required check (not monitor_enabled or frequency_minutes is not null)
);
create index if not exists investigation_targets_due_idx on public.investigation_targets(next_run_at) where monitor_enabled=true;
create index if not exists investigation_targets_user_idx on public.investigation_targets(user_id,created_at desc);
create table if not exists public.monitoring_runs (
 id uuid primary key default gen_random_uuid(),
 target_id uuid not null references public.investigation_targets(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 status text not null check (status in ('ok','not_found','error')),
 summary text not null check (char_length(summary)<=2000),
 details jsonb not null default '{}'::jsonb, checked_at timestamptz not null default now()
);
create index if not exists monitoring_runs_user_idx on public.monitoring_runs(user_id,checked_at desc);
alter table public.investigation_targets enable row level security;
alter table public.monitoring_runs enable row level security;
revoke all on public.investigation_targets from anon,authenticated;
grant select,insert,update,delete on public.investigation_targets to authenticated;
revoke all on public.monitoring_runs from anon,authenticated;
grant select on public.monitoring_runs to authenticated;
drop policy if exists "Users read own investigation targets" on public.investigation_targets;
create policy "Users read own investigation targets" on public.investigation_targets for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "Users create own investigation targets" on public.investigation_targets;
create policy "Users create own investigation targets" on public.investigation_targets for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists "Users update own investigation targets" on public.investigation_targets;
create policy "Users update own investigation targets" on public.investigation_targets for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "Users delete own investigation targets" on public.investigation_targets;
create policy "Users delete own investigation targets" on public.investigation_targets for delete to authenticated using ((select auth.uid())=user_id);
drop policy if exists "Users read own monitoring runs" on public.monitoring_runs;
create policy "Users read own monitoring runs" on public.monitoring_runs for select to authenticated using ((select auth.uid())=user_id);
create or replace function public.set_investigation_target_updated_at() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists set_investigation_target_updated_at on public.investigation_targets;
create trigger set_investigation_target_updated_at before update on public.investigation_targets for each row execute function public.set_investigation_target_updated_at();

-- Edge worker uses the service role (bypasses RLS) to write run history and advance schedules.
grant select, insert, update on public.investigation_targets to service_role;
grant select, insert on public.monitoring_runs to service_role;

-- Ensure PostgREST picks up the new relations immediately after this migration.
notify pgrst, 'reload schema';
