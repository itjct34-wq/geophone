import React, { useEffect, useState } from 'react';
import { MapPin, Eye, Send, Clock } from 'lucide-react';
import { timeAgo, type LastKnownLocation } from '../services/lastLocationService';

interface LastKnownLocationCardProps {
  number: string;
  location: LastKnownLocation | null;
  onAskToShare: () => void;
  onOpenGodEye?: (target: { lat: number; lng: number; label: string }) => void;
}

export const LastKnownLocationCard: React.FC<LastKnownLocationCardProps> = ({
  number,
  location,
  onAskToShare,
  onOpenGodEye,
}) => {
  // Re-render every 15 s so "2 minutes ago" keeps counting
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 15000);
    return () => clearInterval(id);
  }, []);

  if (!location) {
    return (
      <div className="bg-slate-900 border border-dashed border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-slate-800 text-slate-400 shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-slate-100">No last location for {number}</h3>
            <p className="text-xs text-slate-400 max-w-xl">
              A phone number alone does not reveal where it is. If the person opens a link you send and agrees to
              share, their last position is saved here automatically.
            </p>
          </div>
        </div>
        <button
          onClick={onAskToShare}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ask to share location</span>
        </button>
      </div>
    );
  }

  const when = timeAgo(location.at);
  const label = `${number} · ${location.live ? 'live' : `last seen ${when}`}`;

  return (
    <div
      className={`rounded-xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
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
          <p className="text-[11px] text-slate-500">
            Shared by the person from their own phone{location.label ? ` (link: ${location.label})` : ''}.
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
    </div>
  );
};
