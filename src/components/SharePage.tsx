import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Radio, MapPin, ShieldCheck, Loader2, Square } from 'lucide-react';
import {
  fetchShareInfo,
  postSharePosition,
  sendShareInfo,
  stopSharing,
  type ShareInfo,
  type SharedInfo,
} from '../services/shareService';

/** Short, readable description of the browser and system, e.g. "Chrome on Android". */
function describeDevice(): string {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
    ? 'Opera'
    : /Firefox\//.test(ua)
    ? 'Firefox'
    : /Chrome\//.test(ua)
    ? 'Chrome'
    : /Safari\//.test(ua)
    ? 'Safari'
    : 'Browser';
  const os = /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad|iPod/.test(ua)
    ? 'iOS'
    : /Windows/.test(ua)
    ? 'Windows'
    : /Mac OS X/.test(ua)
    ? 'macOS'
    : /Linux/.test(ua)
    ? 'Linux'
    : 'an unknown system';
  return `${browser} on ${os}`;
}

function describeConnection(): string {
  const c = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  return c?.effectiveType ? c.effectiveType.toUpperCase() : 'Not reported by this browser';
}

/**
 * Page opened by the person who was asked to share their location. It needs no
 * account. Nothing is sent until they press the button and allow the browser's
 * location prompt, and sending only continues while this page stays open.
 */
