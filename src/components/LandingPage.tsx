import React from 'react';
import {
  Radio,
  Search,
  Globe2,
  Network,
  UserSearch,
  BookOpen,
  MapPin,
  Satellite,
  ShieldCheck,
  Lock,
  ArrowRight,
  Check,
} from 'lucide-react';
import type { TabId } from './Navbar';
import { useI18n, type TKey } from '../i18n';
import { LangToggle } from './LangToggle';

interface LandingPageProps {
  onSignIn: () => void;
  onGetStarted: () => void;
  onOpenTool: (tab: TabId) => void;
}

interface ToolCard {
  tab: TabId;
  icon: React.ReactNode;
  titleKey: TKey;
  bodyKey: TKey;
  paid: boolean;
}

const FREE_TOOLS: ToolCard[] = [
  { tab: 'lookup', icon: <Search className="w-5 h-5" aria-hidden="true" />, titleKey: 'toolLookupTitle', bodyKey: 'toolLookupBody', paid: false },
  { tab: 'ip', icon: <Network className="w-5 h-5" aria-hidden="true" />, titleKey: 'toolIpTitle', bodyKey: 'toolIpBody', paid: false },
  { tab: 'public_osint', icon: <UserSearch className="w-5 h-5" aria-hidden="true" />, titleKey: 'toolOsintTitle', bodyKey: 'toolOsintBody', paid: false },
  { tab: 'resource_hub', icon: <BookOpen className="w-5 h-5" aria-hidden="true" />, titleKey: 'toolHubTitle', bodyKey: 'toolHubBody', paid: false },
];

const PAID_TOOLS: ToolCard[] = [
  { tab: 'live_gps', icon: <MapPin className="w-5 h-5" aria-hidden="true" />, titleKey: 'toolLiveTitle', bodyKey: 'toolLiveBody', paid: true },
  { tab: 'god_eye', icon: <Satellite className="w-5 h-5" aria-hidden="true" />, titleKey: 'toolGlobeTitle', bodyKey: 'toolGlobeBody', paid: true },
  { tab: 'investigations', icon: <Globe2 className="w-5 h-5" aria-hidden="true" />, titleKey: 'toolInvestTitle', bodyKey: 'toolInvestBody', paid: true },
];

const FAQ: { q: TKey; a: TKey }[] = [
  { q: 'faq1q', a: 'faq1a' },
  { q: 'faq2q', a: 'faq2a' },
  { q: 'faq3q', a: 'faq3a' },
  { q: 'faq4q', a: 'faq4a' },
];

/**
 * Public, index-friendly marketing page shown to logged-out visitors. It
 * describes what GeoPhone does, which tools are free, and links straight into
 * the free tools (which work without an account) or to sign-in for paid ones.
 */
