import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Loader2, KeyRound } from 'lucide-react';
import QRCode from 'qrcode';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';

export type SecurityStatus = 'loading' | 'ok' | 'needs_step_up';

interface Props {
  onStatus: (status: SecurityStatus) => void;
}

/**
 * Admin two-step login (TOTP). Before enrolling, the admin works normally and is nudged
 * to set it up. Once a factor is verified, the database requires the second step (aal2),
 * so this panel steps the session up with the 6-digit code.
 */
export const AdminSecurity: React.FC<Props> = ({ onStatus }) => {
  const { refreshProfile } = useAuth();
  const [mode, setMode] = useState<'loading' | 'off' | 'step_up' | 'on' | 'enrolling'>('loading');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState(''); // data: URL of the QR image
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const verified = factors?.totp?.find((f) => f.status === 'verified');
    if (verified && aalData?.currentLevel === 'aal2') {
      setMode('on');
      setFactorId(verified.id);
      onStatus('ok');
    } else if (verified) {
      setMode('step_up');
      setFactorId(verified.id);
      onStatus('needs_step_up');
    } else {
      setMode('off');
      onStatus('ok'); // not enrolled yet: admin still works
    }
  }, [onStatus]);

  useEffect(() => {
    load();
  }, [load]);

  const startEnroll = async () => {
    setBusy(true);
    setError('');
    try {
      // Clear any abandoned, unverified factor first
      const { data: factors } = await supabase.auth.mfa.listFactors();
      for (const f of factors?.all ?? []) {
        if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error: e } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'GeoPhone admin ' + Date.now(),
      });
      if (e) throw e;
      setFactorId(data.id);
      setSecret(data.totp.secret);
      // Render the QR locally from the otpauth URI (no third party, no raw HTML)
      const png = await QRCode.toDataURL(data.totp.uri, { width: 200, margin: 2 });
      setQr(png);
      setMode('enrolling');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start setup.');
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!factorId) return;
    setBusy(true);
    setError('');
    try {
      const { data: ch, error: ce } = await supabase.auth.mfa.challenge({ factorId });
      if (ce) throw ce;
      const { error: ve } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code: code.trim() });
      if (ve) throw ve;
      setCode('');
      await refreshProfile();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code did not work. Try the current one.');
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    if (!factorId) return;
    if (!window.confirm('Turn off two-step login for the admin account?')) return;
    setBusy(true);
    try {
      await supabase.auth.mfa.unenroll({ factorId });
      await refreshProfile();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not turn it off.');
    } finally {
      setBusy(false);
    }
  };

  const codeInput = (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="6-digit code"
        aria-label="Authenticator code"
        className="h-11 w-36 px-3 bg-slate-950 border border-slate-700 rounded-lg text-base tracking-widest text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
      />
      <button
        onClick={verify}
        disabled={busy || code.length !== 6}
        className="h-11 px-5 text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:bg-slate-800 disabled:text-slate-500 rounded-lg transition-colors"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : 'Verify'}
      </button>
    </div>
  );

  if (mode === 'loading') {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (mode === 'step_up') {
    return (
      <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-5 space-y-3">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 mt-0.5 shrink-0 text-amber-300" aria-hidden="true" />
          <div>
            <h2 className="text-base font-bold text-amber-100">Enter your two-step code</h2>
            <p className="text-sm text-amber-100/90">Open your authenticator app and type the current 6-digit code to manage customers.</p>
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        {codeInput}
      </div>
    );
  }

  if (mode === 'enrolling') {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <KeyRound className="w-5 h-5 mt-0.5 shrink-0 text-cyan-400" aria-hidden="true" />
          <div>
            <h2 className="text-base font-bold text-slate-100">Scan this in your authenticator app</h2>
            <p className="text-sm text-slate-300">Google Authenticator, Microsoft Authenticator, Authy or similar. Then enter the code it shows.</p>
          </div>
        </div>
        {qr && (
          <div className="flex flex-wrap items-center gap-4">
            <img src={qr} alt="QR code for your authenticator app" className="w-40 h-40 bg-white rounded-xl p-2 shrink-0" />
            <div className="text-xs text-slate-400 space-y-1">
              <p>Cannot scan? Enter this key by hand:</p>
              <code className="text-slate-200 break-all">{secret}</code>
            </div>
          </div>
        )}
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        {codeInput}
      </div>
    );
  }

  if (mode === 'on') {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm text-emerald-300">
          <ShieldCheck className="w-4 h-4" aria-hidden="true" /> Two-step login is on
        </span>
        <button onClick={turnOff} disabled={busy} className="text-xs text-slate-400 hover:text-rose-300">
          Turn off
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 mt-0.5 shrink-0 text-amber-300" aria-hidden="true" />
        <div>
          <h2 className="text-base font-bold text-slate-100">Protect the admin account</h2>
          <p className="text-sm text-slate-300">This account controls payments and access. Add two-step login with an authenticator app.</p>
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      <button
        onClick={startEnroll}
        disabled={busy}
        className="h-11 px-5 text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-60 rounded-xl transition-colors whitespace-nowrap"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : 'Set up two-step login'}
      </button>
    </div>
  );
};
