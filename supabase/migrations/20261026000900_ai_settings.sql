-- In-app AI provider settings (Groq / Ollama).
-- Secrets are never readable via direct table SELECT for authenticated clients;
-- admins use RPCs that return a masked key. Service role reads full values for /api/ai-brief.

create table if not exists public.ai_settings (
  id text primary key default 'default',
  groq_api_key text not null default '',
  groq_model text not null default 'llama-3.1-8b-instant',
  ollama_base_url text not null default 'http://localhost:11434',
  ollama_model text not null default 'llama3.2',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

insert into public.ai_settings (id) values ('default')
on conflict (id) do nothing;

alter table public.ai_settings enable row level security;

-- No policies for anon/authenticated: deny all direct table access.
-- Service role bypasses RLS for server-side AI brief reads.

revoke all on public.ai_settings from anon, authenticated;
grant select on public.ai_settings to service_role;
grant update on public.ai_settings to service_role;

create or replace function public.admin_get_ai_settings()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.ai_settings;
  key_len integer;
  masked text;
begin
  perform public.admin_assert();
  select * into row from public.ai_settings where id = 'default';
  if not found then
    insert into public.ai_settings (id) values ('default')
    returning * into row;
  end if;

  key_len := length(coalesce(row.groq_api_key, ''));
  if key_len = 0 then
    masked := null;
  elsif key_len <= 4 then
    masked := '••••';
  else
    masked := '••••' || right(row.groq_api_key, 4);
  end if;

  return jsonb_build_object(
    'groqConfigured', key_len > 0,
    'groqKeyMasked', masked,
    'groqModel', coalesce(nullif(trim(row.groq_model), ''), 'llama-3.1-8b-instant'),
    'ollamaBaseUrl', coalesce(nullif(trim(row.ollama_base_url), ''), 'http://localhost:11434'),
    'ollamaModel', coalesce(nullif(trim(row.ollama_model), ''), 'llama3.2'),
    'updatedAt', row.updated_at
  );
end;
$$;

create or replace function public.admin_set_ai_settings(
  p_groq_api_key text default null,
  p_groq_model text default null,
  p_ollama_base_url text default null,
  p_ollama_model text default null,
  p_clear_groq_key boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  next_key text;
  next_model text;
  next_base text;
  next_ollama_model text;
begin
  perform public.admin_assert();

  insert into public.ai_settings (id) values ('default')
  on conflict (id) do nothing;

  select
    groq_api_key,
    groq_model,
    ollama_base_url,
    ollama_model
  into next_key, next_model, next_base, next_ollama_model
  from public.ai_settings
  where id = 'default';

  if coalesce(p_clear_groq_key, false) then
    next_key := '';
  elsif p_groq_api_key is not null and length(trim(p_groq_api_key)) > 0 then
    next_key := left(trim(p_groq_api_key), 200);
  end if;

  if p_groq_model is not null and length(trim(p_groq_model)) > 0 then
    next_model := left(trim(p_groq_model), 120);
  end if;

  if p_ollama_base_url is not null and length(trim(p_ollama_base_url)) > 0 then
    next_base := left(trim(p_ollama_base_url), 300);
  end if;

  if p_ollama_model is not null and length(trim(p_ollama_model)) > 0 then
    next_ollama_model := left(trim(p_ollama_model), 120);
  end if;

  update public.ai_settings
  set
    groq_api_key = coalesce(next_key, ''),
    groq_model = coalesce(next_model, 'llama-3.1-8b-instant'),
    ollama_base_url = coalesce(next_base, 'http://localhost:11434'),
    ollama_model = coalesce(next_ollama_model, 'llama3.2'),
    updated_at = now(),
    updated_by = auth.uid()
  where id = 'default';

  return public.admin_get_ai_settings();
end;
$$;

grant execute on function public.admin_get_ai_settings() to authenticated;
grant execute on function public.admin_set_ai_settings(text, text, text, text, boolean) to authenticated;
