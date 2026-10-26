/**
 * Resolve Groq / Ollama config: Supabase ai_settings (service role) first, then process.env.
 * Never expose raw keys to the browser — callers use this only on the server.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type AiConfigSource = 'db' | 'env' | 'none';

export interface AiRuntimeConfig {
  groqApiKey: string;
  groqModel: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
  groqSource: AiConfigSource;
  ollamaSource: AiConfigSource;
}

interface AiSettingsRow {
  groq_api_key?: string | null;
  groq_model?: string | null;
  ollama_base_url?: string | null;
  ollama_model?: string | null;
}

let client: SupabaseClient | null = null;

function getServiceClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

function pick(dbVal: string | null | undefined, envVal: string | undefined, fallback: string): {
  value: string;
  source: AiConfigSource;
} {
  const fromDb = (dbVal || '').trim();
  if (fromDb) return { value: fromDb, source: 'db' };
  const fromEnv = (envVal || '').trim();
  if (fromEnv) return { value: fromEnv, source: 'env' };
  return { value: fallback, source: 'none' };
}

async function loadDbRow(): Promise<AiSettingsRow | null> {
  const sb = getServiceClient();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from('ai_settings')
      .select('groq_api_key, groq_model, ollama_base_url, ollama_model')
      .eq('id', 'default')
      .maybeSingle();
    if (error || !data) return null;
    return data as AiSettingsRow;
  } catch {
    return null;
  }
}

export async function resolveAiConfig(): Promise<AiRuntimeConfig> {
  const row = await loadDbRow();

  const groqKey = pick(row?.groq_api_key, process.env.GROQ_API_KEY, '');
  const groqModel = pick(row?.groq_model, process.env.GROQ_MODEL, 'llama-3.1-8b-instant');
  const ollamaBase = pick(row?.ollama_base_url, process.env.OLLAMA_BASE_URL, 'http://localhost:11434');
  const ollamaModel = pick(row?.ollama_model, process.env.OLLAMA_MODEL, 'llama3.2');

  return {
    groqApiKey: groqKey.value,
    groqModel: groqModel.value,
    ollamaBaseUrl: ollamaBase.value.replace(/\/$/, ''),
    ollamaModel: ollamaModel.value,
    groqSource: groqKey.value ? groqKey.source : 'none',
    ollamaSource:
      ollamaBase.source === 'db' || ollamaModel.source === 'db'
        ? 'db'
        : ollamaBase.source === 'env' || ollamaModel.source === 'env'
          ? 'env'
          : 'none',
  };
}

export function maskSecret(value: string): string | null {
  const v = (value || '').trim();
  if (!v) return null;
  if (v.length <= 4) return '••••';
  return `••••${v.slice(-4)}`;
}
