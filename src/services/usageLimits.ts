/**
 * Client-side freemium usage limits for free / anonymous visitors.
 *
 * Paid users bypass these limits (see AuthContext.hasPaid). Counts are stored
 * in localStorage keyed by UTC day so a refresh cannot reset the quota forever;
 * a determined user can clear storage — that is expected for a client-side gate.
 * Wire a server-side check (Supabase RPC / edge function) before relying on this
 * for revenue protection.
 */

export type UsageFeature = 'phone_lookup' | 'ip_lookup' | 'cell_resolve';

export interface UsageQuota {
  feature: UsageFeature;
  used: number;
  limit: number;
  remaining: number;
  /** ISO date (UTC) the counters apply to. */
  day: string;
  /** True when the caller still has room for one more action. */
  allowed: boolean;
}

const STORAGE_KEY = 'geophone.usage.v1';

/** Daily free-tier caps. Paid / admin bypass entirely. */
export const FREE_DAILY_LIMITS: Record<UsageFeature, number> = {
  phone_lookup: 25,
  ip_lookup: 40,
  cell_resolve: 5,
};

interface DayBucket {
  day: string;
  counts: Partial<Record<UsageFeature, number>>;
  /** Deduped keys already counted today (e.g. E.164 numbers). */
  seen: Partial<Record<UsageFeature, string[]>>;
}

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyBucket(day = utcDay()): DayBucket {
  return { day, counts: {}, seen: {} };
}

function readBucket(): DayBucket {
  const today = utcDay();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyBucket(today);
    const parsed = JSON.parse(raw) as DayBucket;
    if (!parsed || parsed.day !== today) return emptyBucket(today);
    return {
      day: today,
      counts: parsed.counts ?? {},
      seen: parsed.seen ?? {},
    };
  } catch {
    return emptyBucket(today);
  }
}

function writeBucket(bucket: DayBucket): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bucket));
  } catch {
    /* storage blocked — limits become best-effort only */
  }
}

export function getUsageQuota(feature: UsageFeature): UsageQuota {
  const bucket = readBucket();
  const limit = FREE_DAILY_LIMITS[feature];
  const used = bucket.counts[feature] ?? 0;
  return {
    feature,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    day: bucket.day,
    allowed: used < limit,
  };
}

/**
 * Records one successful use. Returns the updated quota.
 * Pass `uniqueKey` (e.g. E.164) to count each distinct value once per day.
 */
export function consumeUsage(feature: UsageFeature, uniqueKey?: string): UsageQuota {
  const bucket = readBucket();
  const seenList = bucket.seen[feature] ?? [];
  if (uniqueKey) {
    const key = uniqueKey.trim().toLowerCase();
    if (key && seenList.includes(key)) {
      return getUsageQuota(feature);
    }
    if (key) {
      bucket.seen[feature] = [...seenList, key].slice(-500);
    }
  }
  const used = (bucket.counts[feature] ?? 0) + 1;
  bucket.counts[feature] = used;
  writeBucket(bucket);
  const limit = FREE_DAILY_LIMITS[feature];
  return {
    feature,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    day: bucket.day,
    allowed: used < limit,
  };
}

/** Soft check before starting work; does not increment. */
export function canUse(feature: UsageFeature, hasPaid: boolean, uniqueKey?: string): boolean {
  if (hasPaid) return true;
  if (uniqueKey) {
    const key = uniqueKey.trim().toLowerCase();
    const seen = readBucket().seen[feature] ?? [];
    if (key && seen.includes(key)) return true;
  }
  return getUsageQuota(feature).allowed;
}

export function usageLimitMessage(feature: UsageFeature): string {
  const q = getUsageQuota(feature);
  switch (feature) {
    case 'phone_lookup':
      return `Free plan: ${q.limit} phone lookups per day. You have used ${q.used}. Upgrade for unlimited carrier lookups and consent-based maps.`;
    case 'ip_lookup':
      return `Free plan: ${q.limit} IP lookups per day. You have used ${q.used}. Upgrade for higher limits.`;
    case 'cell_resolve':
      return `Free plan: ${q.limit} OpenCelliD / BeaconDB tower resolves per day. You have used ${q.used}. Paid access raises this cap.`;
    default: {
      const _exhaustive: never = feature;
      return String(_exhaustive);
    }
  }
}
