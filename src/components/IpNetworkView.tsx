import React, { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Globe2, Loader2, Search, Wifi, Eye, Info } from 'lucide-react';
import { lookupIp, type IpLookupResult } from '../services/ipService';

interface IpNetworkViewProps {
  onOpenGodEye: (target: { lat: number; lng: number; label: string }) => void;
}

interface ConnectionInfo {
  online: boolean;
  type?: string;
  downlinkMbps?: number;
  rttMs?: number;
  saveData?: boolean;
}

function readConnection(): ConnectionInfo {
  const c = (navigator as Navigator & {
    connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };
  }).connection;
  return {
    online: navigator.onLine,
    type: c?.effectiveType,
    downlinkMbps: c?.downlink,
    rttMs: c?.rtt,
    saveData: c?.saveData,
  };
}

const Row: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) =>
  value ? (
    <div className="flex items-baseline justify-between gap-4 py-1.5 border-b border-slate-800/60 last:border-0 text-xs">
      <span className="text-slate-400 shrink-0">{label}</span>
      <span className="text-slate-100 font-mono text-right break-all">{value}</span>
    </div>
  ) : null;

const IpCard: React.FC<{
  title: string;
  result: IpLookupResult;
  onOpenGodEye: IpNetworkViewProps['onOpenGodEye'];
}> = ({ title, result, onOpenGodEye }) => {
  const mapEl = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapEl.current) return;
    const map = L.map(mapEl.current, { center: [result.lat, result.lng], zoom: 9, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    // IP geolocation is city-level at best, so the area is drawn as a circle, not a pin
    L.circle([result.lat, result.lng], {
      radius: 15000,
      color: '#22d3ee',
      fillColor: '#22d3ee',
      fillOpacity: 0.15,
      weight: 2,
    }).addTo(map);
    L.circleMarker([result.lat, result.lng], { radius: 5, color: '#fff', weight: 2, fillColor: '#22d3ee', fillOpacity: 1 }).addTo(map);
    setTimeout(() => map.invalidateSize(), 100);
    return () => {
      map.remove();
    };
  }, [result.lat, result.lng]);

  const place = [result.city, result.region, result.country].filter(Boolean).join(', ');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-100">{title}</h3>
        <button
          onClick={() => onOpenGodEye({ lat: result.lat, lng: result.lng, label: `${result.ip} · ${place}` })}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg transition-colors whitespace-nowrap"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Open in God Eye</span>
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="p-5">
          <Row label="IP address" value={result.ip} />
          <Row label="Host" value={result.hostname} />
          <Row label="Location" value={`${result.flag} ${place}`.trim()} />
          <Row label="Postal code" value={result.postal} />
          <Row label="Coordinates" value={`${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`} />
          <Row label="ISP" value={result.isp} />
          <Row label="Organisation" value={result.org !== result.isp ? result.org : ''} />
          <Row label="ASN" value={result.asn ? `AS${result.asn}` : ''} />
          <Row label="Time zone" value={result.timezone ? `${result.timezone} (UTC${result.utcOffset})` : ''} />
          <Row label="Type" value={result.type} />
        </div>
        <div ref={mapEl} className="h-64 lg:h-auto min-h-[16rem] bg-slate-950" />
      </div>
    </div>
  );
};

export const IpNetworkView: React.FC<IpNetworkViewProps> = ({ onOpenGodEye }) => {
  const [mine, setMine] = useState<IpLookupResult | null>(null);
  const [mineError, setMineError] = useState('');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<IpLookupResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [conn, setConn] = useState<ConnectionInfo>(readConnection);

  useEffect(() => {
    lookupIp()
      .then(setMine)
      .catch((err) => setMineError(err instanceof Error ? err.message : 'Could not look up your IP.'));
  }, []);

  useEffect(() => {
    const update = () => setConn(readConnection());
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    const c = (navigator as Navigator & { connection?: EventTarget }).connection;
    c?.addEventListener('change', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      c?.removeEventListener('change', update);
    };
  }, []);

  const handleLookup = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!query.trim()) return;
      setBusy(true);
      setError('');
      try {
        setResult(await lookupIp(query));
      } catch (err) {
        setResult(null);
        setError(err instanceof Error ? err.message : 'Lookup failed.');
      } finally {
        setBusy(false);
      }
    },
    [query],
  );

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Globe2 className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-bold text-slate-100">IP & Network Lookup</h2>
        </div>

        <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="IP address or website (e.g. 8.8.8.8 or example.com)"
              aria-label="IP address or domain"
              className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder:text-slate-600 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !query.trim()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-60 rounded-lg transition-colors"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Look up</span>
          </button>
        </form>

        {error && (
          <p role="alert" className="text-xs text-rose-400">
            {error}
          </p>
        )}

        <div className="flex items-start gap-2 text-[11px] text-slate-400 leading-relaxed">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-500" />
          <p>
            An IP address shows where the network provider is, usually the city and often not even that.
            Mobile data and VPNs can place a person hundreds of kilometres from their real position (a phone in
            Peshawar may appear in Lahore or Karachi). The circle on the map marks the approximate area, not a point.
          </p>
        </div>
      </div>

      {result && <IpCard title="Lookup result" result={result} onOpenGodEye={onOpenGodEye} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          {mine ? (
            <IpCard title="Your connection (as the internet sees it)" result={mine} onOpenGodEye={onOpenGodEye} />
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-xs text-slate-400 flex items-center gap-2">
              {mineError ? (
                <span role="alert" className="text-rose-400">
                  {mineError}
                </span>
              ) : (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Looking up your public IP...</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Wifi className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100">This device's network</h3>
          </div>
          <Row label="Status" value={conn.online ? 'Online' : 'Offline'} />
          <Row label="Connection quality" value={conn.type ? conn.type.toUpperCase() : 'Not reported by this browser'} />
          <Row label="Downlink" value={conn.downlinkMbps !== undefined ? `${conn.downlinkMbps} Mbps` : ''} />
          <Row label="Round trip" value={conn.rttMs !== undefined ? `${conn.rttMs} ms` : ''} />
          <Row label="Data saver" value={conn.saveData === undefined ? '' : conn.saveData ? 'On' : 'Off'} />
          <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
            Browsers do not expose the Wi-Fi name, signal strength or cell tower for privacy reasons. For exact
            position use the live GPS tab.
          </p>
        </div>
      </div>
    </div>
  );
};
