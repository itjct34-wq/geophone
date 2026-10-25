import React, { useState } from 'react';
import {
  Shield,
  Loader2,
  Globe2,
  AtSign,
  Wifi,
  AlertTriangle,
  CheckCircle2,
  Database,
} from 'lucide-react';
import {
  callOsintProvider,
  enrichDomain,
  enrichEmail,
  enrichIp,
  type OsintProviderResponse,
} from '../services/osintProviders';
import { isIp } from '../services/ipService';

type Panel = 'ip' | 'email' | 'mac' | 'domain' | 'wigle' | 'geo';

function ResultBlock({ title, result }: { title: string; result?: OsintProviderResponse | null }) {
  if (!result) return null;
  const ok = !result.error && result.configured !== false;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-slate-100">{title}</span>
        {result.cached && (
          <span className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-300">
            <Database className="h-3 w-3" /> cached
          </span>
        )}
        {result.configured === false ? (
          <span className="inline-flex items-center gap-1 text-[10px] text-amber-200">
            <AlertTriangle className="h-3 w-3" /> key missing
          </span>
        ) : ok ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
        )}
      </div>
      {result.message && <p className="text-xs text-amber-200/90">{result.message}</p>}
      {result.error && <p className="text-xs text-rose-400">{result.error}</p>}
      {result.data != null && (
        <pre className="max-h-48 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-2 text-[10px] font-mono text-slate-400 whitespace-pre-wrap">
          {JSON.stringify(result.data, null, 2)}
        </pre>
      )}
    </div>
  );
}

export const OsintProvidersView: React.FC = () => {
  const [panel, setPanel] = useState<Panel>('ip');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [bundle, setBundle] = useState<Record<string, OsintProviderResponse> | null>(null);
  const [error, setError] = useState('');

  const run = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const q = input.trim();
    if (!q) {
      setError('Enter a target.');
      return;
    }
    setBusy(true);
    setError('');
    setBundle(null);
    try {
      switch (panel) {
        case 'ip': {
          const ip = isIp(q) ? q.replace(/^\[|\]$/g, '') : q;
          setBundle(await enrichIp(ip));
          break;
        }
        case 'email':
          setBundle(await enrichEmail(q));
          break;
        case 'domain':
          setBundle(await enrichDomain(q.replace(/^https?:\/\//, '').split('/')[0]));
          break;
        case 'mac':
          setBundle({ macvendors: await callOsintProvider('macvendors', q) });
          break;
        case 'wigle':
          setBundle({
            wigle: await callOsintProvider('wigle', q, {
              kind: q.includes(',') ? 'geo' : q.includes(':') ? 'bssid' : 'ssid',
            }),
          });
          break;
        case 'geo':
          setBundle({
            nominatim: await callOsintProvider('nominatim', q, {
              kind: /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(q) ? 'reverse' : 'search',
            }),
          });
          break;
        default: {
          const _exhaustive: never = panel;
          return _exhaustive;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed.');
    } finally {
      setBusy(false);
    }
  };

  const placeholders: Record<Panel, string> = {
    ip: '8.8.8.8',
    email: 'you@example.com',
    domain: 'example.com',
    mac: 'AA:BB:CC:DD:EE:FF',
    wigle: 'SSID, BSSID, or lat,lng',
    geo: 'address or lat,lon',
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          <Shield className="h-4 w-4" />
          Provider APIs
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Free OSINT API suite
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-400">
          IP-API, AbuseIPDB, Shodan, VirusTotal, OTX, APIVoid, Hunter, BreachDirectory, MacVendors,
          WiGLE, and Nominatim — all via server proxies with optional Supabase cache. Keys never ship
          in the browser. Missing keys show a graceful empty state.
        </p>
      </header>

      <div className="flex flex-wrap gap-2" role="tablist">
        {(
          [
            ['ip', 'IP enrichment', Globe2],
            ['email', 'Email / breach', AtSign],
            ['domain', 'Domain intel', Shield],
            ['mac', 'MAC vendor', Wifi],
            ['wigle', 'WiGLE', Wifi],
            ['geo', 'Nominatim', Globe2],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={panel === id}
            onClick={() => {
              setPanel(id);
              setBundle(null);
            }}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${
              panel === id
                ? 'bg-cyan-400 text-slate-950'
                : 'border border-slate-700 text-slate-300 hover:bg-slate-900'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <form
        onSubmit={run}
        className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-4"
      >
        <label className="block text-sm font-medium text-slate-200">
          Target
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholders[panel]}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-400 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
          Run in-app lookup
        </button>
        {error && (
          <p role="alert" className="text-sm text-rose-400">
            {error}
          </p>
        )}
      </form>

      {bundle && (
        <div className="grid gap-3 lg:grid-cols-2">
          {Object.entries(bundle).map(([key, result]) => (
            <ResultBlock key={key} title={key} result={result} />
          ))}
        </div>
      )}
    </div>
  );
};
