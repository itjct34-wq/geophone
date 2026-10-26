/**
 * Lightweight in-memory IP rate limit for unauthenticated proxy routes.
 * Best-effort on serverless (per-instance); still blocks burst abuse.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function checkIpRateLimit(
  ip: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const key = (ip || 'unknown').slice(0, 64);
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  // Opportunistic cleanup
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.resetAt <= now) buckets.delete(k);
    }
  }
  return { ok: true };
}

export function clientIpFromHeaders(
  headers: Record<string, string | string[] | undefined> | undefined,
): string {
  if (!headers) return 'unknown';
  const xf = headers['x-forwarded-for'] || headers['X-Forwarded-For'];
  const raw = Array.isArray(xf) ? xf[0] : xf;
  if (raw) return raw.split(',')[0]?.trim() || 'unknown';
  const real = headers['x-real-ip'] || headers['X-Real-Ip'];
  const realVal = Array.isArray(real) ? real[0] : real;
  return realVal?.trim() || 'unknown';
}
