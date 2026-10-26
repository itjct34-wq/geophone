import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  Loader2,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  SkipForward,
  BookOpen,
} from 'lucide-react';
import type { TabId } from './Navbar';
import {
  detectSpiderFootTargetType,
  runSpiderFootScan,
  type SpiderFootScanReport,
  type SpiderFootModuleResult,
  type SpiderFootTargetType,
} from '../services/spiderfootService';
import { fetchAiStatus, requestAiBrief, type AiStatus } from '../services/aiBriefService';

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

const DEEP_TOOLS: Array<{ tab: TabId; label: string }> = [
  { tab: 'phoneinfoga', label: 'PhoneInfoga-style' },
  { tab: 'caller_check', label: 'Caller check' },
  { tab: 'sherlock', label: 'Sherlock' },
  { tab: 'holehe', label: 'Holehe' },
  { tab: 'shodan', label: 'Shodan' },
  { tab: 'osint_providers', label: 'Free API suite' },
  { tab: 'spiderfoot', label: 'SpiderFoot detail' },
  { tab: 'public_apis', label: 'Public APIs catalog' },
  { tab: 'lookup', label: 'Phone lookup' },
  { tab: 'ip', label: 'IP & network' },
  { tab: 'resource_hub', label: 'Resource hub' },
];

/**
 * Section 2 — Search all resources: one target → in-app OSINT suite + optional AI brief.
 */
export const SearchAllResourcesView: React.FC<{
  initialTarget?: string;
  onUsePhone?: (n: string) => void;
  onOpenTab?: (tab: TabId) => void;
}> = ({ initialTarget = '', onUsePhone, onOpenTab }) => {
  const [target, setTarget] = useState(initialTarget);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('');
  const [report, setReport] = useState<SpiderFootScanReport | null>(null);
  const [error, setError] = useState('');
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiBrief, setAiBrief] = useState('');
  const [aiMeta, setAiMeta] = useState('');
  const [aiError, setAiError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (initialTarget) setTarget(initialTarget);
  }, [initialTarget]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchAiStatus(controller.signal).then(setAiStatus);
    return () => controller.abort();
  }, []);

  const guessed: SpiderFootTargetType | null = target.trim()
    ? detectSpiderFootTargetType(target)
    : null;

  const cancel = () => {
    abortRef.current?.abort();
    setBusy(false);
    setAiBusy(false);
    setPhase('');
  };

  const run = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!target.trim()) {
      setError('Enter a phone, email, username, IP, domain, or similar target.');
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError('');
    setAiBrief('');
    setAiError('');
    setAiMeta('');
    setReport(null);
    setPhase('Running in-app OSINT modules…');
    // Yield so the spinner paints before heavy async work.
    await new Promise((r) => setTimeout(r, 0));
    try {
      const next = await runSpiderFootScan(target.trim(), undefined, controller.signal);
      if (controller.signal.aborted) return;
      setReport(next);
      setPhase(`Done · ${next.modules.length} modules · ${next.events.length} events`);
      if (next.targetType === 'phone' && next.raw.phoneInfoga?.number.e164) {
        onUsePhone?.(next.raw.phoneInfoga.number.e164);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Search failed.');
        setPhase('');
      }
    } finally {
      if (abortRef.current === controller) setBusy(false);
    }
  };

  const runAiBrief = async () => {
    if (!report) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setAiBusy(true);
    setAiError('');
    setAiBrief('');
    try {
      const result = await requestAiBrief(
        {
          target: report.target,
          targetType: report.targetType,
          modules: report.modules.map((m) => ({
            name: m.name,
            status: m.status,
            summary: m.summary,
          })),
          events: report.events.slice(0, 80).map((e) => ({
            type: e.type,
            data: e.data,
            module: e.module,
          })),
        },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      if (result.error || !result.brief) {
        setAiError(result.error || result.hint || 'AI brief unavailable.');
        return;
      }
      setAiBrief(result.brief);
      setAiMeta(`${result.provider} · ${result.model}`);
    } finally {
      if (abortRef.current === controller) setAiBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          <Search className="h-4 w-4" aria-hidden="true" />
          Search all resources
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Search about a target in every available resource
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-400">
          One hub for phone, email, username, IP, domain and more. Runs GeoPhone&apos;s in-app OSINT
          suite (PhoneInfoga-style, Sherlock, Holehe, caller check, DNS, Shodan, free APIs) with
          timeouts so the screen stays responsive. Deep tools stay one click away below.
        </p>
      </header>

      <form
        onSubmit={run}
        className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6 space-y-4"
      >
        <label className="block text-sm font-medium text-slate-200">
          Target
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="e.g. +14155552671 · user@example.com · handle · 1.1.1.1 · example.com"
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
          />
        </label>
        {guessed && (
          <p className="text-xs text-slate-500">
            Detected type: <span className="text-cyan-300">{guessed}</span>
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy || !target.trim()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-400 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search all resources
          </button>
          {(busy || aiBusy) && (
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
            Bounded concurrency · client timeouts · Cancel anytime
          </span>
        </div>
        {phase && (
          <p role="status" className="text-sm text-slate-300">
            {phase}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-rose-400">
            {error}
          </p>
        )}
      </form>

      {report && (
        <>
          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-white inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cyan-300" /> AI brief
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {aiStatus?.ready
                    ? aiStatus.message
                    : 'Optional: set GROQ_API_KEY or run Ollama — then generate a plain-language summary.'}
                </p>
              </div>
              <button
                type="button"
                disabled={aiBusy || !aiStatus?.ready}
                onClick={() => void runAiBrief()}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-400 px-3 text-xs font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-50"
              >
                {aiBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Generate AI brief
              </button>
            </div>
            {!aiStatus?.ready && (
              <p className="text-xs text-slate-500 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                Add <code className="text-cyan-300">GROQ_API_KEY</code> (free Groq cloud) or start{' '}
                <code className="text-cyan-300">Ollama</code> at{' '}
                <code className="text-slate-400">{aiStatus?.ollamaBase || 'http://localhost:11434'}</code>.
                Keys stay server-side via <code className="text-slate-400">/api/ai-brief</code>.
              </p>
            )}
            {aiError && (
              <p role="alert" className="text-sm text-rose-400">
                {aiError}
              </p>
            )}
            {aiBrief && (
              <div className="space-y-2">
                {aiMeta && <p className="text-[11px] text-slate-500">{aiMeta}</p>}
                <pre className="whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-200 leading-6">
                  {aiBrief}
                </pre>
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-white">Modules</h2>
            <ul className="space-y-2">
              {report.modules.map((m) => (
                <li
                  key={m.id}
                  className="flex gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4"
                >
                  <div className="mt-0.5 shrink-0">{statusIcon(m.status)}</div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-100">{m.name}</p>
                    <p className="text-sm text-slate-400 break-words">{m.summary}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {report.events.length > 0 && (
            <section className="space-y-2">
              <h2 className="font-semibold text-white">Correlated events</h2>
              <ul className="space-y-1.5 max-h-80 overflow-auto rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                {report.events.map((e, i) => (
                  <li key={`${e.type}-${i}`} className="text-xs text-slate-300 font-mono break-all">
                    <span className="text-cyan-400">{e.type}</span> {e.data}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <section>
        <h2 className="mb-3 font-semibold text-white inline-flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-slate-400" /> Deep tools
        </h2>
        <div className="flex flex-wrap gap-2">
          {DEEP_TOOLS.map((tool) => (
            <button
              key={tool.tab}
              type="button"
              onClick={() => onOpenTab?.(tool.tab)}
              className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300 hover:border-cyan-500/40"
            >
              {tool.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
