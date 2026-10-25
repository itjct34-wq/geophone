import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Inbox, Loader2, MapPin, RefreshCw } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  listPermissionLabCampaigns,
  listPermissionLabEvents,
  markPermissionLabEventRead,
  type PermissionLabCampaign,
  type PermissionLabEvent,
} from '../services/permissionLabService';

export const AdminPermissionInbox: React.FC = () => {
  const [campaigns, setCampaigns] = useState<PermissionLabCampaign[]>([]);
  const [events, setEvents] = useState<PermissionLabEvent[]>([]);
  const [campaignFilter, setCampaignFilter] = useState<string>('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selected, setSelected] = useState<PermissionLabEvent | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [c, e] = await Promise.all([
        listPermissionLabCampaigns(),
        listPermissionLabEvents({
          campaignId: campaignFilter || undefined,
          unreadOnly,
        }),
      ]);
      setCampaigns(c);
      setEvents(e);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load inbox.');
    } finally {
      setLoading(false);
    }
  }, [campaignFilter, unreadOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  const unreadCount = useMemo(() => events.filter((e) => !e.read_at).length, [events]);

  const open = async (ev: PermissionLabEvent) => {
    setSelected(ev);
    if (!ev.read_at) {
      try {
        await markPermissionLabEventRead(ev.id, true);
        setEvents((prev) => prev.map((x) => (x.id === ev.id ? { ...x, read_at: new Date().toISOString() } : x)));
        setSelected((s) => (s && s.id === ev.id ? { ...s, read_at: new Date().toISOString() } : s));
      } catch {
        /* non-fatal */
      }
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 inline-flex items-center gap-2">
            <Inbox className="h-5 w-5 text-cyan-300" /> Permission lab inbox
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            R4ven-equivalent signals from consent lab links. Stored in Supabase only — no Discord /
            Telegram webhooks.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="h-9 px-3 rounded-lg border border-slate-700 text-sm text-slate-300 inline-flex items-center gap-1.5 hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-xs text-slate-400">
          Campaign
          <select
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            className="ml-2 h-9 px-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-slate-100"
          >
            <option value="">All links</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} ({c.token.slice(0, 6)}…)
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-300 inline-flex items-center gap-2">
          <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
          Unread only {unreadCount > 0 && !unreadOnly ? `(${unreadCount} unread in view)` : ''}
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm text-rose-300">
          {error}
        </p>
      )}

      {loading ? (
        <div className="py-8 flex justify-center text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-slate-500">No lab events yet. Create a link under Consent → Permission lab.</p>
      ) : (
        <ul className="space-y-2">
          {events.map((ev) => (
            <li key={ev.id}>
              <button
                type="button"
                onClick={() => void open(ev)}
                className={`w-full text-left rounded-xl border p-3 transition-colors ${
                  selected?.id === ev.id
                    ? 'border-cyan-500/50 bg-cyan-950/20'
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-600'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-100">
                    {!ev.read_at && (
                      <span className="mr-2 inline-block h-2 w-2 rounded-full bg-cyan-400" aria-label="Unread" />
                    )}
                    {ev.campaign?.label ?? 'Campaign'} · {ev.client_ip || 'no IP'}
                  </span>
                  <span className="text-xs text-slate-500">{new Date(ev.created_at).toLocaleString()}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1 truncate">
                  {ev.user_agent || '—'}
                  {ev.lat != null && ev.lng != null && (
                    <span className="ml-2 text-emerald-400 inline-flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" />
                      {ev.lat.toFixed(4)}, {ev.lng.toFixed(4)}
                    </span>
                  )}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && <EventDetail event={selected} onClose={() => setSelected(null)} />}
    </section>
  );
};

const EventDetail: React.FC<{ event: PermissionLabEvent; onClose: () => void }> = ({ event, onClose }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInst = useRef<L.Map | null>(null);
  const snap = event.payload?.camera_snapshot_jpeg_base64;

  useEffect(() => {
    if (event.lat == null || event.lng == null || !mapRef.current) return;
    if (mapInst.current) {
      mapInst.current.remove();
      mapInst.current = null;
    }
    const map = L.map(mapRef.current, { zoomControl: true }).setView([event.lat, event.lng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    L.marker([event.lat, event.lng]).addTo(map);
    mapInst.current = map;
    return () => {
      map.remove();
      mapInst.current = null;
    };
  }, [event.id, event.lat, event.lng]);

  const pretty = useMemo(() => {
    const copy = { ...event.payload } as Record<string, unknown>;
    if (copy.camera_snapshot_jpeg_base64) {
      copy.camera_snapshot_jpeg_base64 = `[${String(copy.camera_snapshot_jpeg_base64).length} chars base64 — shown above]`;
    }
    return JSON.stringify(copy, null, 2);
  }, [event.payload]);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-100">Event detail</h3>
        <button type="button" onClick={onClose} className="text-xs text-slate-400 hover:text-white">
          Close
        </button>
      </div>

      {event.lat != null && event.lng != null && (
        <div>
          <p className="text-xs text-slate-400 mb-2">
            GPS {event.lat.toFixed(6)}, {event.lng.toFixed(6)}
            {event.accuracy != null ? ` ±${Math.round(event.accuracy)}m` : ''} ·{' '}
            <a
              className="text-cyan-400 hover:underline"
              href={`https://www.google.com/maps/place/${event.lat},${event.lng}`}
              target="_blank"
              rel="noreferrer"
            >
              Google Maps
            </a>
          </p>
          <div ref={mapRef} className="h-48 w-full rounded-lg overflow-hidden border border-slate-800" />
        </div>
      )}

      {typeof snap === 'string' && snap.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 mb-2">Camera snapshot (consent lab)</p>
          <img
            src={`data:image/jpeg;base64,${snap}`}
            alt="Consent lab camera snapshot"
            className="max-h-48 rounded-lg border border-slate-800"
          />
        </div>
      )}

      <pre className="text-xs text-slate-300 overflow-auto max-h-80 p-3 rounded-lg bg-slate-900 border border-slate-800">
        {pretty}
      </pre>
    </div>
  );
};
