import React, { useState } from 'react';
import {
  AtSign,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { runHoleheCheck, type HoleheHit, type HoleheReport } from '../services/holeheService';

function HitCard({ hit }: { hit: HoleheHit }) {
  const badge =
    hit.exists === true ? (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-300">
        <CheckCircle2 className="h-3 w-3" /> Found
      </span>
    ) : hit.exists === false ? (
      <span className="inline-flex items-center gap-1 rounded-md border border-slate-600 bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-400">
        <XCircle className="h-3 w-3" /> Not found
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-200">
        <AlertTriangle className="h-3 w-3" /> {hit.rateLimit ? 'Rate limit' : 'Unknown'}
      </span>
    );

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium text-slate-100">{hit.name}</div>
          <div className="text-[11px] text-slate-500">{hit.domain}</div>
        </div>
        {badge}
      </div>
      {hit.error && <p className="text-xs text-slate-500">{hit.error}</p>}
      {hit.emailrecovery && (
        <p className="text-xs font-mono text-slate-400">recovery: {hit.emailrecovery}</p>
      )}
      {hit.phoneNumber && (
        <p className="text-xs font-mono text-slate-400">phone hint: {hit.phoneNumber}</p>
      )}
    </div>
  );
}

export const HoleheCheckView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<HoleheReport | null>(null);
  const [filter, setFilter] = useState<'all' | 'found' | 'not_found' | 'other'>('all');

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

  const run = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!valid) return;
    setBusy(true);
    try {
      const next = await runHoleheCheck(email.trim());
      setReport(next);
      setFilter('all');
    } finally {
      setBusy(false);
    }
  };

  const filtered =
    report?.results.filter((hit) => {
      if (filter === 'all') return true;
      if (filter === 'found') return hit.exists === true;
      if (filter === 'not_found') return hit.exists === false;
      return hit.exists !== true && hit.exists !== false;
    }) ?? [];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          <AtSign className="h-4 w-4" aria-hidden="true" />
          Holehe-style email check
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Email → registered accounts
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-400">
          In-app scanner inspired by open-source{' '}
          <span className="text-slate-300">Holehe</span> (megadose/holehe): parallel public
          register/status probes for an email. Results render here — GeoPhone does not redirect you
          to holehe.me or external OSINT portals for this check.
        </p>
      </header>

      <form
        onSubmit={run}
        className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6 space-y-4"
      >
        <label className="block text-sm font-medium text-slate-200">
          Email address
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy || !valid}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-400 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <AtSign className="h-4 w-4" />}
            Run Holehe check
          </button>
          <span className="text-xs text-slate-500 inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Public endpoints · results stay in GeoPhone
          </span>
        </div>
      </form>

      <aside className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-slate-200">
          <Terminal className="h-4 w-4 text-cyan-300" />
          Optional local Holehe CLI (full module set)
        </div>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 font-mono text-[11px] text-cyan-200">
{`pip3 install holehe
holehe you@example.com`}
        </pre>
      </aside>

      {report?.error && (
        <p role="alert" className="text-sm text-rose-400">
          {report.error}
        </p>
      )}

      {report && !report.error && (
        <>
          <div className="flex flex-wrap gap-3 text-sm text-slate-300">
            <span className="font-semibold text-white">{report.email}</span>
            <span className="text-emerald-300">{report.summary.found} found</span>
            <span className="text-slate-500">{report.summary.not_found} not found</span>
            <span className="text-amber-200/80">{report.summary.unknown} unknown</span>
          </div>
          {report.attribution && <p className="text-[11px] text-slate-500">{report.attribution}</p>}

          <div className="flex flex-wrap gap-2">
            {(
              [
                ['all', 'All'],
                ['found', 'Found'],
                ['not_found', 'Not found'],
                ['other', 'Unknown / errors'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  filter === id
                    ? 'bg-cyan-400 text-slate-950'
                    : 'border border-slate-700 text-slate-300 hover:bg-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((hit) => (
              <HitCard key={hit.name} hit={hit} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
