import React, { useState } from 'react';
import {
  Fingerprint,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Search,
  Radio,
  AlertTriangle,
  CheckCircle2,
  SkipForward,
  XCircle,
} from 'lucide-react';
import {
  runPhoneInfogaStyleScan,
  type PhoneInfogaScanReport,
  type ScannerResultRow,
} from '../services/phoneInfogaService';

interface PhoneInfogaScannerViewProps {
  initialNumber?: string;
  onUseNumber?: (number: string) => void;
}

function statusIcon(status: ScannerResultRow['status']) {
  switch (status) {
    case 'ok':
      return <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />;
    case 'partial':
      return <AlertTriangle className="h-4 w-4 text-amber-300" aria-hidden="true" />;
    case 'skipped':
      return <SkipForward className="h-4 w-4 text-slate-500" aria-hidden="true" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-rose-400" aria-hidden="true" />;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export const PhoneInfogaScannerView: React.FC<PhoneInfogaScannerViewProps> = ({
  initialNumber = '',
  onUseNumber,
}) => {
  const [input, setInput] = useState(initialNumber);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<PhoneInfogaScanReport | null>(null);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (initialNumber && initialNumber !== input) setInput(initialNumber);
    // Only sync when parent number changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNumber]);

  const runScan = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) {
      setError('Enter a phone number to scan.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const next = await runPhoneInfogaStyleScan(trimmed);
      setReport(next);
      if (next.number.e164) onUseNumber?.(next.number.e164);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed.');
    } finally {
      setBusy(false);
    }
  };

  const footprintEngines = report
    ? (['Google', 'Bing', 'DuckDuckGo'] as const).map((engine) => ({
        engine,
        links: report.footprints.filter((f) => f.engine === engine),
      }))
    : [];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          <Fingerprint className="h-4 w-4" aria-hidden="true" />
          PhoneInfoga-style OSINT
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Phone number scanner
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-400">
          High-level parity with open-source{' '}
          <a
            href="https://github.com/sundowndev/phoneinfoga"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-300 hover:underline"
          >
            PhoneInfoga
          </a>
          : local parse/validate, carrier and line-type metadata, optional public API scanners, and
          search-engine footprint links. This does not track phones in real time or scrape private apps.
        </p>
      </header>

      <form
        onSubmit={runScan}
        className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6 space-y-4"
      >
        <label className="block text-sm font-medium text-slate-200">
          Phone number
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. +923001234567 or 03001234567"
            autoComplete="tel"
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-400 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Run OSINT scan
          </button>
          <span className="text-xs text-slate-500 inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Public metadata &amp; search links only
          </span>
        </div>
        {error && (
          <p role="alert" className="text-sm text-rose-400">
            {error}
          </p>
        )}
      </form>

      {report && (
        <>
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Radio className="h-4 w-4 text-cyan-300" />
              Number summary
            </h2>
            {report.number.isValid ? (
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                <div>
                  <dt className="text-slate-500 text-xs">E.164</dt>
                  <dd className="font-mono text-slate-100">{report.number.e164}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 text-xs">Country</dt>
                  <dd className="text-slate-100">{report.number.countryName}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 text-xs">Carrier</dt>
                  <dd className="text-slate-100">{report.number.carrier}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 text-xs">Line type</dt>
                  <dd className="text-slate-100">{report.number.lineType}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 text-xs">Region</dt>
                  <dd className="text-slate-100">{report.number.regionOrCity}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 text-xs">MCC-MNC</dt>
                  <dd className="font-mono text-slate-100">{report.number.mccMnc || '—'}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-amber-200">Could not validate this number locally.</p>
            )}
            <p className="text-[11px] text-slate-500">Scanned at {new Date(report.scannedAt).toLocaleString()}</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-white">Scanners</h2>
            <ul className="space-y-2">
              {report.scanners.map((row) => (
                <li
                  key={row.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex gap-3"
                >
                  <div className="mt-0.5 shrink-0">{statusIcon(row.status)}</div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-medium text-slate-100">{row.name}</span>
                      <span className="text-[10px] uppercase tracking-wide text-slate-500">{row.status}</span>
                      {row.attribution && (
                        <span className="text-[11px] text-slate-500">· {row.attribution}</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-300">{row.summary}</p>
                    {row.details && (
                      <dl className="mt-2 grid gap-1 sm:grid-cols-2 text-[11px] text-slate-500">
                        {Object.entries(row.details).map(([k, v]) =>
                          v === null || v === undefined ? null : (
                            <div key={k} className="font-mono">
                              <span className="text-slate-600">{k}=</span>
                              {String(v)}
                            </div>
                          ),
                        )}
                      </dl>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {report.footprints.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-semibold text-white">Search footprints</h2>
              <p className="text-xs text-slate-500">
                Opens the search provider in a new tab. GeoPhone does not scrape result pages.
              </p>
              <div className="grid gap-4 lg:grid-cols-3">
                {footprintEngines.map(({ engine, links }) => (
                  <div key={engine} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-slate-200">{engine}</h3>
                    <ul className="space-y-1.5">
                      {links.map((link) => (
                        <li key={link.url}>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-cyan-300 hover:underline"
                          >
                            {link.label.replace(` · ${engine}`, '')}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};
