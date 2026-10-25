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

interface LandingPageProps {
  onSignIn: () => void;
  onGetStarted: () => void;
  onOpenTool: (tab: TabId) => void;
}

interface ToolCard {
  tab: TabId;
  icon: React.ReactNode;
  title: string;
  body: string;
  paid: boolean;
}

const FREE_TOOLS: ToolCard[] = [
  {
    tab: 'lookup',
    icon: <Search className="w-5 h-5" aria-hidden="true" />,
    title: 'Phone number lookup',
    body: 'Check any number’s country, carrier, line type and whether it is valid — instantly, no sign-up needed.',
    paid: false,
  },
  {
    tab: 'ip',
    icon: <Network className="w-5 h-5" aria-hidden="true" />,
    title: 'IP & network lookup',
    body: 'Resolve an IP address or hostname to its network, approximate region and provider.',
    paid: false,
  },
  {
    tab: 'public_osint',
    icon: <UserSearch className="w-5 h-5" aria-hidden="true" />,
    title: 'Username, email & image search',
    body: 'Open-source research links to find public profiles, breach exposure and matching images across the web.',
    paid: false,
  },
  {
    tab: 'resource_hub',
    icon: <BookOpen className="w-5 h-5" aria-hidden="true" />,
    title: 'Resource hub',
    body: 'A curated set of trusted, public investigation and safety resources you can use right away.',
    paid: false,
  },
];

const PAID_TOOLS: ToolCard[] = [
  {
    tab: 'live_gps',
    icon: <MapPin className="w-5 h-5" aria-hidden="true" />,
    title: 'Consent-based live location',
    body: 'Send a link; when the person agrees, see their live and last known position, cell towers and triangulation.',
    paid: true,
  },
  {
    tab: 'god_eye',
    icon: <Satellite className="w-5 h-5" aria-hidden="true" />,
    title: 'God Eye 3D globe',
    body: 'A satellite globe that flies to the places you look up, with terrain, labels and orbit.',
    paid: true,
  },
  {
    tab: 'investigations',
    icon: <Globe2 className="w-5 h-5" aria-hidden="true" />,
    title: 'Investigations & monitoring',
    body: 'Track public domain and IP records over time and get a clear history of what changed.',
    paid: true,
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Is GeoPhone free to use?',
    a: 'Yes. Phone number lookup, IP and network lookup, and the open-source research tools are free and work without an account. Live location, the 3D globe, investigations and campaign tools are part of paid access.',
  },
  {
    q: 'Can I find someone’s location from their phone number?',
    a: 'Not covertly, and that is by design. A phone number tells you the country, carrier and line type — never a live position. To see where someone is, you send them a link; they open it, see who is asking, and choose to share. Nothing is collected without their tap.',
  },
  {
    q: 'Do I need to install anything?',
    a: 'No. GeoPhone runs in your browser on any phone or computer. Create a free account to save your lookup history and batch lists.',
  },
  {
    q: 'Is it private and consent-based?',
    a: 'Location sharing only ever works with the other person’s agreement, and they can stop at any time. Read the Terms and Privacy Policy for the full detail.',
  },
];

const Card: React.FC<{ tool: ToolCard; onOpen: (tab: TabId) => void }> = ({ tool, onOpen }) => (
  <button
    onClick={() => onOpen(tool.tab)}
    className="group text-left rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-cyan-500/50 hover:bg-slate-900"
  >
    <div className="flex items-center justify-between">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-500/20">
        {tool.icon}
      </div>
      {tool.paid ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300">
          <Lock className="h-3 w-3" aria-hidden="true" /> Paid
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
          <Check className="h-3 w-3" aria-hidden="true" /> Free
        </span>
      )}
    </div>
    <h3 className="mt-4 text-base font-bold text-slate-100">{tool.title}</h3>
    <p className="mt-1.5 text-sm leading-6 text-slate-400">{tool.body}</p>
    <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-cyan-300">
      {tool.paid ? 'See what’s included' : 'Try it now'}
      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
    </span>
  </button>
);

