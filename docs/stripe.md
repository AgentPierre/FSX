# Stripe (test mode) — T30 / T31

We use **Stripe Checkout** (hosted by Stripe). Card details never touch our servers. An order becomes
paid **only** when `POST /api/webhooks/stripe` receives a verified `checkout.session.completed`
event whose amount matches the order total. The browser landing on `/order/[id]` proves nothing.

## One-time setup

1. In the Stripe dashboard, switch to **Test mode** and copy the keys into `.env.local`
   (never commit it): `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`.
   Also set `STRIPE_SITE_TAG` to something unique to you, like `local-jose`. We all share one Stripe
   test account, and the tag stops your webhook from acting on a teammate's test orders. It is
   required: payments stay switched off (`503 stripe_not_configured`) until it is set.
2. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and run `stripe login`.
3. Start the app and forward webhooks to it:

   ```bash
   npm run dev
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

4. `stripe listen` prints a signing secret starting with `whsec_`. Put it in `.env.local` as
   `STRIPE_WEBHOOK_SECRET` and restart `npm run dev`. (The secret from `stripe listen` differs from
   the one for a deployed endpoint in the dashboard. Use the right one per environment.)

## Try an order

1. Place an order through `POST /api/orders` (see `docs/api.md`) and open the returned `checkoutUrl`.
2. Pay with a test card below. Stripe redirects to `/order/[id]`.
3. The page shows "Confirming your payment…" until the webhook arrives (a few seconds), then
   "Order #0001 — We have your order."

## Test cards

Any future expiry, any 3-digit CVC, any ZIP.

| Card                  | Result                             |
| --------------------- | ---------------------------------- |
| `4242 4242 4242 4242` | Succeeds                           |
| `4000 0000 0000 0002` | Declined                           |
| `4000 0000 0000 9995` | Declined, insufficient funds       |
| `4000 0025 0000 3155` | Requires 3-D Secure authentication |

Apple Pay and Google Pay appear on the Checkout page automatically when the browser and device
support them (Checkout uses dynamic payment methods; we do not hard-code `payment_method_types`).
They are not testable on every machine; test on a phone against the deployed Vercel URL.

## Replay / idempotency check

Stripe can deliver an event more than once. To confirm a repeat does nothing:

```bash
stripe events resend evt_XXXX
```

The second delivery returns `200` and the order stays `paid` with a single `received` ticket.
`markPaid` returns `already_paid` on a repeat and changes nothing. It also refuses to mark an order
paid unless it is still `pending_payment` and the session matches the one saved on the order
(`not_pending`, `session_mismatch`). In the database this is backed by unique constraints on
`payments.order_id` and `payments.stripe_checkout_session_id`.

## Refunds

Issued by the owner in Stripe's own dashboard, outside our system.

## Known limits (stub phase)

- Orders live in memory until the app switches to the Supabase store. Restarting the dev server loses
  them, and on Vercel a payment can't complete yet (each request may run on a different instance).
- Abandoned checkouts: each Checkout session expires 31 minutes after it is created, and the
  `checkout.session.expired` webhook marks the order `expired`. An expired order can never become paid.
- Delayed payment methods (`payment_status` ≠ `paid` on the completed event) are ignored until a
  follow-up event arrives. Cards, Apple Pay and Google Pay are immediate.