export const SharePage: React.FC<{ token: string }> = ({ token }) => {
  const [info, setInfo] = useState<ShareInfo | null>(null);
  const [loadError, setLoadError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const [error, setError] = useState('');

  // What the person chooses to share. Location is on by default; the rest are optional extras.
  const [shareLocation, setShareLocation] = useState(true);
  const [shareName, setShareName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [shareDevice, setShareDevice] = useState(false);
  const [shareLanguage, setShareLanguage] = useState(false);
  const [shareConnection, setShareConnection] = useState(false);
  const [infoSent, setInfoSent] = useState(false);

  const watchId = useRef<number | null>(null);
  const lastPostAt = useRef(0);
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);

  useEffect(() => {
    fetchShareInfo(token)
      .then(setInfo)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Could not load this link.'));
  }, [token]);

  const halt = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    wakeLock.current?.release().catch(() => undefined);
    wakeLock.current = null;
    setSharing(false);
  }, []);

  useEffect(() => halt, [halt]);

  const chosenInfo = (): SharedInfo => {
    const info: SharedInfo = {};
    if (shareName && nameValue.trim()) info.name = nameValue.trim();
    if (shareDevice) info.device = describeDevice();
    if (shareLanguage) {
      info.language = navigator.language;
      info.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    if (shareConnection) info.connection = describeConnection();
    return info;
  };

  const start = async () => {
    setError('');

    // Send only the extra details that were ticked, once, before anything else
    const info = chosenInfo();
    if (Object.keys(info).length > 0) {
      try {
        await sendShareInfo(token, info);
        setInfoSent(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not send the details you chose.');
        return;
      }
    }
    if (!shareLocation) return; // details only: no location is requested

    if (!navigator.geolocation) {
      setError('This browser cannot share a location.');
      return;
    }
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
      wakeLock.current = (await nav.wakeLock?.request('screen')) ?? null; // keeps the screen on so sharing continues
    } catch {
      /* not supported or refused: sharing still works while the page is visible */
    }

    setSharing(true);
    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        setAccuracy(Math.round(pos.coords.accuracy));
        const now = Date.now();
        if (now - lastPostAt.current < 3000) return; // at most one update every 3 seconds
        lastPostAt.current = now;
        try {
          const ok = await postSharePosition(token, pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
          if (ok) {
            setLastSent(new Date());
            setError('');
          } else {
            setError('This link has ended or expired, so sharing stopped.');
            halt();
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not send your position.');
        }
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied, so nothing was shared. You can allow it in your browser settings and try again.'
            : 'Could not get your position. Check that location services are on.',
        );
        halt();
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };

  const stop = async () => {
    halt();
    setStopped(true);
    try {
      await stopSharing(token);
    } catch {
      /* the local watcher is already stopped */
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex items-center justify-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Radio className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">GeoPhone</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">{children}</div>
      </div>
    </div>
  );

  if (loadError) return shell(<p role="alert" className="text-sm text-rose-400">{loadError}</p>);
  if (!info) return shell(<div className="flex justify-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin" /></div>);

  if (info.state !== 'active') {
    const message =
      info.state === 'ended'
        ? 'This sharing link has ended.'
        : info.state === 'expired'
        ? 'This sharing link has expired.'
        : 'This link is not valid.';
    return shell(
      <>
        <h1 className="text-base font-bold">{message}</h1>
        <p className="text-xs text-slate-400">Nothing is being shared. You can close this page.</p>
      </>,
    );
  }

  if (stopped) {
    return shell(
      <>
        <h1 className="text-base font-bold">Sharing stopped</h1>
        <p className="text-xs text-slate-400">Your location is no longer being sent. You can close this page.</p>
      </>,
    );
  }

  const who = info.requested_by || 'Someone';

  return shell(
    <>
      <div className="space-y-1">
        <h1 className="text-base font-bold">{who} is asking you to share some information</h1>
      </div>

      <ul className="text-xs text-slate-300 space-y-1.5">
        <li className="flex gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" /> Only what you tick below is shared, nothing else on your phone.</li>
        <li className="flex gap-2"><MapPin className="w-4 h-4 text-cyan-400 shrink-0" /> Your position updates while this page is open and stops when you close it or tap Stop.</li>
        <li className="flex gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" /> The link stops working on its own after 24 hours.</li>
      </ul>

      {!sharing && !infoSent && (
        <fieldset className="space-y-2.5 border border-slate-800 rounded-lg p-3">
          <legend className="px-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">What to share</legend>

          <label className="flex items-start gap-2 text-xs text-slate-200 cursor-pointer">
            <input type="checkbox" checked={shareLocation} onChange={(e) => setShareLocation(e.target.checked)} className="mt-0.5 accent-emerald-400" />
            <span>My position <span className="text-slate-500">(your phone will ask permission)</span></span>
          </label>

          <label className="flex items-start gap-2 text-xs text-slate-200 cursor-pointer">
            <input type="checkbox" checked={shareName} onChange={(e) => setShareName(e.target.checked)} className="mt-0.5 accent-emerald-400" />
            <span>My name</span>
          </label>
          {shareName && (
            <input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              maxLength={60}
              placeholder="Type the name you want to show"
              aria-label="Your name"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          )}

          <label className="flex items-start gap-2 text-xs text-slate-200 cursor-pointer">
            <input type="checkbox" checked={shareDevice} onChange={(e) => setShareDevice(e.target.checked)} className="mt-0.5 accent-emerald-400" />
            <span>My browser and system <span className="text-slate-500">({describeDevice()})</span></span>
          </label>

          <label className="flex items-start gap-2 text-xs text-slate-200 cursor-pointer">
            <input type="checkbox" checked={shareLanguage} onChange={(e) => setShareLanguage(e.target.checked)} className="mt-0.5 accent-emerald-400" />
            <span>My language and time zone <span className="text-slate-500">({navigator.language}, {Intl.DateTimeFormat().resolvedOptions().timeZone})</span></span>
          </label>

          <label className="flex items-start gap-2 text-xs text-slate-200 cursor-pointer">
            <input type="checkbox" checked={shareConnection} onChange={(e) => setShareConnection(e.target.checked)} className="mt-0.5 accent-emerald-400" />
            <span>My connection type <span className="text-slate-500">({describeConnection()})</span></span>
          </label>
        </fieldset>
      )}

      {sharing ? (
        <div className="space-y-3">
          <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-lg text-xs text-emerald-300 space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Your location is being shared
            </div>
            <div className="text-emerald-200/80">
              {accuracy !== null ? `Accuracy about ${accuracy} m. ` : 'Finding your position... '}
              {lastSent && `Last sent ${lastSent.toLocaleTimeString()}.`}
            </div>
          </div>
          <button
            onClick={stop}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            <Square className="w-4 h-4" /> Stop sharing
          </button>
        </div>
      ) : infoSent ? (
        <div className="space-y-3">
          <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-lg text-xs text-emerald-300">
            The details you chose were sent. Nothing else is being shared.
          </div>
          <button
            onClick={stop}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            <Square className="w-4 h-4" /> Done
          </button>
        </div>
      ) : (
        <button
          onClick={start}
          disabled={!shareLocation && !shareName && !shareDevice && !shareLanguage && !shareConnection}
          className="w-full px-4 py-3 text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-lg transition-colors"
        >
          {shareLocation ? 'Share my location' : 'Send the selected details'}
        </button>
      )}

      {error && (
        <p role="alert" className="text-xs text-rose-400">
          {error}
        </p>
      )}
      <p className="text-[11px] text-slate-500">
        Not expecting this? Close the page. Nothing is shared unless you tap the button and allow location access.
      </p>
    </>,
  );
};
