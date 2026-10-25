import React, { useState } from 'react';
import { Radio, Lock, User, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n';
import { LangToggle } from './LangToggle';

export const LoginPage: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { signIn, signUp, notice: accountNotice } = useAuth();
  const { t, dir } = useI18n();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (mode === 'signin') await signIn(email, password);
      else if (!(await signUp(email, password))) setNotice(t('confirmEmail'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('somethingWrong'));
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    'w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500';

  return (
    <div dir={dir} className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 selection:bg-cyan-500 selection:text-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex items-center justify-between gap-2">
          {onBack ? (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-200"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              {t('backToGeo')}
            </button>
          ) : (
            <span />
          )}
          <LangToggle />
        </div>
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Radio className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">GeoPhone Intelligence</span>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4"
        >
          <div>
            <h1 className="text-base font-bold">
              {mode === 'signin' ? t('loginContinue') : t('loginCreate')}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {mode === 'signin' ? t('loginSub') : t('signupSub')}
            </p>
          </div>

          <label className="block">
            <span className="sr-only">Email</span>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className={inputClass}
                type="email"
                placeholder={t('emailPh')}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </label>

          <label className="block">
            <span className="sr-only">Password</span>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className={inputClass}
                type="password"
                placeholder={t('passwordPh')}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </label>

          {accountNotice && (
            <p role="alert" className="text-sm text-amber-300">{accountNotice}</p>
          )}

          {notice && (
            <p role="status" className="text-xs text-emerald-400">{notice}</p>
          )}

          {error && (
            <p role="alert" className="text-xs text-rose-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-60 rounded-lg transition-colors"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'signin' ? t('signIn') : t('createAccountBtn')}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError('');
            }}
            className="w-full text-xs text-slate-400 hover:text-cyan-300 transition-colors"
          >
            {mode === 'signin' ? t('noAccount') : t('haveAccount')}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-4">
          {t('byUsing')}{' '}
          <a href="/terms" className="underline hover:text-slate-300">{t('terms')}</a>{' '}{t('and')}{' '}
          <a href="/privacy" className="underline hover:text-slate-300">{t('privacy')}</a>.
        </p>
      </div>
    </div>
  );
};

