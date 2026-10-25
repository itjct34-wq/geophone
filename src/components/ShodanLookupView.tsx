import React, { useState } from 'react';
import { Radar, Loader2, ShieldCheck, AlertTriangle, MapPin, Server } from 'lucide-react';
import {
  lookupShodanHost,
  lookupShodanIp,
  searchShodan,
  vulnList,
  type ShodanLookupResponse,
} from '../services/shodanService';
import { isIp } from '../services/ipService';

export const ShodanLookupView: React.FC = () => {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'auto' | 'search'>('auto');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ShodanLookupResponse | null>(null);
  const [error, setError] = useState('');

  const run = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const q = input.trim();
    if (!q) {
      setError('Enter an IP, hostname, or Shodan search query.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      let next: ShodanLookupResponse;
      if (mode === 'search') {
        next = await searchShodan(q);
      } else if (isIp(q)) {
        next = await lookupShodanIp(q.replace(/^\[|\]$/g, ''));
      } else {
        next = await lookupShodanHost(q);
      }
      setResult(next);
      if (next.error) setError(next.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Shodan lookup failed.');
    } finally {
      setBusy(false);
    }
  };

  const host = result?.host;
  const vulns = vulnList(host);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          <Radar className="h-4 w-4" aria-hidden="true" />
          Shodan
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Internet device &amp; host lookup
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-400">
          Official Shodan REST API via a server proxy (key never ships in the browser). Results render
          in GeoPhone — this is not a redirect to shodan.io and does not scrape without an API key.
        </p>
      </header>

      <form
        onSubmit={run}
        className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6 space-y-4"
      >
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['auto', 'IP / hostname'],
              ['search', 'Search query'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                mode === id
                  ? 'bg-cyan-400 text-slate-950'
                  : 'border border-slate-700 text-slate-300 hover:bg-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="block text-sm font-medium text-slate-200">
          {mode === 'search' ? 'Shodan query' : 'IP address or hostname'}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'search' ? 'apache country:DE' : '8.8.8.8 or example.com'}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-400 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
          Run Shodan lookup
        </button>
        {error && (
          <p role="alert" className="text-sm text-rose-400">
            {error}
          </p>
        )}
      </form>

      {result && !result.configured && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-3">
          <div className="flex gap-2 text-slate-200">
            <AlertTriangle className="h-5 w-5 text-amber-300 shrink-0" />
            <div>
              <h2 className="font-semibold">API key not configured</h2>
              <p className="mt-1 text-sm text-slate-400">
                {result.message || 'Set SHODAN_API_KEY on the server to enable lookups.'}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Add <code className="text-cyan-300">SHODAN_API_KEY</code> to{' '}
            <code className="text-slate-400">.env.local</code> / Vercel (server-only — never{' '}
            <code className="text-slate-400">VITE_</code>). Create a key at{' '}
            <span className="text-slate-300">account.shodan.io</span>.
          </p>
        </section>
      )}

      {result?.configured && host && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Server className="h-4 w-4 text-cyan-300" />
              Host {host.ip_str}
              {result.hostname && (
                <span className="text-sm font-normal text-slate-400">via {result.hostname}</span>
              )}
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Organization</dt>
                <dd className="text-slate-100">{host.org || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">ISP</dt>
                <dd className="text-slate-100">{host.isp || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">ASN</dt>
                <dd className="font-mono text-slate-100">{host.asn || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Location
                </dt>
                <dd className="text-slate-100">
                  {[host.city, host.country_name || host.country_code].filter(Boolean).join(', ') ||
                    '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Ports</dt>
                <dd className="font-mono text-slate-100">
                  {(host.ports ?? []).join(', ') || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Last update</dt>
                <dd className="text-slate-100">{host.last_update || '—'}</dd>
              </div>
            </dl>
            {host.hostnames && host.hostnames.length > 0 && (
              <p className="text-xs text-slate-400">
                Hostnames: {host.hostnames.slice(0, 12).join(', ')}
              </p>
            )}
            <p className="text-[11px] text-slate-500 inline-flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Data via official Shodan API
            </p>
          </div>

          {vulns.length > 0 && (
            <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-4">
              <h3 className="text-sm font-semibold text-amber-100">Vulnerabilities (CVE tags)</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {vulns.slice(0, 40).map((v) => (
                  <li
                    key={v}
                    className="rounded-md border border-amber-700/40 bg-slate-950/50 px-2 py-1 font-mono text-[11px] text-amber-200"
                  >
                    {v}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {host.data && host.data.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white">Service banners</h3>
              <ul className="space-y-2">
                {host.data.slice(0, 12).map((svc, i) => (
                  <li
                    key={`${svc.port}-${i}`}
                    className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-xs"
                  >
                    <div className="font-mono text-cyan-300">
                      {svc.port}/{svc.transport || 'tcp'}{' '}
                      <span className="text-slate-400">
                        {svc.product || ''} {svc.version || ''}
                      </span>
                    </div>
                    <pre className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap text-slate-500">
                      {(svc.banner || svc.data || '').slice(0, 400)}
                    </pre>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {result?.configured && result.search?.matches && (
        <section className="space-y-3">
          <h2 className="font-semibold text-white">
            Search results ({result.search.total ?? result.search.matches.length})
          </h2>
          <ul className="space-y-2">
            {result.search.matches.slice(0, 25).map((m, i) => (
              <li
                key={`${m.ip_str}-${m.port}-${i}`}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-sm text-slate-200"
              >
                <span className="font-mono text-cyan-300">{m.ip_str}</span>
                {m.port != null && <span className="text-slate-500"> :{m.port}</span>}
                {m.org && <span className="text-slate-400"> · {m.org}</span>}
                {m.product && <span className="text-slate-500"> · {m.product}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
