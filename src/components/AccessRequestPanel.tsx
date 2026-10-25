import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ExternalLink, Loader2, Send } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { claimPaid, fetchMyRequest, requestAccess, type AccessRequest } from '../services/accessService';
import { timeAgo } from '../services/lastLocationService';

/** Host name of a link, so the customer can see where "Pay here" goes. */
function hostOf(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Lets a free customer ask the admin to switch on paid features, shows the payment link once the
 * admin has attached one, and lets the customer say they have paid.
 */
export const AccessRequestPanel: React.FC = () => {
  const [request, setRequest] = useState<AccessRequest | null | undefined>(undefined);
  const [agreed, setAgreed] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const { refreshProfile } = useAuth();
  const previousStatus = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await fetchMyRequest();
      // The admin closed the request: reload the plan so the paid features unlock without a refresh
      if (previousStatus.current === 'pending' && next?.status === 'done') void refreshProfile();
      previousStatus.current = next?.status ?? null;
      setRequest(next);
    } catch {
      setRequest((prev) => (prev === undefined ? null : prev));
    }
  }, [refreshProfile]);

  useEffect(() => {
    load();
  }, [load]);

  // While a request is open, check now and then so the payment link appears without a refresh
  const waiting = request?.status === 'pending';
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [waiting, load]);

  const send = async () => {
    setBusy(true);
    setError('');
    try {
      await requestAccess(note);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your request.');
    } finally {
      setBusy(false);
    }
  };

  const paid = async () => {
    setBusy(true);
    setError('');
    try {
      await claimPaid();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your confirmation.');
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
    // 3. The customer has said they paid
    if (request.paid_claimed_at) {
      return (
        <div role="status" className="flex items-start gap-2.5 p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-sm text-emerald-200">
          <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />
          <span>
            Thank you. You told the admin you paid {timeAgo(request.paid_claimed_at)}. Access switches on as soon as
            the admin has checked the payment. This page updates by itself.
          </span>
        </div>
      );
    }

    // 2. The admin has attached a payment link
    if (request.payment_link) {
      const host = hostOf(request.payment_link);
      return (
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-700 space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-100">Your payment link is ready</p>
              {request.price_note && <p className="text-sm text-slate-200">{request.price_note}</p>}
            </div>
            <a
              href={request.payment_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 h-11 px-5 text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-colors"
            >
              <span>Pay here</span>
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
            {host && <p className="text-xs text-slate-400">Opens {host} in a new tab.</p>}
          </div>

          <p className="text-sm text-slate-300">After you have paid, tell the admin so they can switch your access on.</p>
          {error && (
            <p role="alert" className="text-sm text-rose-300">
              {error}
            </p>
          )}
          <button
            onClick={paid}
            disabled={busy}
            className="w-full sm:w-auto flex items-center justify-center gap-2 h-11 px-5 text-sm font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 border border-slate-600 rounded-xl transition-colors"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Check className="w-4 h-4" aria-hidden="true" />}
            <span>I've paid</span>
          </button>
        </div>
      );
    }

    // 1. Request sent, waiting for the admin's payment link
    return (
      <div role="status" className="flex items-start gap-2.5 p-4 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-200">
        <Loader2 className="w-4 h-4 mt-0.5 shrink-0 animate-spin text-slate-400" aria-hidden="true" />
        <span>
          Request sent {timeAgo(request.created_at)}. The admin will send you a payment link here. This page updates
          by itself, so you can leave it open.
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
        <span className="text-sm text-slate-300">Message for the admin (optional)</span>
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
