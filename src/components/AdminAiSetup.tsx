import React, { useCallback, useEffect, useState } from 'react';
import { Bot, Loader2, Save, Trash2, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchAiStatus, type AiStatus } from '../services/aiBriefService';

interface AiSettingsForm {
  groqConfigured: boolean;
  groqKeyMasked: string | null;
  groqModel: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
  updatedAt?: string;
}

const DEFAULTS: AiSettingsForm = {
  groqConfigured: false,
  groqKeyMasked: null,
  groqModel: 'llama-3.1-8b-instant',
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.2',
};

function sourceLabel(configured: boolean, fromDb: boolean, fromEnv: boolean): string {
  if (fromDb) return 'saved in Admin (database)';
  if (fromEnv) return 'set via env';
  if (configured) return 'configured';
  return 'not configured';
}

export const AdminAiSetup: React.FC = () => {
  const [form, setForm] = useState<AiSettingsForm>(DEFAULTS);
  const [groqKeyInput, setGroqKeyInput] = useState('');
  const [live, setLive] = useState<AiStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [{ data, error: rpcError }, status] = await Promise.all([
        supabase.rpc('admin_get_ai_settings'),
        fetchAiStatus(),
      ]);
      if (rpcError) throw rpcError;
      if (data && typeof data === 'object') {
        const row = data as AiSettingsForm;
        setForm({
          groqConfigured: Boolean(row.groqConfigured),
          groqKeyMasked: row.groqKeyMasked ?? null,
          groqModel: row.groqModel || DEFAULTS.groqModel,
          ollamaBaseUrl: row.ollamaBaseUrl || DEFAULTS.ollamaBaseUrl,
          ollamaModel: row.ollamaModel || DEFAULTS.ollamaModel,
          updatedAt: row.updatedAt,
        });
      }
      setLive(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load AI settings.');
      setLive(await fetchAiStatus());
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (clearKey = false) => {
    setBusy(true);
    setError('');
    setSaved('');
    try {
      const { error: rpcError } = await supabase.rpc('admin_set_ai_settings', {
        p_groq_api_key: clearKey ? null : groqKeyInput.trim() || null,
        p_groq_model: form.groqModel.trim() || null,
        p_ollama_base_url: form.ollamaBaseUrl.trim() || null,
        p_ollama_model: form.ollamaModel.trim() || null,
        p_clear_groq_key: clearKey,
      });
      if (rpcError) throw rpcError;
      setGroqKeyInput('');
      setSaved(clearKey ? 'Groq key cleared.' : 'AI settings saved.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save AI settings.');
    } finally {
      setBusy(false);
    }
  };

  const groqFromDb = form.groqConfigured;
  const groqFromEnv = Boolean(live?.groq) && !groqFromDb;
  const groqOk = Boolean(live?.groq) || groqFromDb;

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-slate-100 inline-flex items-center gap-2">
          <Bot className="h-5 w-5 text-cyan-300" /> AI setup
        </h2>
        <p className="text-sm text-slate-400">
          Configure Groq (cloud) or Ollama (local/self-hosted) for AI briefs. Keys are stored in Supabase
          and read only by the server — never shown in full here. Env vars still work as a fallback.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-2 text-sm">
        <p className="font-medium text-slate-200">Status</p>
        <ul className="space-y-1.5 text-slate-300">
          <li>
            Groq:{' '}
            <span className={groqOk ? 'text-emerald-300' : 'text-slate-500'}>
              {groqOk ? 'yes' : 'no'}
            </span>
            <span className="text-slate-500">
              {' '}
              — {sourceLabel(groqOk, groqFromDb, groqFromEnv)}
              {form.groqKeyMasked ? ` (${form.groqKeyMasked})` : groqFromEnv ? ' (•••• env)' : ''}
              {live?.groqModel ? ` · model ${live.groqModel}` : form.groqModel ? ` · model ${form.groqModel}` : ''}
            </span>
          </li>
          <li>
            Ollama:{' '}
            <span className={live?.ollama ? 'text-emerald-300' : 'text-slate-500'}>
              {live?.ollama ? 'yes (reachable)' : 'no / not reachable'}
            </span>
            <span className="text-slate-500">
              {' '}
              — {live?.ollamaModel || form.ollamaModel} @ {live?.ollamaBase || form.ollamaBaseUrl}
            </span>
          </li>
        </ul>
        {live?.message && <p className="text-xs text-slate-500">{live.message}</p>}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-100">Groq</h3>
          <p className="text-xs text-slate-400">
            Free tier at{' '}
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-300 inline-flex items-center gap-0.5 hover:underline"
            >
              console.groq.com/keys <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
        <label className="block space-y-1 text-xs text-slate-400">
          API key {form.groqKeyMasked ? `(current ${form.groqKeyMasked} — leave blank to keep)` : ''}
          <input
            type="password"
            autoComplete="off"
            value={groqKeyInput}
            onChange={(e) => setGroqKeyInput(e.target.value)}
            placeholder={form.groqConfigured || groqFromEnv ? '•••••••• (unchanged)' : 'gsk_…'}
            className="block w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500"
          />
        </label>
        <label className="block space-y-1 text-xs text-slate-400">
          Model
          <input
            value={form.groqModel}
            onChange={(e) => setForm((f) => ({ ...f, groqModel: e.target.value }))}
            placeholder="llama-3.1-8b-instant"
            className="block w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-sm text-slate-100"
          />
        </label>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-100">Ollama</h3>
          <p className="text-xs text-slate-400">
            Base URL must be reachable from the Vercel server (localhost only works in local dev).
          </p>
        </div>
        <label className="block space-y-1 text-xs text-slate-400">
          Base URL
          <input
            value={form.ollamaBaseUrl}
            onChange={(e) => setForm((f) => ({ ...f, ollamaBaseUrl: e.target.value }))}
            placeholder="http://localhost:11434"
            className="block w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-sm text-slate-100"
          />
        </label>
        <label className="block space-y-1 text-xs text-slate-400">
          Model
          <input
            value={form.ollamaModel}
            onChange={(e) => setForm((f) => ({ ...f, ollamaModel: e.target.value }))}
            placeholder="llama3.2"
            className="block w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-sm text-slate-100"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save(false)}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-400 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save AI settings
        </button>
        {(form.groqConfigured || groqKeyInput) && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm('Clear the saved Groq API key from the database?')) void save(true);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-700 px-4 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            Clear Groq key
          </button>
        )}
      </div>

      {saved && (
        <p role="status" className="text-sm text-emerald-300">
          {saved}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-rose-300">
          {error}
        </p>
      )}
      {form.updatedAt && (
        <p className="text-xs text-slate-500">Last saved {new Date(form.updatedAt).toLocaleString()}</p>
      )}
    </section>
  );
};
