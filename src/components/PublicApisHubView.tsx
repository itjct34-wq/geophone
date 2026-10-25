import React, { useMemo, useRef, useState } from 'react';
import { BookOpen, ExternalLink, Loader2, Play, Search, ShieldCheck } from 'lucide-react';
import {
  PUBLIC_APIS_CATALOG,
  PUBLIC_API_CATEGORIES,
  type PublicApiCategory,
  type PublicApiEntry,
} from '../data/publicApisCatalog';
import { callOsintProvider, type OsintProviderId } from '../services/osintProviders';
import { fetchWithTimeout } from '../lib/fetchWithTimeout';

type CategoryFilter = 'all' | PublicApiCategory;

async function runCallable(entry: PublicApiEntry, q: string, signal: AbortSignal): Promise<unknown> {
  const call = entry.callable;
  if (!call) throw new Error('Not callable');

  if (call.kind === 'osint_provider' && call.provider) {
    return callOsintProvider(call.provider as OsintProviderId, q);
  }

  const response = await fetchWithTimeout(
    `/api/public-api?id=${encodeURIComponent(entry.id)}&q=${encodeURIComponent(q)}`,
    { headers: { Accept: 'application/json' }, signal },
    18_000,
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error((body as { error?: string } | null)?.error || `HTTP ${response.status}`);
  }
  if (body && typeof body === 'object' && 'useOsintProxy' in body && (body as { provider?: string }).provider) {
    const provider = (body as { provider: string }).provider as OsintProviderId;
    return callOsintProvider(provider, q);
  }
  return body;
}

export const PublicApisHubView: React.FC = () => {
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState('1.1.1.1');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; data: unknown } | null>(null);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PUBLIC_APIS_CATALOG.filter((e) => {
      if (category !== 'all' && e.category !== category) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.id.includes(q)
      );
    });
  }, [category, query]);

  const run = async (entry: PublicApiEntry) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusyId(entry.id);
    setError('');
    setResult(null);
    try {
      const data = await runCallable(entry, target.trim(), controller.signal);
      if (!controller.signal.aborted) setResult({ id: entry.id, data });
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Request failed.');
      }
    } finally {
      if (abortRef.current === controller) setBusyId(null);
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    setBusyId(null);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          Public APIs
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Free public API catalog
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-400">
          Curated from{' '}
          <a
            href="https://github.com/public-apis/public-apis"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-300 hover:underline"
          >
            public-apis/public-apis
          </a>{' '}
          for phone, geolocation, security, open data, tracking, and transportation. Callable rows run
          in-app through GeoPhone&apos;s proxied / cached routes — not redirect-only.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5 space-y-4">
        <label className="block text-sm font-medium text-slate-200">
          Target for Try calls (IP, domain, phone, postal code…)
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
            placeholder="1.1.1.1 · example.com · US/90210 · +14155552671"
          />
        </label>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filter APIs"
            placeholder="Filter by name"
            className="w-full h-11 pl-10 pr-3 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory('all')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
              category === 'all' ? 'bg-cyan-400 text-slate-950' : 'border border-slate-700 text-slate-300'
            }`}
          >
            All
          </button>
          {PUBLIC_API_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                category === c ? 'bg-cyan-400 text-slate-950' : 'border border-slate-700 text-slate-300'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          Proxied calls use 10–18s timeouts so the UI stays responsive.
          {busyId && (
            <button type="button" onClick={cancel} className="ml-2 text-amber-300 hover:underline">
              Cancel
            </button>
          )}
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-rose-400">
          {error}
        </p>
      )}

      <ul className="space-y-3">
        {visible.map((entry) => (
          <li
            key={entry.id}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-slate-100">{entry.name}</p>
                <p className="text-xs text-slate-500">
                  {entry.category} · Auth: {entry.auth} · HTTPS: {entry.https ? 'yes' : 'no'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={entry.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-700 px-3 text-xs text-slate-300 hover:bg-slate-800"
                >
                  Docs <ExternalLink className="h-3 w-3" />
                </a>
                {entry.callable && (
                  <button
                    type="button"
                    disabled={busyId === entry.id || !target.trim()}
                    onClick={() => void run(entry)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-cyan-400 px-3 text-xs font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
                  >
                    {busyId === entry.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                    Try in-app
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-slate-400">{entry.description}</p>
            {entry.notes && <p className="text-xs text-slate-500">{entry.notes}</p>}
            {result?.id === entry.id && (
              <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-[11px] text-cyan-100/90">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            )}
          </li>
        ))}
      </ul>

      {visible.length === 0 && <p className="text-sm text-slate-400">No APIs match this filter.</p>}
    </div>
  );
};
