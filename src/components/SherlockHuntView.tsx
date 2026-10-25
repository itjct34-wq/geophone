import React, { useRef, useState } from 'react';
import {
  UserSearch,
  Loader2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  Terminal,
  ShieldCheck,
} from 'lucide-react';
import { runSherlockHunt, type SherlockHit, type SherlockHuntReport } from '../services/sherlockService';

function statusBadge(hit: SherlockHit) {
  switch (hit.status) {
    case 'found':
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
          <CheckCircle2 className="h-3 w-3" /> Found
        </span>
      );
    case 'not_found':
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-600 bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          <XCircle className="h-3 w-3" /> Not found
        </span>
      );
    case 'manual':
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
          <Eye className="h-3 w-3" /> Verify
        </span>
      );
    case 'invalid':
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
          <AlertTriangle className="h-3 w-3" /> Invalid
        </span>
      );
    case 'error':
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-300">
          <AlertTriangle className="h-3 w-3" /> Error
        </span>
      );
    default: {
      const _exhaustive: never = hit.status;
      return _exhaustive;
    }
  }
}

function ResultCard({ hit }: { hit: SherlockHit }) {
  return (
    <a
      href={hit.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-cyan-500/40 hover:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-slate-100">{hit.name}</span>
        {statusBadge(hit)}
      </div>
      <span className="truncate text-[11px] font-mono text-slate-500">{hit.url}</span>
      {hit.detail && <p className="text-xs text-slate-500">{hit.detail}</p>}
      <span className="inline-flex items-center gap-1 text-xs text-cyan-300">
        Open profile <ExternalLink className="h-3 w-3" />
      </span>
    </a>
  );
}

export const SherlockHuntView: React.FC = () => {
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<SherlockHuntReport | null>(null);
  const [filter, setFilter] = useState<'all' | 'found' | 'not_found' | 'other'>('all');
  const abortRef = useRef<AbortController | null>(null);

  const valid = /^[a-zA-Z0-9_.-]{1,60}$/.test(username.trim());

  const cancel = () => {
    abortRef.current?.abort();
    setBusy(false);
  };

  const run = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!valid) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    try {
      const next = await runSherlockHunt(username.trim(), controller.signal);
      if (!controller.signal.aborted) {
        setReport(next);
        setFilter('all');
      }
    } finally {
      if (abortRef.current === controller) setBusy(false);
    }
  };

  const probed = report?.results ?? [];
  const filtered = probed.filter((hit) => {
    if (filter === 'all') return true;
    if (filter === 'found') return hit.status === 'found';
    if (filter === 'not_found') return hit.status === 'not_found';
    return hit.status === 'error' || hit.status === 'invalid';
  });

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          <UserSearch className="h-4 w-4" aria-hidden="true" />
          Sherlock / Username hunt
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Find usernames across public sites
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-400">
          In-app scanner inspired by open-source{' '}
          <a
            href="https://github.com/sherlock-project/sherlock"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-300 hover:underline"
          >
            Sherlock
          </a>
          : public profile URL checks only (status / message detection). No login-walled private APIs.
          Results can be wrong when sites change — always verify in the browser.
        </p>
      </header>

      <form
        onSubmit={run}
        className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6 space-y-4"
      >
        <label className="block text-sm font-medium text-slate-200">
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. public_handle"
            autoComplete="off"
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
          />
        </label>
        {!valid && username.trim() && (
          <p className="text-xs text-amber-300">Use 1–60 letters, numbers, dots, underscores or hyphens.</p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy || !valid}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-400 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserSearch className="h-4 w-4" />}
            Run username hunt
          </button>
          {busy && (
            <button
              type="button"
              onClick={cancel}
              className="h-10 px-4 text-sm text-amber-200 border border-amber-800/60 rounded-xl hover:bg-amber-950/40"
            >
              Cancel
            </button>
          )}
          <span className="text-xs text-slate-500 inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Concurrency 5 · 35s client timeout · Cancel anytime
          </span>
        </div>
      </form>

      <aside className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-slate-200">
          <Terminal className="h-4 w-4 text-cyan-300" />
          Optional local Sherlock CLI (full catalogue)
        </div>
        <p>
          The in-app hunt covers a curated subset suitable for Vercel. Power users can install the
          upstream CLI for hundreds of sites:
        </p>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 font-mono text-[11px] text-cyan-200">
{`pipx install sherlock-project
sherlock your_username
# or: pip install sherlock-project`}
        </pre>
        <p className="text-slate-500">
          Docs:{' '}
          <a
            href="https://github.com/sherlock-project/sherlock"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-300 hover:underline"
          >
            github.com/sherlock-project/sherlock
          </a>
        </p>
      </aside>

      {report?.error && (
        <p role="alert" className="text-sm text-rose-400">
          {report.error}
        </p>
      )}

      {report && (
        <>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <span className="font-semibold text-white">@{report.username}</span>
            <span className="text-emerald-300">{report.summary.found} found</span>
            <span className="text-slate-500">{report.summary.not_found} not found</span>
            <span className="text-amber-200/80">{report.summary.other} other</span>
            {report.attribution && (
              <span className="w-full text-[11px] text-slate-500">{report.attribution}</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter results">
            {(
              [
                ['all', 'All probed'],
                ['found', 'Found'],
                ['not_found', 'Not found'],
                ['other', 'Errors'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={filter === id}
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
              <ResultCard key={`${hit.name}-${hit.url}`} hit={hit} />
            ))}
          </div>

          {report.manual.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-semibold text-white">Manual verify (bot-blocked platforms)</h2>
              <p className="text-xs text-slate-500">
                These sites usually require you to open the URL yourself — same honest approach as
                Sherlock when automated detection is unreliable.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {report.manual.map((hit) => (
                  <ResultCard key={`manual-${hit.name}`} hit={hit} />
                ))}
              </div>
            </section>
          )}

          {report.cliHint && (
            <p className="text-[11px] font-mono text-slate-500">{report.cliHint}</p>
          )}
        </>
      )}
    </div>
  );
};
