import React, { useState } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { acceptTerms } from '../services/accessService';

/**
 * Shown to a paid customer who has not yet accepted the current Terms. Location links
 * cannot be created until they agree (the database enforces this too).
 */
export const TermsGate: React.FC = () => {
  const { hasPaid, hasTerms, isAdmin, refreshProfile } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (isAdmin || !hasPaid || hasTerms) return null;

  const accept = async () => {
    setBusy(true);
    setError('');
    try {
      await acceptTerms();
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your agreement.');
      setBusy(false);
    }
  };

  return (
    <div className="mb-6 bg-amber-950/30 border border-amber-800/50 rounded-xl p-5 space-y-3">
      <div className="flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0 text-amber-300" aria-hidden="true" />
        <div className="space-y-1">
          <h2 className="text-base font-bold text-amber-100">One step before you send location links</h2>
          <p className="text-sm text-amber-100/90 leading-relaxed">
            Please read and accept the{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Terms of Use</a>{' '}
            and{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Privacy Policy</a>.
            They cover consent, what is kept, and for how long.
          </p>
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer pl-8">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-400"
        />
        <span className="text-sm text-amber-100">
          I agree to the Terms and Privacy Policy, and I will only ask people who agree to share their location.
        </span>
      </label>

      {error && <p role="alert" className="text-sm text-rose-300 pl-8">{error}</p>}

      <div className="pl-8">
        <button
          onClick={accept}
          disabled={!agreed || busy}
          className="inline-flex items-center justify-center gap-2 h-11 px-5 text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:bg-slate-800 disabled:text-slate-500 rounded-xl transition-colors"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          <span>Agree and continue</span>
        </button>
      </div>
    </div>
  );
};
