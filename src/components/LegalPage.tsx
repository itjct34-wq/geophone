import React from 'react';
import { Radio, ArrowLeft } from 'lucide-react';
import { CURRENT_TERMS_VERSION } from '../services/accessService';

// The business name and contact shown on these pages. Replace the placeholders.
export const LEGAL_OWNER = '[YOUR NAME]';
export const LEGAL_CONTACT = '[YOUR CONTACT — email or WhatsApp]';

const UPDATED = 'Last updated 25 October 2026';

const H: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-base font-bold text-slate-100 pt-5 first:pt-0">{children}</h2>
);
const P: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-sm text-slate-300 leading-relaxed">{children}</p>
);
const Li: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="text-sm text-slate-300 leading-relaxed">{children}</li>
);

const Shell: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <a href="/" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-slate-100">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back
        </a>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Radio className="w-4 h-4" aria-hidden="true" />
          </div>
          <span className="text-sm font-bold tracking-tight">GeoPhone</span>
        </div>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-xs text-slate-400">{UPDATED} · Version {CURRENT_TERMS_VERSION}</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-3">{children}</div>

      <p className="text-xs text-slate-500">
        This is {LEGAL_OWNER}. Questions or requests: {LEGAL_CONTACT}.
      </p>
    </div>
  </main>
);

export const TermsPage: React.FC = () => (
  <Shell title="Terms of Use">
    <P>
      GeoPhone lets you look up public details of a phone number and, with a person&apos;s clear agreement, see a
      location they choose to share. By using it you accept these terms. If you do not agree, do not use the service.
    </P>

    <H>Consent is required</H>
    <P>
      You may only ask for someone&apos;s location when they agree to share it. You send them a link; they see who is
      asking and choose what to share. You are responsible for having their permission. Using GeoPhone to track,
      follow, harass, or deceive anyone, or to break any law, is forbidden and will end your access.
    </P>

    <H>Your account</H>
    <ul className="space-y-2 list-disc pl-5">
      <Li>Keep your password private. You are responsible for what happens under your account.</Li>
      <Li>A phone number only shows its carrier and country, never a person&apos;s exact position on its own.</Li>
    </ul>

    <H>Paid access</H>
    <P>
      Some features need paid access for a set number of days. You pay through the link the admin sends you. Access is
      switched on after the payment is confirmed and ends when the period runs out. We may switch an account off at any
      time if it is misused. Prices and refund terms are told to you before you pay.
    </P>

    <H>Your data and how long it is kept</H>
    <P>
      Positions people share are kept for 30 days, then removed. Records of the links you create are kept for 90 days,
      then deleted. See the Privacy Policy for the detail.
    </P>

    <H>No warranty, limited liability</H>
    <P>
      The service is provided &quot;as is&quot;. Location estimates from a phone number, an IP address, or cell towers
      are approximate and may be wrong. To the extent the law allows, {LEGAL_OWNER} is not liable for any loss arising
      from use of the service. These terms are not legal advice; charging for a location service may carry local legal
      duties that are your responsibility.
    </P>

    <H>Changes</H>
    <P>
      We may update these terms. When they change, you will be asked to agree again before you continue to use paid
      features.
    </P>
  </Shell>
);

export const PrivacyPage: React.FC = () => (
  <Shell title="Privacy Policy">
    <P>
      This explains what GeoPhone collects, why, and how long it is kept. {LEGAL_OWNER} runs the service.
    </P>

    <H>What we collect</H>
    <ul className="space-y-2 list-disc pl-5">
      <Li>Your account email, and your plan and access dates.</Li>
      <Li>Numbers you look up, saved to your own history.</Li>
      <Li>The consent links you create.</Li>
      <Li>Positions a person chooses to share after opening your link, plus any extra details they tick (such as a name).</Li>
      <Li>Reports a recipient sends, and numbers that have opted out.</Li>
    </ul>

    <H>Consent comes first</H>
    <P>
      Nothing about a person&apos;s location is collected unless they open your link and tap to share. They choose
      exactly what to share, can stop at any time by closing the page, and can report a link or opt their number out of
      future links.
    </P>

    <H>How long we keep it</H>
    <ul className="space-y-2 list-disc pl-5">
      <Li>Shared positions: 30 days, then removed automatically.</Li>
      <Li>Link records: 90 days, then deleted automatically.</Li>
      <Li>Your account stays until you ask us to remove it.</Li>
    </ul>

    <H>Who can see what</H>
    <P>
      You see only your own lookups, links and shared positions. The admin can see account email, plan and access
      dates, and recipient reports, but never other customers&apos; looked-up numbers or shared positions.
    </P>

    <H>Where it is stored</H>
    <P>
      Data is held in a Supabase (PostgreSQL) database with per-user access rules, so one account cannot read
      another&apos;s data. Some features call outside services (OpenStreetMap, OpenCage, cell-tower and IP lookups) to
      turn text into map positions; those requests carry only what the lookup needs.
    </P>

    <H>Your choices</H>
    <P>
      You can clear your lookup history and delete your saved lists in the app. To delete your account and its data, or
      to ask what is held about you, contact {LEGAL_CONTACT}. A person who received a link can opt their number out from
      the link page itself.
    </P>
  </Shell>
);
