import React, { useEffect, useState } from 'react';
import { MapPin, Eye, Send, Clock } from 'lucide-react';
import { PASTED_LABEL, timeAgo, type LastKnownLocation } from '../services/lastLocationService';

interface LastKnownLocationCardProps {
  number: string;
  location: LastKnownLocation | null;
  onAskToShare: () => void;
  onOpenGodEye?: (target: { lat: number; lng: number; label: string }) => void;
  /** Saves a pasted location; resolves to an error message, or null when it worked. */
  onSavePasted: (text: string) => Promise<string | null>;
}

const PastePanel: React.FC<{ onSavePasted: (text: string) => Promise<string | null> }> = ({ onSavePasted }) => {
  const [text, setText] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const error = await onSavePasted(text);
      if (error) setMessage({ ok: false, text: error });
      else {
        setMessage({ ok: true, text: 'Saved as the last known location.' });
        setText('');
      }
    } catch (err) {
      setMessage({
        ok: false,
        text: err instanceof Error ? err.message : 'Could not save the pasted location. Please try again.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <details className="w-full border-t border-slate-800/70 pt-2">
      <summary className="cursor-pointer select-none text-xs font-semibold text-slate-300">
        Easier: paste a location they sent you
      </summary>
      <div className="pt-2 space-y-2">
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Ask them to send their location in WhatsApp or Google Maps (<em>Share location</em> or <em>Send current location</em>).
          Copy the link or the coordinates and paste it here.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="Pasted location"
            placeholder="https://maps.google.com/?q=34.0151,71.5249  or  34.0151, 71.5249"
            className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={save}
            disabled={busy || !text.trim()}
            className="px-3.5 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
          >
            Save as last location
          </button>
        </div>
        {message && (
          <p role="status" className={`text-[11px] ${message.ok ? 'text-emerald-300' : 'text-rose-300'}`}>
            {message.text}
          </p>
        )}
      </div>
    </details>
  );
};

export const LastKnownLocationCard: React.FC<LastKnownLocationCardProps> = ({
  number,
  location,
  onAskToShare,
  onOpenGodEye,
  onSavePasted,
}) => {
  // Re-render every 15 s so "2 minutes ago" keeps counting
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 15000);
    return () => clearInterval(id);
  }, []);

  if (!location) {
    return (
      <div className="bg-slate-900 border border-dashed border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-slate-800 text-slate-400 shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-slate-100">No location shared yet</h3>
            <p className="text-xs text-slate-400 max-w-xl">
              {number} only has a position here once the person chooses to share it. Send a consent link, or paste a
              location they sent you.
            </p>
          </div>
        </div>
        <button
          onClick={onAskToShare}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send consent link</span>
        </button>
        <div className="basis-full">
          <PastePanel onSavePasted={onSavePasted} />
        </div>
      </div>
    );
  }

  const when = timeAgo(location.at);
  const label = `${number} · ${location.live ? 'live' : `last seen ${when}`}`;

  return (
    <div
      className={`rounded-xl p-4 border flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3 ${
        location.live ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-slate-900 border-cyan-900/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded-lg shrink-0 ${
            location.live ? 'bg-emerald-500/15 text-emerald-300' : 'bg-cyan-500/10 text-cyan-300'
          }`}
        >
          {location.live ? <MapPin className="w-4 h-4 animate-pulse" /> : <Clock className="w-4 h-4" />}
        </div>
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold text-slate-100">
            {location.live ? 'Live location' : 'Last known location'} <span className="text-slate-400 font-normal">· {when}</span>
          </h3>
          <p className="text-xs text-slate-300 font-mono tabular-nums">
            {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            {location.accuracy !== null && ` · ±${Math.round(location.accuracy)} m`}
          </p>
          <p className="text-xs text-slate-400">
            {location.label === PASTED_LABEL
              ? 'Pasted by you from a message or map link.'
              : `Shared by the person from their own phone${location.label ? ` (link: ${location.label})` : ''}.`}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {onOpenGodEye && (
          <button
            onClick={() => onOpenGodEye({ lat: location.lat, lng: location.lng, label })}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg transition-colors whitespace-nowrap"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>God Eye</span>
          </button>
        )}
        <button
          onClick={onAskToShare}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ask again</span>
        </button>
      </div>
      <div className="basis-full">
        <PastePanel onSavePasted={onSavePasted} />
      </div>
    </div>
  );
};
