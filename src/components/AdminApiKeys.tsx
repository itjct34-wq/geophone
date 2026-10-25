import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, Loader2, Copy, Ban, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  plan: 'free' | 'pro' | 'business';
  monthly_limit: number;
  disabled: boolean;
  created_at: string;
  last_used_at: string | null;
  request_count: number;
  period_yyyy_mm: string;
}

export const AdminApiKeys: React.FC = () => {
  const [rows, setRows] = useState<ApiKeyRow[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('Public API');
  const [plan, setPlan] = useState<'free' | 'pro' | 'business'>('free');
  const [createdKey, setCreatedKey] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_list_api_keys');
      if (rpcError) throw rpcError;
      setRows((data as ApiKeyRow[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load API keys.');
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createKey = async () => {
    setBusy(true);
    setError('');
    setCreatedKey('');
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_create_api_key', {
        p_name: name.trim() || 'API key',
        p_plan: plan,
        p_user: null,
      });
      if (rpcError) throw rpcError;
      const payload = data as { key?: string };
      if (payload?.key) setCreatedKey(payload.key);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create key.');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (id: string, disabled: boolean) => {
    setBusy(true);
    try {
      const { error: rpcError } = await supabase.rpc('admin_set_api_key_disabled', {
        p_id: id,
        p_disabled: disabled,
      });
      if (rpcError) throw rpcError;
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update key.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-slate-100 inline-flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-cyan-300" /> Public API keys
        </h2>
        <p className="text-sm text-slate-400">
          One endpoint: <code className="text-cyan-300">POST /api/v1/intel</code>. Free ={' '}
          <strong className="text-slate-200">100 requests / month</strong>. Pro 5,000 · Business 50,000.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-end rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <label className="text-xs text-slate-400 space-y-1">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="block h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-sm text-slate-100"
          />
        </label>
        <label className="text-xs text-slate-400 space-y-1">
          Plan
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value as typeof plan)}
            className="block h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-sm text-slate-100"
          >
            <option value="free">Free (100/mo)</option>
            <option value="pro">Pro (5,000/mo)</option>
            <option value="business">Business (50,000/mo)</option>
          </select>
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void createKey()}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-400 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create key
        </button>
      </div>

      {createdKey && (
        <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/30 p-4 space-y-2">
          <p className="text-sm text-emerald-100 font-medium">Copy this key now — it is shown once.</p>
          <code className="block break-all text-xs text-emerald-200 bg-slate-950/60 p-3 rounded-lg">
            {createdKey}
          </code>
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(createdKey)}
            className="inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:underline"
          >
            <Copy className="h-3.5 w-3.5" /> Copy to clipboard
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-rose-300">
          {error}
        </p>
      )}

      {rows === null ? (
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-label="Loading" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-400">No API keys yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((k) => (
            <li
              key={k.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-sm"
            >
              <div>
                <p className="font-medium text-slate-100">
                  {k.name}{' '}
                  <span className="text-xs text-slate-500 font-mono">{k.key_prefix}…</span>
                </p>
                <p className="text-xs text-slate-400">
                  {k.plan} · {k.request_count}/{k.monthly_limit} in {k.period_yyyy_mm}
                  {k.disabled ? ' · disabled' : ''}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void toggle(k.id, !k.disabled)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 px-3 text-xs text-slate-300 hover:bg-slate-800"
              >
                <Ban className="h-3.5 w-3.5" />
                {k.disabled ? 'Enable' : 'Disable'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
