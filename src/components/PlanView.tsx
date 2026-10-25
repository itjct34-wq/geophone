import React, { useState } from 'react';
import { Check, CreditCard, ExternalLink, Lock } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { AccessRequestPanel } from './AccessRequestPanel';
import { FREE_DAILY_LIMITS } from '../services/usageLimits';
import { getStripeCheckoutConfig, openStripeCheckout } from '../services/stripeCheckout';

const FREE_FEATURES = [
  `Search resources: up to ${FREE_DAILY_LIMITS.phone_lookup} phone + ${FREE_DAILY_LIMITS.ip_lookup} IP lookups/day`,
  'Core OSINT modules (Sherlock / Holehe / DNS subset)',
  'Public API: 100 requests / month',
  '1 consent link concept (paid map unlock required for live share)',
  'Resource hub + history (signed-in)',
];

const PRO_FEATURES = [
  'Unlimited Search all resources (no daily caps)',
  'AI brief via Groq / Ollama',
  'All scanners + export-friendly results',
  'Consent links, live map, towers / triangulation',
  'Public API: 5,000 requests / month',
  'Suggested price: $19 / month',
];

const BUSINESS_FEATURES = [
  'Everything in Pro',
  'Team seats + higher API quota (50,000 / month)',
  'Campaign short links + test SMS',
  'Investigations / monitoring',
  'Priority support / white-label link notes',
  'Suggested price: $79 / month',
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
  const stripe = getStripeCheckoutConfig();
  const [stripeNotice, setStripeNotice] = useState('');

  const status = isAdmin
    ? 'Admin: everything is unlocked.'
    : hasPaid && profile?.paid_until
      ? `Paid access until ${new Date(profile.paid_until).toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}.`
      : profile?.plan === 'paid'
        ? 'Your paid period has ended. Request access to renew it.'
        : 'You are on the free plan.';

  const handleStripe = () => {
    setStripeNotice('');
    if (openStripeCheckout()) {
      setStripeNotice(
        'Stripe opened in a new tab. After you pay, request access below so an admin can unlock your account (or wait for webhook fulfilment once configured).',
      );
      return;
    }
    setStripeNotice(
      'Payment gateway not configured yet. Set VITE_STRIPE_PAYMENT_LINK (or STRIPE_* server keys) — see docs/MONETIZATION.md. You can still request access below.',
    );
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-slate-100">Plans & pricing</h1>
        <p role="status" className={`text-sm ${hasPaid ? 'text-emerald-300' : 'text-slate-300'}`}>
          {status}
        </p>
        <p className="text-xs text-slate-500">
          Freemium SaaS: earn via Pro/Business + API quotas. You connect Stripe when ready.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <h2 className="text-base font-bold text-slate-100">Free · $0</h2>
          <List items={FREE_FEATURES} />
        </section>
        <section className="bg-slate-900 border border-cyan-800/40 rounded-xl p-5 space-y-3 ring-1 ring-cyan-500/20">
          <h2 className="text-base font-bold text-slate-100">Pro · $19/mo</h2>
          <List items={PRO_FEATURES} locked={!hasPaid} />
        </section>
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <h2 className="text-base font-bold text-slate-100">Business · $79/mo</h2>
          <List items={BUSINESS_FEATURES} locked={!hasPaid} />
        </section>
      </div>

      {!hasPaid && (
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-100">Get paid access</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Pay with Stripe when a Payment Link is configured, or send a request so the admin can attach a
              payment link. After payment is confirmed, Pro features unlock on your account.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              type="button"
              onClick={handleStripe}
              className="inline-flex items-center justify-center gap-2 h-11 px-5 text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-colors"
            >
              <CreditCard className="w-4 h-4" aria-hidden="true" />
              {stripe.configured ? `Pay with Stripe — ${stripe.priceLabel}` : 'Configure Stripe / pay later'}
            </button>
            {stripe.configured && (
              <a
                href={stripe.paymentLink!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-cyan-300 hover:underline"
              >
                Open link <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          {stripeNotice && (
            <p role="status" className="text-sm text-slate-300">
              {stripeNotice}
            </p>
          )}
          <AccessRequestPanel />
        </section>
      )}
    </div>
  );
};
