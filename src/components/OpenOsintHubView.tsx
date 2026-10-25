import React, { useState } from 'react';
import {
  LayoutDashboard,
  Loader2,
  Fingerprint,
  UserSearch,
  AtSign,
  PhoneCall,
  Network,
  Radar,
  MapPin,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import type { TabId } from './Navbar';
import {
  detectSpiderFootTargetType,
  runSpiderFootScan,
  type SpiderFootScanReport,
  type SpiderFootTargetType,
} from '../services/spiderfootService';

interface OpenOsintHubViewProps {
  onOpenTab: (tab: TabId) => void;
  phoneNumber?: string;
  onUsePhone?: (n: string) => void;
}

const MODULE_CARDS: Array<{
  tab: TabId;
  title: string;
  body: string;
  icon: React.ReactNode;
  types: SpiderFootTargetType[];
}> = [
  {
    tab: 'phoneinfoga',
    title: 'PhoneInfoga-style',
    body: 'Number parse, carrier, footprints',
    icon: <Fingerprint className="h-5 w-5" />,
    types: ['phone'],
  },
  {
    tab: 'caller_check',
    title: 'Caller check',
    body: 'Spam / reputation APIs',
    icon: <PhoneCall className="h-5 w-5" />,
    types: ['phone'],
  },
  {
    tab: 'sherlock',
    title: 'Sherlock hunt',
    body: 'Username across public sites',
    icon: <UserSearch className="h-5 w-5" />,
    types: ['username'],
  },
  {
    tab: 'holehe',
    title: 'Holehe email',
    body: 'Email → registered accounts',
    icon: <AtSign className="h-5 w-5" />,
    types: ['email'],
  },
  {
    tab: 'shodan',
    title: 'Shodan',
    body: 'Host ports, org, vulns',
    icon: <Radar className="h-5 w-5" />,
    types: ['ip', 'domain'],
  },
  {
    tab: 'osint_providers',
    title: 'Free API suite',
    body: 'IP-API, AbuseIPDB, VT, OTX, Hunter…',
    icon: <Shield className="h-5 w-5" />,
    types: ['ip', 'email', 'domain'],
  },
  {
    tab: 'spiderfoot',
    title: 'SpiderFoot scan',
    body: 'Full correlated orchestrator',
    icon: <Network className="h-5 w-5" />,
    types: ['phone', 'email', 'username', 'ip', 'domain'],
  },
  {
    tab: 'live_gps',
    title: 'Consent location',
    body: 'Share-link map (agreement only)',
    icon: <MapPin className="h-5 w-5" />,
    types: ['phone'],
  },
];

/**
 * In-app Open OSINT hub — runs scanners inside GeoPhone (not redirect portals).
 */
export const OpenOsintHubView: React.FC<OpenOsintHubViewProps> = ({
  onOpenTab,
  phoneNumber = '',
  onUsePhone,
}) => {
  const [target, setTarget] = useState(phoneNumber);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<SpiderFootScanReport | null>(null);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (phoneNumber) setTarget(phoneNumber);
  }, [phoneNumber]);

  const guessed = target.trim() ? detectSpiderFootTargetType(target) : null;

  const runHubScan = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!target.trim()) {
      setError('Enter a target to scan in-app.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const next = await runSpiderFootScan(target.trim());
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
          <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
          Open OSINT
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          In-app OSINT workspace
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-400">
          Run GeoPhone&apos;s public OSINT modules from one place. Scans execute inside this app
          (orchestrated like SpiderFoot) — primary UX is not a redirect to external OSINT portals.
        </p>
      </header>

      <form
        onSubmit={runHubScan}
        className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6 space-y-4"
      >
        <label className="block text-sm font-medium text-slate-200">
          Target (phone · email · username · IP · domain)
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="e.g. +14155552671, user@example.com, handle, 1.1.1.1"
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
          />
        </label>
        {guessed && (
          <p className="text-xs text-slate-500">
            Detected type: <span className="text-cyan-300">{guessed}</span>
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-400 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LayoutDashboard className="h-4 w-4" />}
          Run Open OSINT scan
        </button>
        <p className="text-xs text-slate-500 inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          Results stay in GeoPhone
        </p>
        {error && (
          <p role="alert" className="text-sm text-rose-400">
            {error}
          </p>
        )}
      </form>

      <section>
        <h2 className="mb-3 font-semibold text-white">Open a dedicated module</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {MODULE_CARDS.map((card) => (
            <button
              key={card.tab}
              type="button"
              onClick={() => onOpenTab(card.tab)}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-start transition hover:border-cyan-500/40 hover:bg-slate-900"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
                {card.icon}
              </div>
              <div className="mt-3 font-medium text-slate-100">{card.title}</div>
              <p className="mt-1 text-xs text-slate-500">{card.body}</p>
            </button>
          ))}
        </div>
      </section>

      {report && (
        <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="font-semibold text-white">
            Hub scan · {report.target}{' '}
            <span className="text-sm font-normal text-slate-500">({report.targetType})</span>
          </h2>
          <ul className="space-y-2">
            {report.modules.map((m) => (
              <li key={m.id} className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm">
                <span className="font-medium text-slate-100">{m.name}</span>
                <span className="ml-2 text-[10px] uppercase text-slate-500">{m.status}</span>
                <p className="text-xs text-slate-400">{m.summary}</p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">
            {report.events.length} correlated events — open SpiderFoot scan for the full event list.
          </p>
          <button
            type="button"
            onClick={() => onOpenTab('spiderfoot')}
            className="text-xs text-cyan-300 hover:underline"
          >
            Open full SpiderFoot-style view
          </button>
        </section>
      )}
    </div>
  );
};
