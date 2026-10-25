import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Palette, ExternalLink, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DesignSettings {
  brand_name: string;
  tagline: string;
  primary_color: string;
  accent_color: string;
  surface_mode: 'persuade' | 'operate' | 'read' | 'experience';
  notes: string;
  updated_at?: string;
}

const COMMANDS = [
  { cmd: 'init', desc: 'Capture PRODUCT.md product truth' },
  { cmd: 'document', desc: 'Generate DESIGN.md from code' },
  { cmd: 'audit', desc: 'A11y / perf / responsive checks' },
  { cmd: 'critique', desc: 'UX heuristic scoring' },
  { cmd: 'polish', desc: 'Final ship-ready pass' },
  { cmd: 'distill', desc: 'Strip visual noise' },
  { cmd: 'harden', desc: 'Errors, i18n, edge cases' },
  { cmd: 'animate', desc: 'Purposeful motion' },
] as const;

const DEFAULTS: DesignSettings = {
  brand_name: 'GeoPhone',
  tagline: 'Consent-based phone intelligence',
  primary_color: '#22d3ee',
  accent_color: '#34d399',
  surface_mode: 'operate',
  notes: '',
};

/**
 * Admin design-system panel powered by Impeccable (pbakaus/impeccable).
 * Stores brand prefs in Supabase; skill lives at .claude/skills/impeccable/.
 */
export const AdminImpeccable: React.FC = () => {
  const [form, setForm] = useState<DesignSettings>(DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_get_design_settings');
      if (rpcError) throw rpcError;
      if (data && typeof data === 'object') {
        const row = data as DesignSettings;
        setForm({
          brand_name: row.brand_name || DEFAULTS.brand_name,
          tagline: row.tagline || DEFAULTS.tagline,
          primary_color: row.primary_color || DEFAULTS.primary_color,
          accent_color: row.accent_color || DEFAULTS.accent_color,
          surface_mode: row.surface_mode || DEFAULTS.surface_mode,
          notes: row.notes || '',
          updated_at: row.updated_at,
        });
      }
    } catch (err) {
      // Table/RPC may not exist until migration applied — keep defaults editable.
      setError(err instanceof Error ? err.message : 'Could not load design settings.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setBusy(true);
    setError('');
    setSaved('');
    try {
      const { error: rpcError } = await supabase.rpc('admin_set_design_settings', {
        p_brand_name: form.brand_name,
        p_tagline: form.tagline,
        p_primary_color: form.primary_color,
        p_accent_color: form.accent_color,
        p_surface_mode: form.surface_mode,
        p_notes: form.notes,
      });
      if (rpcError) throw rpcError;
      setSaved('Brand settings saved.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Impeccable
          </div>
          <h2 className="text-lg font-bold text-slate-100">Design system & brand</h2>
          <p className="text-sm text-slate-400 max-w-xl">
            Controls for{' '}
            <a
              href="https://github.com/pbakaus/impeccable"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-300 hover:underline inline-flex items-center gap-1"
            >
              pbakaus/impeccable <ExternalLink className="h-3 w-3" />
            </a>
            . Skill is installed at <code className="text-slate-300">.claude/skills/impeccable/</code>.
            Admin Operate mode — precise brand details, not marketing chrome.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <img src="/impeccable-logo-icon.png" alt="" className="h-10 w-10 object-contain" />
          <img
            src="/impeccable-logo.png"
            alt="Impeccable"
            className="h-8 max-w-[140px] object-contain opacity-90"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="text-slate-300">Brand name</span>
          <input
            value={form.brand_name}
            onChange={(e) => setForm((f) => ({ ...f, brand_name: e.target.value }))}
            className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-100"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-slate-300">Tagline</span>
          <input
            value={form.tagline}
            onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
            className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-100"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-slate-300">Primary</span>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={form.primary_color}
              onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))}
              className="h-10 w-12 rounded border border-slate-700 bg-slate-950"
            />
            <input
              value={form.primary_color}
              onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))}
              className="flex-1 h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs"
            />
          </div>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-slate-300">Accent</span>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={form.accent_color}
              onChange={(e) => setForm((f) => ({ ...f, accent_color: e.target.value }))}
              className="h-10 w-12 rounded border border-slate-700 bg-slate-950"
            />
            <input
              value={form.accent_color}
              onChange={(e) => setForm((f) => ({ ...f, accent_color: e.target.value }))}
              className="flex-1 h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs"
            />
          </div>
        </label>
        <label className="block space-y-1 text-sm sm:col-span-2">
          <span className="text-slate-300">Surface mode (Impeccable)</span>
          <select
            value={form.surface_mode}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                surface_mode: e.target.value as DesignSettings['surface_mode'],
              }))
            }
            className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-100"
          >
            <option value="operate">Operate — app / admin / tools</option>
            <option value="persuade">Persuade — landing / marketing</option>
            <option value="read">Read — docs / help</option>
            <option value="experience">Experience — portfolio / showcase</option>
          </select>
        </label>
        <label className="block space-y-1 text-sm sm:col-span-2">
          <span className="text-slate-300">Design notes for agents</span>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={3}
            placeholder="Pinned aesthetics, fonts to avoid, anti-patterns…"
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-sm"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Palette className="h-4 w-4" />}
          Save brand settings
        </button>
        {saved && <p className="text-sm text-emerald-300">{saved}</p>}
        {error && (
          <p role="alert" className="text-sm text-rose-300">
            {error}
          </p>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-2">Skill commands (run in Cursor / Claude)</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {COMMANDS.map((c) => (
            <li
              key={c.cmd}
              className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-400"
            >
              <code className="text-cyan-300">/impeccable {c.cmd}</code>
              <span className="block mt-0.5 text-slate-500">{c.desc}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500">
          Docs: <a href="https://impeccable.style" className="text-cyan-300 hover:underline" target="_blank" rel="noopener noreferrer">impeccable.style</a>
        </p>
      </div>
    </section>
  );
};
