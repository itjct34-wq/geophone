import React, { useEffect, useState } from 'react';
import { Check, Loader2, Send } from 'lucide-react';
import { fetchMyRequest, requestAccess, type AccessRequest } from '../services/accessService';
import { timeAgo } from '../services/lastLocationService';

/** Lets a free customer ask the admin to switch on paid features. */
export const AccessRequestPanel: React.FC = () => {
  const [request, setRequest] = useState<AccessRequest | null | undefined>(undefined);
  const [agreed, setAgreed] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyRequest()
      .then(setRequest)
      .catch(() => setRequest(null));
  }, []);

  const send = async () => {
    setBusy(true);
    setError('');
    try {
      await requestAccess(note);
      setRequest(await fetchMyRequest());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your request.');
    } finally {
      setBusy(false);
    }
  };

  if (request === undefined) {
    return (
      <div role="status" aria-label="Loading" className="py-2 text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
      </div>
    );
  }

  if (request?.status === 'pending') {
    return (
      <div role="status" className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-sm text-emerald-200">
        <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />
        <span>
          Request sent {timeAgo(request.created_at)}. The admin will switch on your access once your payment is
          confirmed, and these features unlock the next time this page refreshes.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-400"
        />
        <span className="text-sm text-slate-200">
          I will only ask people who agree to share their location with me.
        </span>
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm text-slate-300">Message for the admin (optional, for example a payment reference)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={2}
          className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500"
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-rose-300">
          {error}
        </p>
      )}

      <button
        onClick={send}
        disabled={!agreed || busy}
        className="w-full sm:w-auto flex items-center justify-center gap-2 h-11 px-5 text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:bg-slate-800 disabled:text-slate-500 rounded-xl transition-colors"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Send className="w-4 h-4" aria-hidden="true" />}
        <span>Request access</span>
      </button>
    </div>
  );
};