export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn, onGetStarted, onOpenTool }) => {
  const { t, dir } = useI18n();

  const Card: React.FC<{ tool: ToolCard }> = ({ tool }) => (
    <button
      onClick={() => onOpenTool(tool.tab)}
      className="group text-start rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-cyan-500/50 hover:bg-slate-900"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-500/20">
          {tool.icon}
        </div>
        {tool.paid ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300">
            <Lock className="h-3 w-3" aria-hidden="true" /> {t('badgePaid')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
            <Check className="h-3 w-3" aria-hidden="true" /> {t('badgeFree')}
          </span>
        )}
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-100">{t(tool.titleKey)}</h3>
      <p className="mt-1.5 text-sm leading-6 text-slate-400">{t(tool.bodyKey)}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-cyan-300">
        {tool.paid ? t('cardSeeIncluded') : t('cardTryNow')}
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden="true" />
      </span>
    </button>
  );

  return (
    <div dir={dir} className="flex min-h-screen flex-col bg-slate-950 text-slate-100 selection:bg-slate-600 selection:text-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
              <Radio className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="text-base font-bold tracking-tight">GeoPhone Intelligence</span>
          </div>
          <div className="flex items-center gap-2">
            <LangToggle />
            <button
              onClick={onSignIn}
              className="hidden h-9 rounded-lg border border-slate-700 px-3 text-sm font-medium text-slate-200 transition-colors hover:text-white sm:inline-flex sm:items-center"
            >
              {t('signIn')}
            </button>
            <button
              onClick={onGetStarted}
              className="h-9 rounded-lg bg-cyan-400 px-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300"
            >
              {t('getStarted')}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-6 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> {t('heroBadge')}
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">{t('heroTitle')}</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">{t('heroSubtitle')}</p>
            <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-2 mx-auto text-start">
              <button
                onClick={() => onOpenTool('consent')}
                className="rounded-2xl border border-emerald-800/50 bg-emerald-950/20 p-5 transition hover:border-emerald-500/50"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">Consent link</span>
                <p className="mt-2 text-base font-bold text-white">Share a link to get info with consent</p>
                <p className="mt-1.5 text-sm text-slate-400">Person agrees → location / device they share</p>
              </button>
              <button
                onClick={() => onOpenTool('search')}
                className="rounded-2xl border border-cyan-800/50 bg-cyan-950/20 p-5 transition hover:border-cyan-500/50"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">Search resources</span>
                <p className="mt-2 text-base font-bold text-white">Search a target in all available resources</p>
                <p className="mt-1.5 text-sm text-slate-400">Phone · email · username · IP · domain OSINT</p>
              </button>
            </div>
            <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                onClick={onGetStarted}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300"
              >
                {t('createFreeAccount')}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">{t('heroNote')}</p>
          </div>
        </section>

        {/* Free tools */}
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-labelledby="free-tools">
          <div className="mb-6">
            <h2 id="free-tools" className="text-2xl font-bold text-white">{t('freeToolsTitle')}</h2>
            <p className="mt-1 text-sm text-slate-400">{t('freeToolsSub')}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FREE_TOOLS.map((tool) => (
              <Card key={tool.tab} tool={tool} />
            ))}
          </div>
        </section>

        {/* Paid tools */}
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-labelledby="paid-tools">
          <div className="mb-6">
            <h2 id="paid-tools" className="text-2xl font-bold text-white">{t('paidTitle')}</h2>
            <p className="mt-1 text-sm text-slate-400">{t('paidSub')}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PAID_TOOLS.map((tool) => (
              <Card key={tool.tab} tool={tool} />
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-labelledby="how">
          <h2 id="how" className="text-2xl font-bold text-white">{t('howTitle')}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { n: '1', t: t('how1t'), b: t('how1b') },
              { n: '2', t: t('how2t'), b: t('how2b') },
              { n: '3', t: t('how3t'), b: t('how3b') },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/10 text-sm font-bold text-cyan-300 ring-1 ring-cyan-500/20">
                  {s.n}
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-100">{s.t}</h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-400">{s.b}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6" aria-labelledby="faq">
          <h2 id="faq" className="text-2xl font-bold text-white">{t('faqTitle')}</h2>
          <div className="mt-6 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-100 marker:hidden">
                  {t(f.q)}
                </summary>
                <p className="mt-2 text-sm leading-6 text-slate-400">{t(f.a)}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-slate-900/40 p-8 text-center sm:p-12">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">{t('ctaTitle')}</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-300">{t('ctaBody')}</p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                onClick={() => onOpenTool('lookup')}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-6 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300"
              >
                {t('ctaTryFree')}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </button>
              <button
                onClick={onGetStarted}
                className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-700 px-6 text-sm font-semibold text-slate-100 transition-colors hover:border-slate-500"
              >
                {t('createFreeAccount')}
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 text-xs text-slate-500">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <span className="font-semibold text-slate-400">{t('footerTagline')}</span>
          <nav className="flex items-center gap-4">
            <a href="/terms" className="hover:text-slate-300">{t('terms')}</a>
            <a href="/privacy" className="hover:text-slate-300">{t('privacy')}</a>
          </nav>
        </div>
      </footer>
    </div>
  );
};
