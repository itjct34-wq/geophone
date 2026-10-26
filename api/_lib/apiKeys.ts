/**
 * Public API key auth + monthly quota (free = 100 / calendar month UTC).
 */

import { createHash, timingSafeEqual } from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type ApiPlan = 'free' | 'pro' | 'business';

export const PLAN_LIMITS: Record<ApiPlan, number> = {
  free: 100,
  pro: 5000,
  business: 50000,
};

export interface ApiKeyRecord {
  id: string;
  plan: ApiPlan;
  monthly_limit: number;
  disabled: boolean;
  key_hash: string;
  key_prefix: string;
}

export interface QuotaResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetIso: string;
  period: string;
  key: ApiKeyRecord;
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

export function hashApiKey(raw: string): string {
  return createHash('sha256').update(raw.trim()).digest('hex');
}

export function currentPeriodUtc(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function periodResetIso(now = new Date()): string {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
  return next.toISOString();
}

function hashesEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/** Extract Bearer gp_… or X-Api-Key header. */
export function extractApiKey(headers: Record<string, string | string[] | undefined>): string | null {
  const auth = headers.authorization || headers.Authorization;
  const authVal = Array.isArray(auth) ? auth[0] : auth;
  if (authVal && /^Bearer\s+/i.test(authVal)) {
    const token = authVal.replace(/^Bearer\s+/i, '').trim();
    if (token.startsWith('gp_')) return token;
  }
  const x = headers['x-api-key'] || headers['X-Api-Key'];
  const xVal = Array.isArray(x) ? x[0] : x;
  if (xVal && xVal.trim().startsWith('gp_')) return xVal.trim();
  return null;
}

export async function consumeApiQuota(rawKey: string): Promise<
  | { ok: true; quota: QuotaResult }
  | { ok: false; status: number; error: string; quota?: QuotaResult }
> {
  const sb = getServiceClient();
  if (!sb) {
    return {
      ok: false,
      status: 503,
      error: 'API gateway is not configured (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).',
    };
  }

  const digest = hashApiKey(rawKey);

  // Prefer atomic RPC (closes concurrent TOCTOU bypass). Fall back if migration not applied yet.
  const { data: rpcData, error: rpcError } = await sb.rpc('consume_api_quota', { p_key_hash: digest });
  if (!rpcError && rpcData && typeof rpcData === 'object') {
    const row = rpcData as {
      ok?: boolean;
      status?: number;
      error?: string;
      limit?: number;
      remaining?: number;
      reset?: string;
      period?: string;
      plan?: ApiPlan;
      key_id?: string;
    };
    const period = row.period || currentPeriodUtc();
    const resetIso = row.reset || periodResetIso();
    const limit = row.limit || PLAN_LIMITS.free;
    const plan = row.plan || 'free';
    const key: ApiKeyRecord = {
      id: row.key_id || '',
      plan,
      monthly_limit: limit,
      disabled: false,
      key_hash: digest,
      key_prefix: rawKey.slice(0, 10),
    };
    const quota: QuotaResult = {
      allowed: Boolean(row.ok),
      limit,
      remaining: row.remaining ?? 0,
      resetIso,
      period,
      key,
    };
    if (!row.ok) {
      return {
        ok: false,
        status: row.status || 401,
        error: row.error || 'API key rejected.',
        quota,
      };
    }
    return { ok: true, quota };
  }

  // Legacy path (pre-migration): prefix lookup + non-atomic increment.
  const prefix = rawKey.slice(0, 10);
  const { data: rows, error } = await sb
    .from('api_keys')
    .select('id, plan, monthly_limit, disabled, key_hash, key_prefix')
    .eq('key_prefix', prefix)
    .limit(5);

  if (error) {
    return { ok: false, status: 503, error: 'Could not validate API key.' };
  }

  const match = (rows || []).find((r) => hashesEqual(String(r.key_hash), digest)) as
    | ApiKeyRecord
    | undefined;
  if (!match) {
    return { ok: false, status: 401, error: 'Invalid API key.' };
  }
  if (match.disabled) {
    return { ok: false, status: 403, error: 'API key is disabled.' };
  }

  const period = currentPeriodUtc();
  const resetIso = periodResetIso();
  const limit = match.monthly_limit || PLAN_LIMITS[match.plan] || 100;

  const { data: usageRow } = await sb
    .from('api_key_usage')
    .select('request_count')
    .eq('key_id', match.id)
    .eq('period_yyyy_mm', period)
    .maybeSingle();

  const used = usageRow?.request_count ?? 0;
  if (used >= limit) {
    return {
      ok: false,
      status: 429,
      error: `Monthly quota exceeded (${limit} requests). Upgrade plan or wait until ${resetIso}.`,
      quota: {
        allowed: false,
        limit,
        remaining: 0,
        resetIso,
        period,
        key: match,
      },
    };
  }

  const nextCount = used + 1;
  await sb.from('api_key_usage').upsert(
    { key_id: match.id, period_yyyy_mm: period, request_count: nextCount },
    { onConflict: 'key_id,period_yyyy_mm' },
  );
  await sb.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', match.id);

  return {
    ok: true,
    quota: {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - nextCount),
      resetIso,
      period,
      key: match,
    },
  };
}

export function setRateLimitHeaders(
  res: { setHeader: (name: string, value: string) => void },
  quota: QuotaResult,
) {
  res.setHeader('X-RateLimit-Limit', String(quota.limit));
  res.setHeader('X-RateLimit-Remaining', String(quota.remaining));
  res.setHeader('X-RateLimit-Reset', quota.resetIso);
}
