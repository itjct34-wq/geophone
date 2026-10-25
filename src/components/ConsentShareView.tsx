import React from 'react';
import { Link2, ShieldCheck, MapPin, Smartphone, Wifi } from 'lucide-react';
import { LiveHandsetTrackerView } from './LiveHandsetTrackerView';
import { CampaignCenter } from './CampaignCenter';
import type { TabId } from './Navbar';

/**
 * Section 1 — Consent / share link.
 * Primary job: generate a consent link → person accepts → shared info appears here.
 */
export const ConsentShareView: React.FC<{
  currentNumber?: string;
  hasPaid: boolean;
  onOpenTab?: (tab: TabId) => void;
  onRequestUpgrade?: () => void;
}> = ({ currentNumber = '', hasPaid, onOpenTab, onRequestUpgrade }) => {
  const [sub, setSub] = React.useState<'live' | 'campaigns'>('live');

  return (
    <div className="space-y-6">
      <header className="space-y-3 max-w-3xl">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
          <Link2 className="h-4 w-4" aria-hidden="true" />
          Consent link
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Share a link to get info with consent
        </h1>
        <p className="text-sm leading-6 text-slate-400">
          Create a short link, send it to someone, and only after they agree can GeoPhone show
          location, device, network and handset details they choose to share. There is no silent
          tracking — maps and live updates require the person&apos;s explicit consent on the share
          page.
        </p>
        <ul className="grid gap-2 sm:grid-cols-3 text-xs text-slate-400">
          <li className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
            <MapPin className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            Consent GPS / last known position when they tap Share
          </li>
          <li className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
            <Smartphone className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            Optional device / language / timezone they disclose
          </li>
          <li className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
            <Wifi className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            Cell / tower context only with paid OpenCelliD-style resolve
          </li>
        </ul>
        <p className="text-xs text-slate-500 inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          Recipients can report a link or opt their number out at any time.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSub('live')}
          className={`h-9 px-3 rounded-lg text-sm font-medium ${
            sub === 'live' ? 'bg-emerald-400 text-slate-950' : 'border border-slate-700 text-slate-300'
          }`}
        >
          Live consent map
        </button>
        <button
          type="button"
          onClick={() => setSub('campaigns')}
          className={`h-9 px-3 rounded-lg text-sm font-medium ${
            sub === 'campaigns' ? 'bg-emerald-400 text-slate-950' : 'border border-slate-700 text-slate-300'
          }`}
        >
          Campaign short links
        </button>
        {onOpenTab && (
          <button
            type="button"
            onClick={() => onOpenTab('investigations')}
            className="h-9 px-3 rounded-lg text-sm border border-slate-700 text-slate-400 hover:text-slate-200"
          >
            Monitoring (paid)
          </button>
        )}
      </div>

      {!hasPaid ? (
        <div className="rounded-2xl border border-amber-800/50 bg-amber-950/20 p-5 space-y-3">
          <p className="text-sm text-amber-100">
            Consent links, live maps and campaign SMS are part of paid access. You can still browse
            public search tools in <strong>Search all resources</strong>.
          </p>
          {onRequestUpgrade && (
            <button
              type="button"
              onClick={onRequestUpgrade}
              className="h-10 px-4 rounded-xl bg-amber-300 text-sm font-semibold text-slate-950 hover:bg-amber-200"
            >
              Unlock consent tools
            </button>
          )}
        </div>
      ) : sub === 'live' ? (
        <LiveHandsetTrackerView currentNumber={currentNumber} />
      ) : (
        <CampaignCenter />
      )}
    </div>
  );
};
