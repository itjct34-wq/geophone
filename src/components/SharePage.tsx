import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Radio, Loader2, Square, Flag, Check } from 'lucide-react';
import {
  fetchShareInfo,
  postSharePosition,
  reportLink,
  sendShareInfo,
  stopSharing,
  type ShareInfo,
  type SharedInfo,
} from '../services/shareService';
import { useI18n } from '../i18n';
import { LangToggle } from './LangToggle';

/** Lets the recipient report a link and optionally opt their number out of future links. */
const ReportControl: React.FC<{ token: string }> = ({ token }) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | 'reported' | 'blocked'>(null);
  const [err, setErr] = useState('');

  const send = async (block: boolean) => {
    setBusy(true);
    setErr('');
    try {
      await reportLink(token, block, reason);
      setDone(block ? 'blocked' : 'reported');
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('errReport'));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div role="status" className="flex items-start gap-2 p-3 rounded-lg bg-slate-950 border border-slate-700 text-sm text-slate-200">
        <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />
        <span>
          {t('thanks')}{done === 'blocked' ? t('optedOut') : t('reportSent')} {t('canClose')}
        </span>
      </div>
    );
  }

  return (
    <div className="pt-1">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200"
        >
          <Flag className="w-3.5 h-3.5" aria-hidden="true" /> {t('reportOpen')}
        </button>
      ) : (
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-700 space-y-2.5">
          <p className="text-sm text-slate-200">{t('reportPrompt')}</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder={t('reportPlaceholder')}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
          {err && <p role="alert" className="text-xs text-rose-300">{err}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => send(true)}
              disabled={busy}
              className="h-10 px-4 text-sm font-semibold text-slate-950 bg-amber-300 hover:bg-amber-200 disabled:opacity-60 rounded-lg transition-colors"
            >
              {t('reportBlockBtn')}
            </button>
            <button
              onClick={() => send(false)}
              disabled={busy}
              className="h-10 px-4 text-sm text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 border border-slate-700 rounded-lg transition-colors"
            >
              {t('reportJustBtn')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

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

/** Network effective type (e.g. "4G"), or '' when the browser does not report it. */
function describeConnection(): string {
  const c = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  return c?.effectiveType ? c.effectiveType.toUpperCase() : '';
}

/**
 * Page opened by the person who was asked to share their location. It needs no
 * account. Nothing is sent until they press the button and allow the browser's
 * location prompt, and sending only continues while this page stays open.
 */
export const SharePage: React.FC<{ token: string }> = ({ token }) => {
  const { t, dir, lang } = useI18n();
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

  // Reflect the chosen language on the document for correct scrolling/direction.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  useEffect(() => {
    fetchShareInfo(token)
      .then(setInfo)
      .catch((err) => setLoadError(err instanceof Error ? err.message : t('loadError')));
    // t is stable per language; we only want this on token change
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const picked: SharedInfo = {};
    if (shareName && nameValue.trim()) picked.name = nameValue.trim();
    if (shareDevice) picked.device = describeDevice();
    if (shareLanguage) {
      picked.language = navigator.language;
      picked.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    if (shareConnection) picked.connection = describeConnection() || 'unknown';
    return picked;
  };

  const start = async () => {
    setError('');

    // Send only the extra details that were ticked, once, before anything else
    const picked = chosenInfo();
    if (Object.keys(picked).length > 0) {
      try {
        await sendShareInfo(token, picked);
        setInfoSent(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errSendDetails'));
        return;
      }
    }
    if (!shareLocation) return; // details only: no location is requested

    if (!navigator.geolocation) {
      setError(t('errNoGeo'));
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
            setError(t('errEnded'));
            halt();
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : t('errSendPos'));
        }
      },
      (err) => {
        setError(err.code === err.PERMISSION_DENIED ? t('errDenied') : t('errNoPos'));
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
    <main dir={dir} lang={lang} className="min-h-screen bg-slate-950 text-slate-100 flex items-start sm:items-center justify-center px-4 pt-10 pb-12 sm:py-10">
      <div className="w-full max-w-sm space-y-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Radio className="w-5 h-5" aria-hidden="true" />
            </div>
            <span className="text-lg font-bold tracking-tight">GeoPhone</span>
          </div>
          <LangToggle />
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl shadow-black/30">
          {children}
        </div>
      </div>
    </main>
  );

  if (loadError) return shell(<p role="alert" className="text-sm text-rose-300">{loadError}</p>);
  if (!info) {
    return shell(
      <div role="status" aria-label="Loading" className="flex justify-center py-4 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
      </div>,
    );
  }

  if (info.state !== 'active') {
    const message =
      info.state === 'ended' ? t('endedTitle') : info.state === 'expired' ? t('expiredTitle') : t('invalidTitle');
    return shell(
      <>
        <h1 className="text-lg font-bold tracking-tight">{message}</h1>
        <p className="text-sm text-slate-300">{t('nothingShared')}</p>
      </>,
    );
  }

  if (stopped) {
    return shell(
      <>
        <h1 className="text-lg font-bold tracking-tight">{t('stoppedTitle')}</h1>
        <p className="text-sm text-slate-300">{t('stoppedBody')}</p>
      </>,
    );
  }

  const who = info.requested_by || t('someone');
  const conn = describeConnection();
  const nothingChosen = !shareLocation && !shareName && !shareDevice && !shareLanguage && !shareConnection;

  const choice = (opts: {
    checked: boolean;
    onChange: (v: boolean) => void;
    title: string;
    detail: string;
    children?: React.ReactNode;
  }) => (
    <div>
      <label className="flex items-start gap-3 px-4 py-3 min-h-[3.25rem] cursor-pointer hover:bg-slate-800/40 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-cyan-400">
        <input
          type="checkbox"
          checked={opts.checked}
          onChange={(e) => opts.onChange(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-400 focus:outline-none"
        />
        <span className="min-w-0">
          <span className="block text-sm font-medium text-slate-100">{opts.title}</span>
          <span className="block text-xs text-slate-400 break-words">{opts.detail}</span>
        </span>
      </label>
      {opts.checked && opts.children}
    </div>
  );

  return shell(
    <>
      <div className="space-y-2">
        <h1 className="text-xl font-bold tracking-tight text-balance">{t('title', { who })}</h1>
        <p className="text-sm text-slate-300 leading-relaxed">{t('subtitle')}</p>
      </div>

      {!sharing && !infoSent && (
        <fieldset className="rounded-xl border border-slate-800 divide-y divide-slate-800/80 overflow-hidden">
          <legend className="sr-only">{t('whatToShare')}</legend>

          {choice({
            checked: shareLocation,
            onChange: setShareLocation,
            title: t('posTitle'),
            detail: t('posDetail'),
          })}

          {choice({
            checked: shareName,
            onChange: setShareName,
            title: t('nameTitle'),
            detail: t('nameDetail'),
            children: (
              <div className="px-4 pb-3 pl-12">
                <input
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  maxLength={60}
                  placeholder={t('namePlaceholder')}
                  aria-label={t('nameTitle')}
                  autoComplete="name"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                />
              </div>
            ),
          })}

          {choice({
            checked: shareDevice,
            onChange: setShareDevice,
            title: t('deviceTitle'),
            detail: describeDevice(),
          })}

          {choice({
            checked: shareLanguage,
            onChange: setShareLanguage,
            title: t('langTitle'),
            detail: `${navigator.language}, ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
          })}

          {choice({
            checked: shareConnection,
            onChange: setShareConnection,
            title: t('connTitle'),
            detail: conn || t('connUnknown'),
          })}
        </fieldset>
      )}

      {sharing ? (
        <div className="space-y-3">
          <div
            role="status"
            aria-live="polite"
            className="p-4 bg-emerald-950/30 border border-emerald-800/50 rounded-xl text-sm text-emerald-200 space-y-1"
          >
            <div className="flex items-center gap-2 font-semibold text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" /> {t('sharingTitle')}
            </div>
            <div className="text-xs text-emerald-200/90">
              {accuracy !== null ? t('accuracy', { n: accuracy }) : t('finding')}
              {lastSent && t('lastSent', { time: lastSent.toLocaleTimeString() })}
            </div>
          </div>
          <button
            onClick={stop}
            className="w-full h-12 flex items-center justify-center gap-2 text-base font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <Square className="w-4 h-4" aria-hidden="true" /> {t('stopSharing')}
          </button>
        </div>
      ) : infoSent ? (
        <div className="space-y-3">
          <div role="status" aria-live="polite" className="p-4 bg-emerald-950/30 border border-emerald-800/50 rounded-xl text-sm text-emerald-200">
            {t('infoSentMsg')}
          </div>
          <button
            onClick={stop}
            className="w-full h-12 flex items-center justify-center gap-2 text-base font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <Square className="w-4 h-4" aria-hidden="true" /> {t('done')}
          </button>
        </div>
      ) : (
        <button
          onClick={start}
          disabled={nothingChosen}
          className="w-full h-12 text-base font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:bg-slate-800 disabled:text-slate-500 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          {nothingChosen ? t('chooseWhat') : shareLocation ? t('shareLocationBtn') : t('sendDetailsBtn')}
        </button>
      )}

      {error && (
        <p role="alert" className="text-sm text-rose-300">
          {error}
        </p>
      )}

      <p className="text-xs text-slate-400 leading-relaxed">{t('disclaimer')}</p>

      <ReportControl token={token} />

      <p className="text-xs text-slate-500">
        <a href="/terms" className="underline hover:text-slate-300">{t('terms')}</a>
        {' · '}
        <a href="/privacy" className="underline hover:text-slate-300">{t('privacy')}</a>
      </p>
    </>,
  );
};
