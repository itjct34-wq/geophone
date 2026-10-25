import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { adminListCustomers, adminSetAccess, adminSetPaymentLink, type CustomerRow } from '../services/accessService';
import { timeAgo } from '../services/lastLocationService';

function accessLabel(c: CustomerRow, now = Date.now()): { text: string; tone: string } {
  if (c.role === 'admin') return { text: 'Admin', tone: 'text-cyan-200 bg-cyan-500/15 border-cyan-500/30' };
  if (c.disabled) return { text: 'Switched off', tone: 'text-rose-200 bg-rose-500/15 border-rose-500/30' };
  if (c.plan === 'paid' && c.paid_until) {
    const end = new Date(c.paid_until);
    return end.getTime() > now
      ? {
          text: `Paid until ${end.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`,
          tone: 'text-emerald-200 bg-emerald-500/15 border-emerald-500/30',
        }
      : { text: 'Paid period ended', tone: 'text-amber-200 bg-amber-500/15 border-amber-500/30' };
  }
  return { text: 'Free', tone: 'text-slate-200 bg-slate-700/40 border-slate-600' };
}

const DAY_CHOICES = [30, 90, 365];

const CustomerCard: React.FC<{
  c: CustomerRow;
  busy: boolean;
  onChange: (c: CustomerRow, plan: 'free' | 'paid', days: number, disabled: boolean) => void;
  onSaveLink: (c: CustomerRow, link: string, price: string) => Promise<void>;
}> = ({ c, busy, onChange, onSaveLink }) => {
  const [days, setDays] = useState(30);
  const [link, setLink] = useState(c.payment_link ?? '');
  const [price, setPrice] = useState(c.price_note ?? '');
  const [savingLink, setSavingLink] = useState(false);
  const linkLooksValid = /^https:\/\/\S+$/i.test(link.trim());
  const label = accessLabel(c);
  const isPaidNow = c.plan === 'paid' && !!c.paid_until && new Date(c.paid_until).getTime() > Date.now();

  return (
    <li className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100 break-all">{c.email}</p>
          <p className="text-xs text-slate-400">
            Joined {timeAgo(c.created_at)}
            {c.last_sign_in_at && ` · last signed in ${timeAgo(c.last_sign_in_at)}`}
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${label.tone}`}>{label.text}</span>
      </div>

      <p className="text-xs text-slate-400">
        {c.links} location link{c.links === 1 ? '' : 's'} created · {c.lookups} lookup{c.lookups === 1 ? '' : 's'}
      </p>

      {c.requested_at && (
        <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/50 text-sm text-amber-100 space-y-3">
          <div className="space-y-0.5">
            <p className="font-medium">Asked for access {timeAgo(c.requested_at)}</p>
            {c.request_note && <p className="text-amber-100/90 break-words">“{c.request_note}”</p>}
          </div>

          {c.paid_claimed_at && (
            <p role="status" className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-700/60 text-emerald-100 font-medium">
              Says they paid {timeAgo(c.paid_claimed_at)}. Check Payoneer, then press Activate.
            </p>
          )}

          <div className="space-y-2">
            <label className="block space-y-1">
              <span className="text-xs text-amber-100/90">Payment link (must start with https://)</span>
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                inputMode="url"
                placeholder="https://..."
                className="w-full h-10 px-3 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-amber-100/90">Price they will see (optional)</span>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                maxLength={120}
                placeholder="For example: $10 for 30 days"
                className="w-full h-10 px-3 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500"
              />
            </label>
            <button
              onClick={async () => {
                setSavingLink(true);
                await onSaveLink(c, link, price);
                setSavingLink(false);
              }}
              disabled={savingLink || !linkLooksValid}
              className="h-10 px-4 text-sm font-semibold text-slate-950 bg-amber-300 hover:bg-amber-200 disabled:bg-slate-800 disabled:text-slate-500 rounded-lg transition-colors"
            >
              {c.payment_link ? 'Update link' : 'Send link to customer'}
            </button>
            {c.payment_link && <p className="text-xs text-amber-100/80">The customer can see this link on their Plan tab.</p>}
          </div>
        </div>
      )}

      {c.role !== 'admin' && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <label className="sr-only" htmlFor={`days-${c.user_id}`}>Days of access</label>
          <select
            id={`days-${c.user_id}`}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            disabled={busy}
            className="h-10 px-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100"
          >
            {DAY_CHOICES.map((d) => (
              <option key={d} value={d}>
                {d} days
              </option>
            ))}
          </select>
          <button
            onClick={() => onChange(c, 'paid', days, false)}
            disabled={busy}
            className="h-10 px-4 text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-60 rounded-lg transition-colors"
          >
            {isPaidNow ? 'Extend' : 'Activate'}
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Move ${c.email} back to the free plan?`)) onChange(c, 'free', 0, c.disabled);
            }}
            disabled={busy || (c.plan === 'free' && !c.paid_until)}
            className="h-10 px-4 text-sm text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 rounded-lg transition-colors"
          >
            Set to free
          </button>
          <button
            onClick={() => {
              if (c.disabled || window.confirm(`Switch off ${c.email}? They are signed out and cannot sign in.`)) {
                onChange(c, c.plan, 0, !c.disabled);
              }
            }}
            disabled={busy}
            className="h-10 px-4 text-sm text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 border border-slate-700 rounded-lg transition-colors"
          >
            {c.disabled ? 'Switch on' : 'Switch off'}
          </button>
          {busy && <Loader2 className="w-4 h-4 animate-spin text-slate-400" aria-label="Saving" />}
        </div>
      )}
    </li>
  );
};

export const AdminView: React.FC = () => {
  const [rows, setRows] = useState<CustomerRow[] | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError('');
      setRows(await adminListCustomers());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load customers.');
      setRows([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const change = async (c: CustomerRow, plan: 'free' | 'paid', days: number, disabled: boolean) => {
    setBusyId(c.user_id);
    try {
      await adminSetAccess(c.user_id, plan, days, disabled);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the change.');
    } finally {
      setBusyId(null);
    }
  };

  const saveLink = async (c: CustomerRow, link: string, price: string) => {
    try {
      setError('');
      await adminSetPaymentLink(c.user_id, link, price);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the payment link.');
    }
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter((c) => !q || c.email.toLowerCase().includes(q));
  }, [rows, query]);

  const waiting = (rows ?? []).filter((c) => c.requested_at).length;
  const paidNow = (rows ?? []).filter(
    (c) => c.role !== 'admin' && c.plan === 'paid' && c.paid_until && new Date(c.paid_until).getTime() > Date.now(),
  ).length;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-slate-100">Customers</h1>
        <p className="text-sm text-slate-300">
          {rows === null
            ? 'Loading...'
            : `${(rows ?? []).filter((c) => c.role !== 'admin').length} customers · ${paidNow} with paid access · ${waiting} waiting for you`}
        </p>
        <p className="text-xs text-slate-400">
          You see counts and dates only. Phone numbers and positions are never shown here.
        </p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search customers by email"
          placeholder="Search by email"
          className="w-full h-11 pl-10 pr-3 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-rose-300">
          {error}
        </p>
      )}

      {rows === null ? (
        <div className="py-10 flex justify-center text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" aria-label="Loading" />
        </div>
      ) : visible.length === 0 ? (
        <p className="text-sm text-slate-400">No customers match.</p>
      ) : (
        <ul className="space-y-3">
          {visible.map((c) => (
            <CustomerCard key={c.user_id} c={c} busy={busyId === c.user_id} onChange={change} onSaveLink={saveLink} />
          ))}
        </ul>
      )}
    </div>
  );
};
