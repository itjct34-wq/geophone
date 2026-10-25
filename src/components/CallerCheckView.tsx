import React, { useState } from 'react';
import {
  PhoneCall,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Info,
  ExternalLink,
} from 'lucide-react';
import { parsePhoneNumber } from '../services/phoneParser';
import { runCallerCheck, type CallerCheckResponse } from '../services/callerCheckService';

interface CallerCheckViewProps {
  initialNumber?: string;
  onUseNumber?: (number: string) => void;
}

export const CallerCheckView: React.FC<CallerCheckViewProps> = ({
  initialNumber = '',
  onUseNumber,
}) => {
  const [input, setInput] = useState(initialNumber);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CallerCheckResponse | null>(null);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (initialNumber && initialNumber !== input) setInput(initialNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNumber]);

  const onSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const parsed = parsePhoneNumber(input);
    if (!parsed.isValid || !parsed.e164) {
      setError('Enter a valid phone number first.');
      setResult(null);
      return;
    }
    setBusy(true);
    setError('');
    onUseNumber?.(parsed.e164);
    try {
      const next = await runCallerCheck(parsed.e164);
      setResult(next);
      if (next.error) setError(next.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Caller check failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          <PhoneCall className="h-4 w-4" aria-hidden="true" />
          Spam &amp; caller reputation
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Caller check</h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-400">
          Looks up carrier, line type and validation via documented public APIs (AbstractAPI, Numverify,
          Twilio Lookup when configured). This is <strong className="font-semibold text-slate-300">not</strong>{' '}
          Truecaller and does not use private Truecaller APIs, tokens, or app reverse engineering.
        </p>
      </header>

      <div
        role="note"
        className="rounded-xl border border-amber-800/50 bg-amber-950/20 px-4 py-3 text-xs text-amber-100/90 flex gap-2"
      >
        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          Use for spam/reputation and format checks on numbers you have a lawful basis to investigate.
          Provider attribution is shown on every result.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6 space-y-4"
      >
        <label className="block text-sm font-medium text-slate-200">
          Phone number
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. +14155552671"
            autoComplete="tel"
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-400 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />}
          Run caller check
        </button>
        {error && (
          <p role="alert" className="text-sm text-rose-400">
            {error}
          </p>
        )}
      </form>

      {result && !result.configured && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-3">
          <div className="flex items-start gap-2 text-slate-200">
            <Info className="h-5 w-5 text-cyan-300 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="font-semibold">API keys not configured</h2>
              <p className="mt-1 text-sm text-slate-400">
                {result.message ||
                  'Add at least one provider key on the server to enable live caller checks.'}
              </p>
            </div>
          </div>
          <ul className="text-sm text-slate-300 list-disc pl-5 space-y-1">
            <li>
              <code className="text-cyan-300">ABSTRACTAPI_PHONE_KEY</code> —{' '}
              <a
                href="https://www.abstractapi.com/phone-validation-api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-300 hover:underline inline-flex items-center gap-1"
              >
                AbstractAPI Phone Validation <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>
              <code className="text-cyan-300">NUMVERIFY_API_KEY</code> —{' '}
              <a
                href="https://numverify.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-300 hover:underline inline-flex items-center gap-1"
              >
                Numverify <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>
              <code className="text-cyan-300">TWILIO_ACCOUNT_SID</code> +{' '}
              <code className="text-cyan-300">TWILIO_AUTH_TOKEN</code> —{' '}
              <a
                href="https://www.twilio.com/docs/lookup/v2-api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-300 hover:underline inline-flex items-center gap-1"
              >
                Twilio Lookup v2 <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          </ul>
          <p className="text-xs text-slate-500">
            Copy names from <code className="text-slate-400">.env.example</code>. Keys stay server-side
            (Vercel / local Vite API proxy) and never ship in the browser bundle.
          </p>
        </section>
      )}

      {result?.configured && (
        <section className="space-y-3">
          <h2 className="font-semibold text-white">Provider results for {result.number}</h2>
          {result.disclaimer && <p className="text-xs text-slate-500">{result.disclaimer}</p>}
          {result.providers.length === 0 ? (
            <p className="text-sm text-slate-400">No provider responses.</p>
          ) : (
            <ul className="space-y-2">
              {result.providers.map((p) => (
                <li
                  key={p.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex gap-3"
                >
                  {p.status === 'ok' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap gap-2 items-baseline">
                      <span className="font-medium text-slate-100">{p.name}</span>
                      {p.attribution && (
                        <span className="text-[11px] text-slate-500">via {p.attribution}</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-300">{p.summary}</p>
                    <dl className="grid gap-1 sm:grid-cols-2 text-[11px] text-slate-500 font-mono">
                      {p.callerName && (
                        <div>
                          <span className="text-slate-600">callerName=</span>
                          {p.callerName}
                        </div>
                      )}
                      {p.carrier && (
                        <div>
                          <span className="text-slate-600">carrier=</span>
                          {p.carrier}
                        </div>
                      )}
                      {p.lineType && (
                        <div>
                          <span className="text-slate-600">lineType=</span>
                          {p.lineType}
                        </div>
                      )}
                      {p.country && (
                        <div>
                          <span className="text-slate-600">country=</span>
                          {p.country}
                        </div>
                      )}
                      {p.location && (
                        <div>
                          <span className="text-slate-600">location=</span>
                          {p.location}
                        </div>
                      )}
                      {p.spamRisk && (
                        <div>
                          <span className="text-slate-600">spamRisk=</span>
                          {p.spamRisk}
                        </div>
                      )}
                    </dl>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};
