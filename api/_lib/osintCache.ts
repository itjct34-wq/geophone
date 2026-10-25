/**
 * Supabase-backed OSINT response cache for Vercel / Vite API routes.
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (never expose to browser).
 */

import { createHash } from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_TTL_SEC = 24 * 60 * 60;

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

export function hashTarget(provider: string, target: string): string {
  return createHash('sha256')
    .update(`${provider}:${target.trim().toLowerCase()}`)
    .digest('hex');
}

export function previewTarget(target: string, max = 120): string {
  const t = target.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

export async function cacheGet(
  provider: string,
  target: string,
): Promise<{ hit: true; payload: unknown; expires_at: string } | { hit: false }> {
  const sb = getServiceClient();
  if (!sb) return { hit: false };
  const target_hash = hashTarget(provider, target);
  try {
    const { data, error } = await sb
      .from('osint_cache')
      .select('payload, expires_at')
      .eq('provider', provider)
      .eq('target_hash', target_hash)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (error || !data) return { hit: false };
    return { hit: true, payload: data.payload, expires_at: data.expires_at as string };
  } catch {
    return { hit: false };
  }
}

export async function cacheSet(
  provider: string,
  target: string,
  payload: unknown,
  ttlSec = DEFAULT_TTL_SEC,
): Promise<void> {
  const sb = getServiceClient();
  if (!sb) return;
  const target_hash = hashTarget(provider, target);
  const expires_at = new Date(Date.now() + ttlSec * 1000).toISOString();
  try {
    await sb.from('osint_cache').upsert(
      {
        provider,
        target_hash,
        target_preview: previewTarget(target),
        payload,
        expires_at,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'provider,target_hash' },
    );
  } catch {
    /* cache write failures must not break lookups */
  }
}

/** Fetch with cache: returns payload and whether it was a cache hit. */
export async function cachedFetch(
  provider: string,
  target: string,
  fetcher: () => Promise<unknown>,
  ttlSec = DEFAULT_TTL_SEC,
): Promise<{ cached: boolean; payload: unknown }> {
  const existing = await cacheGet(provider, target);
  if (existing.hit) {
    return { cached: true, payload: existing.payload };
  }
  const payload = await fetcher();
  await cacheSet(provider, target, payload, ttlSec);
  return { cached: false, payload };
}
