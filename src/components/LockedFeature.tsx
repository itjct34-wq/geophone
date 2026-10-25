import React from 'react';
import { Lock } from 'lucide-react';
import { AccessRequestPanel } from './AccessRequestPanel';

interface LockedFeatureProps {
  title: string;
  description: string;
  /** Show the request form inside the card. Off for small inline cards that link to the Plan tab. */
  compact?: boolean;
  onOpenPlan?: () => void;
}

/** Shown in place of a paid feature while the customer is on the free plan. */
export const LockedFeature: React.FC<LockedFeatureProps> = ({ title, description, compact, onOpenPlan }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
    <div className="flex items-start gap-3">
      <div className="p-2.5 rounded-lg bg-slate-800 text-slate-300 shrink-0">
        <Lock className="w-4 h-4" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h2 className="text-base font-bold text-slate-100">{title}</h2>
        <p className="text-sm text-slate-300 max-w-xl leading-relaxed">{description}</p>
      </div>
    </div>

    {compact ? (
      onOpenPlan && (
        <button
          onClick={onOpenPlan}
          className="h-10 px-4 text-sm font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
        >
          See the paid plan
        </button>
      )
    ) : (
      <AccessRequestPanel />
    )}
  </div>
);
