import React, { useState } from 'react';
import { Check, CreditCard, ExternalLink, Lock } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { AccessRequestPanel } from './AccessRequestPanel';
import { FREE_DAILY_LIMITS } from '../services/usageLimits';
import { getStripeCheckoutConfig, openStripeCheckout } from '../services/stripeCheckout';

const FREE_FEATURES = [
  `Number lookup: carrier, country, line type and validity (up to ${FREE_DAILY_LIMITS.phone_lookup}/day)`,
  `IP and network lookup (up to ${FREE_DAILY_LIMITS.ip_lookup}/day)`,
  'Username, email and image open-source search',
  'Resource hub',
  'Lookup history and saved batch lists (signed-in)',
];

const PAID_FEATURES = [
  'Unlimited free-tier lookups (no daily caps)',
  'Send consent links by WhatsApp, SMS, Telegram or email',
  'Live and last known location of people who agree to share',
  'Paste a location a person sent you',
  'Cell tower map, OpenCelliD / BeaconDB resolve, and triangulation',
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
  const stripe = getStripeCheckoutConfig();
  const [stripeNotice, setStripeNotice] = useState('');

  const status = isAdmin
    ? 'Admin: everything is unlocked.'
    : hasPaid && profile?.paid_until
    ? `Paid access until ${new Date(profile.paid_until).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}.`
    : profile?.plan === 'paid'
    ? 'Your paid period has ended. Request access to renew it.'
    : 'You are on the free plan.';

  const handleStripe = () => {
    setStripeNotice('');
    if (openStripeCheckout()) {
      setStripeNotice('Stripe opened in a new tab. After you pay, request access below so an admin can unlock your account (or wait for webhook fulfilment once configured).');
      return;
    }
    setStripeNotice('Stripe Payment Link is not configured. Use the access request below, or set VITE_STRIPE_PAYMENT_LINK in the environment.');
  };

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
              Pay with Stripe when a Payment Link is configured, or send a request so the admin can attach a payment
              link. After payment is confirmed, paid features unlock on your account.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              type="button"
              onClick={handleStripe}
              className="inline-flex items-center justify-center gap-2 h-11 px-5 text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-colors"
            >
              <CreditCard className="w-4 h-4" aria-hidden="true" />
              <span>{stripe.configured ? 'Pay with Stripe' : 'Stripe checkout (setup needed)'}</span>
              {stripe.configured && <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />}
            </button>
            <span className="text-xs text-slate-400">{stripe.priceLabel}</span>
          </div>
          {stripeNotice && (
            <p role="status" className="text-sm text-slate-300 leading-relaxed">
              {stripeNotice}
            </p>
          )}

          <div className="border-t border-slate-800 pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-100">Or request access (manual / affiliate link)</h3>
            <AccessRequestPanel />
          </div>
        </section>
      )}

      <p className="text-sm text-slate-400 leading-relaxed">
        Location features only work with a person&apos;s agreement. They open your link, see who is asking, and choose what
        to share. Nothing is collected without their tap. Phone lookup uses public numbering metadata (carrier / MCC-MNC),
        not covert handset tracking.
      </p>
    </div>
  );
};
