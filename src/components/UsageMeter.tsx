import React from 'react';
import { Gauge } from 'lucide-react';
import { FREE_DAILY_LIMITS, getUsageQuota, type UsageFeature } from '../services/usageLimits';

interface UsageMeterProps {
  feature: UsageFeature;
  /** Hide entirely for paid users. */
  hasPaid: boolean;
  /** Bump after consumeUsage so the chip re-reads localStorage. */
  refreshKey?: number;
  className?: string;
}

const LABELS: Record<UsageFeature, string> = {
  phone_lookup: 'Phone lookups today',
  ip_lookup: 'IP lookups today',
  cell_resolve: 'Tower resolves today',
};

/** Compact free-tier remaining quota chip. */
export const UsageMeter: React.FC<UsageMeterProps> = ({ feature, hasPaid, refreshKey = 0, className = '' }) => {
  if (hasPaid) return null;
  void refreshKey; // force re-read when parent increments
  const q = getUsageQuota(feature);
  const limit = FREE_DAILY_LIMITS[feature];
  const pct = Math.min(100, Math.round((q.used / limit) * 100));
  const tight = q.remaining <= Math.max(2, Math.floor(limit * 0.15));

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
        tight
          ? 'border-amber-800/60 bg-amber-950/30 text-amber-200'
          : 'border-slate-800 bg-slate-900/80 text-slate-300'
      } ${className}`}
      role="status"
      aria-label={`${LABELS[feature]}: ${q.used} of ${limit}`}
    >
      <Gauge className={`h-3.5 w-3.5 shrink-0 ${tight ? 'text-amber-400' : 'text-cyan-400'}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">{LABELS[feature]}</span>
          <span className="font-mono tabular-nums">
            {q.used}/{limit}
          </span>
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all ${tight ? 'bg-amber-400' : 'bg-cyan-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
};
