import React, { useEffect, useState } from 'react';
import { FlaskConical, Loader2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { runPermissionLabCollectors } from '../services/permissionLabCollectors';
import { fetchPermissionLabInfo, submitPermissionLabPayload, type LabInfo } from '../services/permissionLabService';

/**
 * Public /lab/<token> page — educational permission lab (R4ven-style signals).
 * Nothing is probed or uploaded until the visitor explicitly consents.
 * Results go only to the GeoPhone admin/owner inbox (Supabase), never Discord.
 */
export const PermissionLabPage: React.FC<{ token: string }> = ({ token }) => {
  const [info, setInfo] = useState<LabInfo | null>(null);
  const [loadError, setLoadError] = useState('');
  const [consented, setConsented] = useState(false);
  const [busy, setBusy] = useState(false);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [runError, setRunError] = useState('');

  const [optGeo, setOptGeo] = useState(true);
  const [optCam, setOptCam] = useState(false);
  const [optCamSnap, setOptCamSnap] = useState(false);
  const [optMic, setOptMic] = useState(false);
  const [optIp, setOptIp] = useState(true);

  useEffect(() => {
    fetchPermissionLabInfo(token)
      .then(setInfo)
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Could not load this lab link.'));
  }, [token]);

  const run = async () => {
    setBusy(true);
    setRunError('');
    try {
      const payload = await runPermissionLabCollectors({
        geolocation: optGeo,
        camera: optCam,
        captureCameraSnapshot: optCam && optCamSnap,
        microphone: optMic,
        networkIp: optIp,
      });
      const res = await submitPermissionLabPayload(token, payload);
      if (!res.ok) throw new Error(res.error || 'Submit failed');
      setDoneId(res.id ?? 'ok');
      setConsented(true);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : 'Lab run failed.');
    } finally {
      setBusy(false);
    }
  };

  if (loadError) {
    return (
      <Shell>
        <p role="alert" className="text-rose-300 text-sm">
          {loadError}
        </p>
      </Shell>
    );
  }

  if (!info) {
    return (
      <Shell>
        <Loader2 className="h-6 w-6 animate-spin text-emerald-400" aria-label="Loading" />
      </Shell>
    );
  }

  if (info.state !== 'active') {
    return (
      <Shell>
        <p className="text-sm text-slate-300">
          This permission-lab link is <strong className="text-white">{info.state}</strong>
          {info.label ? ` (${info.label})` : ''}. Ask the developer for a new link.
        </p>
      </Shell>
    );
  }

  if (doneId) {
    return (
      <Shell>
        <div className="flex items-start gap-3 rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm text-emerald-50">
            <p className="font-semibold">Lab complete — thank you</p>
            <p className="text-emerald-100/80">
              Captured signals were saved to the GeoPhone inbox for this campaign only. Nothing was
              sent to Discord, Telegram, or any external webhook.
            </p>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300 inline-flex items-center gap-1.5">
          <FlaskConical className="h-3.5 w-3.5" /> Developer permission lab
        </p>
        <h1 className="text-2xl font-bold text-white tracking-tight">{info.label || 'Permission lab'}</h1>
        <p className="text-sm text-slate-400 leading-6">
          This page demonstrates what a browser can expose when you grant permissions (location,
          camera, microphone) plus non-prompt metadata (user agent, screen, GPU). It is for
          education and authorized testing — inspired by open-source R4ven, rebuilt inside GeoPhone.
        </p>
      </header>

      <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-4 space-y-2 text-sm text-amber-50">
        <p className="font-semibold inline-flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" /> Consent required
        </p>
        <p className="text-amber-100/90 leading-6">
          No geolocation, camera, microphone, or network IP probe runs until you press{' '}
          <strong>I consent and run the lab</strong>. Results are stored in GeoPhone&apos;s admin
          inbox for the link owner. There is <strong>no Discord webhook</strong> and no third-party
          forwarding.
        </p>
        {info.expires_at && (
          <p className="text-xs text-amber-200/70">
            Link expires {new Date(info.expires_at).toLocaleString()}.
          </p>
        )}
      </div>

      <fieldset className="space-y-3" disabled={busy || consented}>
        <legend className="text-sm font-medium text-slate-200 mb-2">Choose what to probe</legend>
        <label className="flex items-start gap-2 text-sm text-slate-300">
          <input type="checkbox" className="mt-1" checked={optIp} onChange={(e) => setOptIp(e.target.checked)} />
          <span>
            Public IP + ISP approximate location (ipify / ip-api — same idea as R4ven; ISP-level, not GPS)
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-slate-300">
          <input type="checkbox" className="mt-1" checked={optGeo} onChange={(e) => setOptGeo(e.target.checked)} />
          <span>Geolocation permission + GPS coordinates if you allow the browser prompt</span>
        </label>
        <label className="flex items-start gap-2 text-sm text-slate-300">
          <input type="checkbox" className="mt-1" checked={optCam} onChange={(e) => setOptCam(e.target.checked)} />
          <span>Camera permission probe (stream stops immediately; no continuous capture)</span>
        </label>
        {optCam && (
          <label className="flex items-start gap-2 text-sm text-slate-400 ml-6">
            <input
              type="checkbox"
              className="mt-1"
              checked={optCamSnap}
              onChange={(e) => setOptCamSnap(e.target.checked)}
            />
            <span>Also send one educational JPEG snapshot to the inbox (optional)</span>
          </label>
        )}
        <label className="flex items-start gap-2 text-sm text-slate-300">
          <input type="checkbox" className="mt-1" checked={optMic} onChange={(e) => setOptMic(e.target.checked)} />
          <span>Microphone permission probe only — audio is never recorded or uploaded</span>
        </label>
        <p className="text-xs text-slate-500">
          Device metadata (UA, platform, screen, RAM/CPU hints, WebGL GPU) is always included after
          consent — it does not require a browser permission prompt.
        </p>
      </fieldset>

      {runError && (
        <p role="alert" className="text-sm text-rose-300">
          {runError}
        </p>
      )}

      <button
        type="button"
        disabled={busy || (!optGeo && !optCam && !optMic && !optIp)}
        onClick={() => void run()}
        className="h-11 px-5 rounded-xl bg-emerald-400 text-slate-950 text-sm font-semibold hover:bg-emerald-300 disabled:opacity-50 inline-flex items-center gap-2"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        I consent and run the lab
      </button>
    </Shell>
  );
};

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-10">
    <div className="mx-auto max-w-lg space-y-6">{children}</div>
  </div>
);
