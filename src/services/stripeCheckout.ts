/**
 * Stripe-ready checkout helpers.
 *
 * GeoPhone currently unlocks paid access via an admin-attached payment link
 * (AccessRequestPanel). These helpers let you point that link — or a Plan-page
 * CTA — at a Stripe Payment Link / Checkout URL without inventing a fake paid API.
 *
 * Configure either:
 *   VITE_STRIPE_PAYMENT_LINK=https://buy.stripe.com/...
 * or leave unset and keep using the admin-supplied payment_link in Supabase.
 *
 * Server-side webhook fulfilment (set profiles.plan / paid_until) is intentionally
 * stubbed — see `confirmStripeSessionStub` — until STRIPE_WEBHOOK_SECRET is wired.
 */

export interface StripeCheckoutConfig {
  /** Public Stripe Payment Link or Checkout Session URL. */
  paymentLink: string | null;
  /** Display price note shown next to the button. */
  priceLabel: string;
  configured: boolean;
}

export function getStripeCheckoutConfig(): StripeCheckoutConfig {
  const paymentLink = (import.meta.env.VITE_STRIPE_PAYMENT_LINK as string | undefined)?.trim() || null;
  const priceLabel =
    (import.meta.env.VITE_STRIPE_PRICE_LABEL as string | undefined)?.trim() ||
    'Paid plan — billed via Stripe';
  return {
    paymentLink,
    priceLabel,
    configured: Boolean(paymentLink && /^https:\/\//i.test(paymentLink)),
  };
}

/** Opens the configured Stripe Payment Link in a new tab. Returns false if unset. */
export function openStripeCheckout(): boolean {
  const { paymentLink, configured } = getStripeCheckoutConfig();
  if (!configured || !paymentLink) return false;
  window.open(paymentLink, '_blank', 'noopener,noreferrer');
  return true;
}

/**
 * Stub for a future `/api/stripe-webhook` + Checkout Session confirm flow.
 * Does not call Stripe; documents the expected contract for implementers.
 */
export async function confirmStripeSessionStub(sessionId: string): Promise<{
  ok: boolean;
  message: string;
}> {
  if (!sessionId.trim()) {
    return { ok: false, message: 'Missing Stripe Checkout session id.' };
  }
  return {
    ok: false,
    message:
      'Stripe session confirmation is not wired yet. Set VITE_STRIPE_PAYMENT_LINK for Payment Links, ' +
      'and add a server webhook that verifies Stripe signatures then updates profiles.paid_until.',
  };
}
