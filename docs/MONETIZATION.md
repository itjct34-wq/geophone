# GeoPhone monetization

Yes — GeoPhone can earn money as a freemium SaaS: **consent diagnostics** (paid) + **OSINT search / public API** (metered). Keep ToS/Privacy clear: consent-only location, no covert stalking.

## Suggested prices (USD / month)

| Plan | Price | Product | Public API |
|------|-------|---------|------------|
| **Free** | $0 | N searches/day, limited modules, no live consent map | **100 req/mo** |
| **Pro** | **$19** | Unlimited searches, AI brief (Groq), all scanners, consent links, export | **5,000 req/mo** |
| **Business** | **$79** | Team seats, higher quotas, priority, campaign SMS, white-label link notes | **50,000 req/mo** |

Adjust in Stripe Dashboard; these are starting points.

## Gateway setup (you plug keys)

1. Create a [Stripe](https://stripe.com) account and Products/Prices for Pro + Business.
2. Create **Payment Links** or Checkout Sessions.
3. Set env on Vercel project **geophone**:

```bash
PAYMENT_PROVIDER=stripe
VITE_STRIPE_PAYMENT_LINK=https://buy.stripe.com/...   # Pro Payment Link (browser CTA)
VITE_STRIPE_PRICE_LABEL=Pro — $19/mo
STRIPE_SECRET_KEY=sk_live_...                          # server only (future Checkout API)
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_BUSINESS=price_...
STRIPE_WEBHOOK_SECRET=whsec_...                        # verify signatures, then set profiles.plan / paid_until
```

4. Until the webhook is wired, after payment: customer taps **I’ve paid** → admin unlocks in **Admin → Customers**.
5. Optional: Customer Portal for cancel/upgrade (`billing.stripe.com`).

## In-app surfaces

- **Plan** tab (`PlanView`) — Free / Pro / Business comparison + Stripe CTA when link set.
- **Admin** — customers, API keys (raise `monthly_limit` via plan), system health (Groq/Ollama configured?).
- **Public API** — `POST /api/v1/intel` quota tied to key plan (see `docs/PUBLIC_API.md`).

## Legal note

Market as **consent-based location** and **public-data OSINT**. Require Terms acceptance. Do not claim live phone tracking without the person’s agreement on a share link.