/**
 * Public, index-friendly marketing page shown to logged-out visitors. It
 * describes what GeoPhone does, which tools are free, and links straight into
 * the free tools (which work without an account) or to sign-in for paid ones.
 */
export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn, onGetStarted, onOpenTool }) => (
  <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-slate-950">
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
          <button
            onClick={onSignIn}
            className="h-9 rounded-lg border border-slate-700 px-3 text-sm font-medium text-slate-200 transition-colors hover:text-white"
          >
            Sign in
          </button>
          <button
            onClick={onGetStarted}
            className="h-9 rounded-lg bg-cyan-400 px-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300"
          >
            Get started
          </button>
        </div>
      </div>
    </header>

    <main className="flex-1">
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Consent-based by design
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Phone intelligence & maps, done the honest way
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Look up any phone number’s carrier, country and line type, explore IPs and networks, and run open-source
            research — free, in your browser. When you need someone’s location, you ask and they agree. No covert
            tracking, ever.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={() => onOpenTool('lookup')}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-6 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300"
            >
              Try a free phone lookup
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              onClick={onGetStarted}
              className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-700 px-6 text-sm font-semibold text-slate-100 transition-colors hover:border-slate-500"
            >
              Create a free account
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">No sign-up needed for the free tools. Your lookups stay on your device until you log in.</p>
        </div>
      </section>

      {/* Free tools */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-labelledby="free-tools">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 id="free-tools" className="text-2xl font-bold text-white">Free tools</h2>
            <p className="mt-1 text-sm text-slate-400">Use these right now — no account required.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FREE_TOOLS.map((t) => (
            <Card key={t.tab} tool={t} onOpen={onOpenTool} />
          ))}
        </div>
      </section>

      {/* Paid tools */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-labelledby="paid-tools">
        <div className="mb-6">
          <h2 id="paid-tools" className="text-2xl font-bold text-white">Paid features</h2>
          <p className="mt-1 text-sm text-slate-400">
            Consent-based location, the 3D globe and ongoing monitoring. Create an account and request access.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PAID_TOOLS.map((t) => (
            <Card key={t.tab} tool={t} onOpen={onOpenTool} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-labelledby="how">
        <h2 id="how" className="text-2xl font-bold text-white">How consent-based location works</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { n: '1', t: 'You send a link', b: 'Create a request and share the link by WhatsApp, SMS, Telegram or email.' },
            { n: '2', t: 'They see who’s asking', b: 'The person opens it, sees your name, and chooses exactly what to share.' },
            { n: '3', t: 'You see it on the map', b: 'Their live and last known position appears — and they can stop at any time.' },
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
        <h2 id="faq" className="text-2xl font-bold text-white">Frequently asked questions</h2>
        <div className="mt-6 space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-100 marker:hidden">
                {f.q}
              </summary>
              <p className="mt-2 text-sm leading-6 text-slate-400">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-slate-900/40 p-8 text-center sm:p-12">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Start with a free lookup</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-300">
            No card, no install. Try the free tools now, and create an account when you want history, batch lists or
            paid features.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={() => onOpenTool('lookup')}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-6 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300"
            >
              Try it free
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              onClick={onGetStarted}
              className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-700 px-6 text-sm font-semibold text-slate-100 transition-colors hover:border-slate-500"
            >
              Create a free account
            </button>
          </div>
        </div>
      </section>
    </main>

    {/* Footer */}
    <footer className="border-t border-slate-800/80 bg-slate-950 py-8 text-xs text-slate-500">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
        <span className="font-semibold text-slate-400">GeoPhone Intelligence · Maps © OpenStreetMap contributors</span>
        <nav className="flex items-center gap-4">
          <a href="/terms" className="hover:text-slate-300">Terms</a>
          <a href="/privacy" className="hover:text-slate-300">Privacy</a>
        </nav>
      </div>
    </footer>
  </div>
);
