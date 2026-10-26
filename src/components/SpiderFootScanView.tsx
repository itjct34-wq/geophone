import React, { useState } from 'react';
import {
  Network,
  Loader2,
  CheckCircle2,
  XCircle,
  SkipForward,
  AlertTriangle,
  Terminal,
  ShieldCheck,
} from 'lucide-react';
import {
  detectSpiderFootTargetType,
  runSpiderFootScan,
  type SpiderFootScanReport,
  type SpiderFootTargetType,
  type SpiderFootModuleResult,
} from '../services/spiderfootService';

function statusIcon(status: SpiderFootModuleResult['status']) {
  switch (status) {
    case 'ok':
      return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    case 'partial':
      return <AlertTriangle className="h-4 w-4 text-amber-300" />;
    case 'skipped':
      return <SkipForward className="h-4 w-4 text-slate-500" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-rose-400" />;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

const TYPE_LABELS: Record<SpiderFootTargetType, string> = {
  phone: 'Phone',
  email: 'Email',
  username: 'Username',
  ip: 'IP',
  domain: 'Domain',
};

export const SpiderFootScanView: React.FC<{
  initialTarget?: string;
  onUsePhone?: (n: string) => void;
}> = ({ initialTarget = '', onUsePhone }) => {
  const [input, setInput] = useState(initialTarget);
  const [forcedType, setForcedType] = useState<SpiderFootTargetType | 'auto'>('auto');
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<SpiderFootScanReport | null>(null);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (initialTarget) setInput(initialTarget);
  }, [initialTarget]);

  const guessed = input.trim() ? detectSpiderFootTargetType(input) : null;

  const run = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!input.trim()) {
      setError('Enter a phone, email, username, IP, or domain.');
      return;
    }
    setBusy(true);
    setError('');
    const controller = new AbortController();
    try {
      const type = forcedType === 'auto' ? undefined : forcedType;
      const next = await runSpiderFootScan(input.trim(), type, controller.signal);
      setReport(next);
      if (next.targetType === 'phone' && next.raw.phoneInfoga?.number.e164) {
        onUsePhone?.(next.raw.phoneInfoga.number.e164);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          <Network className="h-4 w-4" aria-hidden="true" />
          SpiderFoot-style scan
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Correlated OSINT scan
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-400">
          In-app orchestrator inspired by open-source{' '}
          <span className="text-slate-300">SpiderFoot</span>: pick a target, run public modules in
          parallel, and review correlated events here. Does not redirect to spiderfoot.net — and does
          not require the full Python server for this subset.
        </p>
      </header>

      <form
        onSubmit={run}
        className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6 space-y-4"
      >
        <label className="block text-sm font-medium text-slate-200">
          Target
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="phone, email, username, IP, or domain"
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
          />
        </label>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-slate-500">Type:</span>
          {(['auto', 'phone', 'email', 'username', 'ip', 'domain'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setForcedType(id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                forcedType === id
                  ? 'bg-cyan-400 text-slate-950'
                  : 'border border-slate-700 text-slate-300 hover:bg-slate-900'
              }`}
            >
              {id === 'auto' ? `Auto${guessed ? ` (${TYPE_LABELS[guessed]})` : ''}` : TYPE_LABELS[id]}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-400 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Network className="h-4 w-4" />}
          Run SpiderFoot-style scan
        </button>
        <p className="text-xs text-slate-500 inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          Modules: PhoneInfoga-style, Caller check, Sherlock, Holehe, DNS, IP geo, Shodan
        </p>
        {error && (
          <p role="alert" className="text-sm text-rose-400">
            {error}
          </p>
        )}
      </form>

      <aside className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-slate-200">
          <Terminal className="h-4 w-4 text-cyan-300" />
          Optional full SpiderFoot (power users)
        </div>
        <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 font-mono text-[11px] text-cyan-200">
{`pip install spiderfoot
# or clone https://github.com/smicallef/spiderfoot
python sf.py -l 127.0.0.1:5001`}
        </pre>
      </aside>

      {report && (
        <>
          <div className="text-sm text-slate-300">
            <span className="font-semibold text-white">{report.target}</span>
            <span className="text-slate-500"> · {TYPE_LABELS[report.targetType]} · </span>
            <span className="text-slate-500">
              {report.modules.length} modules · {report.events.length} events
            </span>
          </div>

          <section className="space-y-2">
            <h2 className="font-semibold text-white">Modules</h2>
            <ul className="space-y-2">
              {report.modules.map((m) => (
                <li
                  key={m.id}
                  className="flex gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4"
                >
                  <div className="mt-0.5 shrink-0">{statusIcon(m.status)}</div>
                  <div>
                    <div className="font-medium text-slate-100">
                      {m.name}{' '}
                      <span className="text-[10px] uppercase text-slate-500">{m.status}</span>
                    </div>
                    <p className="text-sm text-slate-400">{m.summary}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-white">Correlated events</h2>
            {report.events.length === 0 ? (
              <p className="text-sm text-slate-500">No events produced.</p>
            ) : (
              <ul className="space-y-1.5 max-h-[28rem] overflow-y-auto">
                {report.events.map((ev, i) => (
                  <li
                    key={`${ev.type}-${i}-${ev.data.slice(0, 24)}`}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs"
                  >
                    <span className="font-mono text-cyan-300">{ev.type}</span>
                    <span className="text-slate-600"> · {ev.module}</span>
                    <span className="text-slate-600"> · {ev.confidence}</span>
                    <div className="mt-0.5 break-all text-slate-300">{ev.data}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
};
