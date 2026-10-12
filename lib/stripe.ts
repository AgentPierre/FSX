import Stripe from "stripe";

// SERVER-ONLY. Never import in a client component.
if (typeof window !== "undefined") {
  throw new Error("lib/stripe must never be imported client-side.");
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  return new Stripe(key);
}

/**
 * Identifies which environment created a Checkout session (stored in session metadata).
 * Everyone shares one Stripe test account, so each environment needs its own unique tag
 * (e.g. "local-jose", "vercel-dev") to keep a webhook from acting on teammates' sessions.
 * Deliberately has no default: a shared default (like localhost:3000) would defeat the isolation.
 */
export function siteTag(): string | null {
  return process.env.STRIPE_SITE_TAG?.trim() || null;
}

/** True when payments can run: the secret key and a site tag are both set. */
export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && siteTag());
}
