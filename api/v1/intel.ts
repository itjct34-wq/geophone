/**
 * Unified public API — one endpoint for all GeoPhone intel services.
 * POST /api/v1/intel
 * Auth: Authorization: Bearer gp_…  or  X-Api-Key: gp_…
 * Free plan: 100 requests / UTC calendar month (enforced in api/_lib/apiKeys.ts).
 */

import {
  consumeApiQuota,
  extractApiKey,
  setRateLimitHeaders,
  type QuotaResult,
} from '../_lib/apiKeys';
import { runIntel, type IntelType } from '../_lib/runIntel';

interface Req {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
}
interface Res {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void };
}

const TYPES: IntelType[] = ['phone', 'email', 'username', 'ip', 'domain', 'url', 'mac'];

function first(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) ?? '';
}

function parseBody(raw: unknown): {
  type?: string;
  value?: string;
  modules?: string[];
} {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as { type?: string; value?: string; modules?: string[] };
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object') return raw as { type?: string; value?: string; modules?: string[] };
  return {};
}

function withQuota(
  res: Res,
  quota: QuotaResult | undefined,
  status: number,
  body: unknown,
) {
  if (quota) setRateLimitHeaders(res, quota);
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(body);
}

export default async function handler(req: Req, res: Res) {
  const method = (req.method || 'GET').toUpperCase();

  if (method === 'GET') {
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.status(200).json({
      name: 'GeoPhone Public Intel API',
      endpoint: 'POST /api/v1/intel',
      auth: 'Authorization: Bearer gp_… or X-Api-Key: gp_…',
      free_monthly_limit: 100,
      types: TYPES,
      modules: ['phone', 'sherlock', 'holehe', 'ip', 'dns', 'mac'],
      docs: '/docs/PUBLIC_API.md',
      attribution: 'https://github.com/itjct34-wq/geophone',
    });
    return;
  }

  if (method !== 'POST') {
    res.status(405).json({ error: 'Use GET for discovery or POST for queries.' });
    return;
  }

  const headers = req.headers || {};
  const rawKey = extractApiKey(headers);
  if (!rawKey) {
    res.status(401).json({
      error: 'Missing API key. Send Authorization: Bearer gp_… or X-Api-Key.',
      free_monthly_limit: 100,
    });
    return;
  }

  const consumed = await consumeApiQuota(rawKey);
  if (!consumed.ok) {
    withQuota(res, consumed.quota, consumed.status, {
      error: consumed.error,
      free_monthly_limit: 100,
    });
    return;
  }

  const body = parseBody(req.body);
  const typeRaw = (body.type || first(req.query?.type) || '').toLowerCase();
  const value = (body.value || first(req.query?.q) || '').trim();
  const modules = body.modules;

  if (!TYPES.includes(typeRaw as IntelType)) {
    withQuota(res, consumed.quota, 400, {
      error: `type must be one of: ${TYPES.join(', ')}`,
    });
    return;
  }
  if (!value || value.length > 500) {
    withQuota(res, consumed.quota, 400, { error: 'Provide value (1–500 chars).' });
    return;
  }

  try {
    const result = await runIntel({
      type: typeRaw as IntelType,
      value,
      modules,
    });
    withQuota(res, consumed.quota, 200, {
      ok: true,
      plan: consumed.quota.key.plan,
      ...result,
      rate_limit: {
        limit: consumed.quota.limit,
        remaining: consumed.quota.remaining,
        reset: consumed.quota.resetIso,
        period: consumed.quota.period,
      },
    });
  } catch (err) {
    withQuota(res, consumed.quota, 502, {
      error: err instanceof Error ? err.message : 'Intel orchestration failed.',
    });
  }
}
