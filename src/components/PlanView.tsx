import React from 'react';
import { Check, Lock } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { AccessRequestPanel } from './AccessRequestPanel';

const FREE_FEATURES = [
  'Number lookup: carrier, country, line type and validity',
  'IP and network lookup',
  'Username, email and image open-source search',
  'Resource hub',
  'Lookup history and saved batch lists',
];

const PAID_FEATURES = [
  'Send consent links by WhatsApp, SMS, Telegram or email',
  'Live and last known location of people who agree to share',
  'Paste a location a person sent you',
  'Cell tower map and triangulation',
  'God Eye 3D satellite globe',
  'Investigations and monitoring of public domain and IP records',
  'Campaign short links and test SMS sending',
];

const List: React.FC<{ items: string[]; locked?: boolean }> = ({ items, locked }) => (
  <ul className="space-y-2">
    {items.map((item) => (
      <li key={item} className="flex items-start gap-2.5 text-sm text-slate-200">
        {locked ? (
          <Lock className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
        ) : (
          <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" aria-hidden="true" />
        )}
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

export const PlanView: React.FC = () => {
  const { profile, hasPaid, isAdmin } = useAuth();

  const status = isAdmin
    ? 'Admin: everything is unlocked.'
    : hasPaid && profile?.paid_until
    ? `Paid access until ${new Date(profile.paid_until).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}.`
    : profile?.plan === 'paid'
    ? 'Your paid period has ended. Request access to renew it.'
    : 'You are on the free plan.';

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-slate-100">Your plan</h1>
        <p role="status" className={`text-sm ${hasPaid ? 'text-emerald-300' : 'text-slate-300'}`}>
          {status}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <h2 className="text-base font-bold text-slate-100">Free</h2>
          <List items={FREE_FEATURES} />
        </section>
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <h2 className="text-base font-bold text-slate-100">Paid</h2>
          <List items={PAID_FEATURES} locked={!hasPaid} />
        </section>
      </div>

      {!hasPaid && (
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-100">Get paid access</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Send a request and the admin will put a payment link here. Pay it, tap I've paid, and the admin switches
              your access on once the payment is confirmed.
            </p>
          </div>
          <AccessRequestPanel />
        </section>
      )}

      <p className="text-sm text-slate-400 leading-relaxed">
        Location features only work with a person's agreement. They open your link, see who is asking, and choose what
        to share. Nothing is collected without their tap.
      </p>
    </div>
  );
};
