import React from 'react';
import { Lock, LogIn } from 'lucide-react';
import { AccessRequestPanel } from './AccessRequestPanel';
import { useAuth } from '../auth/AuthContext';

interface LockedFeatureProps {
  title: string;
  description: string;
  /** Show the request form inside the card. Off for small inline cards that link to the Plan tab. */
  compact?: boolean;
  onOpenPlan?: () => void;
  /** Called when a logged-out visitor chooses to sign in to get access. */
  onSignIn?: () => void;
}

/** Shown in place of a paid feature while the visitor is logged out or on the free plan. */
export const LockedFeature: React.FC<LockedFeatureProps> = ({ title, description, compact, onOpenPlan, onSignIn }) => {
  const { user } = useAuth();
  return (
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

      {!user ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-300">Create a free account or sign in to request paid access.</p>
          <button
            onClick={onSignIn}
            className="inline-flex items-center gap-2 h-10 px-4 text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors"
          >
            <LogIn className="w-4 h-4" aria-hidden="true" />
            Sign in to get access
          </button>
        </div>
      ) : compact ? (
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
};
