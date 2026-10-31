"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "../cart-provider";
import { useAccountEmail } from "../use-account-email";
import { menuItems, resolveSize, validateSelection } from "@/lib/cart";
import {
  buildCheckoutPayload,
  checkoutOrdersOpen,
  createCheckoutSubmission,
  validateCustomer,
  checkoutLead,
  earliestInput,
  houstonInstant,
  pickupError,
} from "@/lib/checkout";
import { prefillEmail } from "@/lib/customer-accounts";
import { businessHoursLabel } from "@/lib/menu-display";
import { CUSTOMER_LIMITS } from "@/lib/validation";
import { formatCents, taxCents } from "@/lib/money";
import { btnPrimary, btnSecondary } from "@/lib/ui";

export function CheckoutForm() {
  const cart = useCart();
  const [now, setNow] = useState<Date | null>(null);
  const [pickup, setPickup] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [submission] = useState(createCheckoutSubmission);
  const errorRef = useRef<HTMLDivElement>(null);
  const accountEmail = useAccountEmail();
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = setInterval(update, 15_000);
    const restore = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      submission.reset();
      setBusy(false);
      update();
    };
    window.addEventListener("pageshow", restore);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pageshow", restore);
    };
  }, [submission]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  // A signed-in customer's email fills the field if it is already on screen and still empty;
  // the input's defaultValue covers the form mounting after the session is read.
  useEffect(() => {
    const input = document.getElementById("email") as HTMLInputElement | null;
    if (input && accountEmail) input.value = prefillEmail(input.value, accountEmail);
  }, [accountEmail]);

  const { settings, businessHours } = cart;
  if (!cart.ready || !now)
    return <p role="status">Restoring your cart and pickup information…</p>;
  if (!cart.lines.length)
    return (
      <p className="sticker mt-6 rounded-card bg-paper p-6">
        Your cart is empty.{" "}
        <Link
          href="/menu"
          className="inline-flex min-h-11 items-center text-brand-blue underline focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Browse the menu
        </Link>
      </p>
    );
  if (
    cart.lines.some((line) => validateSelection(line, cart.menu)) ||
    cart.subtotalCents === null
  )
    return (
      <p role="alert" className="sticker mt-6 rounded-card bg-paper p-6">
        Some selections are unavailable.{" "}
        <Link
          href="/cart"
          className="inline-flex min-h-11 items-center text-brand-blue underline focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Review your cart
        </Link>
      </p>
    );
  if (
    !settings ||
    !businessHours?.length ||
    checkoutOrdersOpen(now, businessHours) === null
  )
    return (
      <p role="alert" className="sticker mt-6 rounded-card bg-paper p-6">
        Pickup information is unavailable. Refresh the page to try again. Your
        cart is preserved.
      </p>
    );
  const lead = checkoutLead(cart.lines, cart.menu, settings);
  const closed = checkoutOrdersOpen(now, businessHours) === false;
  const pickupProblem = pickup
    ? pickupError(houstonInstant(pickup), now, lead, businessHours)
    : null;
  const tax = taxCents(cart.subtotalCents, settings.taxRateBps);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submission.isActive || !settings || !businessHours) return;
    if (checkoutOrdersOpen(new Date(), businessHours) === false) {
      setNow(new Date());
      setError("Online ordering is currently closed. Your cart is preserved.");
      return;
    }
    setError("");
    setFields({});
    const form = new FormData(event.currentTarget);
    const customer = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? "").trim(),
      phone: String(form.get("phone") ?? ""),
    };
    const validated = validateCustomer(customer);
    if (!validated.success) {
      setFields(
        Object.fromEntries(
          validated.error.issues.map((issue) => [
            String(issue.path[0]),
            issue.message,
          ]),
        ),
      );
      setError("Please correct the customer information below.");
      return;
    }
    let lines;
    try {
      lines = cart.prepareCheckoutLines();
    } catch {
      setError(
        "Your cart needs review. Return to your cart to edit or remove unavailable items.",
      );
      return;
    }
    const instant = houstonInstant(pickup);
    const problem = pickupError(
      instant,
      new Date(),
      checkoutLead(lines, cart.menu, settings),
      businessHours,
    );
    if (problem || !instant) {
      setError(problem ?? "Choose a pickup time.");
      setNow(new Date());
      return;
    }
    setBusy(true);
    let redirecting = false;
    try {
      const payload = buildCheckoutPayload(validated.data, instant, lines);
      const submitted = cart.lines.map((line) => ({
        ...line,
        components: [...line.components],
      }));
      redirecting = await submission.submit(
        payload,
        cart.persistForCheckout,
        (url) => window.location.assign(url),
        undefined,
        (id) => cart.rememberCheckout(id, submitted),
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Checkout could not be started. Your cart is preserved.",
      );
      setNow(new Date());
    } finally {
      if (!redirecting) {
        setBusy(false);
      }
    }
  }

  return (
    <>
      <Link href="/cart" className={`${btnSecondary} my-6`}>
        Back to cart
      </Link>
      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="summary-heading"
          className="sticker min-w-0 rounded-card bg-paper p-4 sm:p-6"
        >
          <h2
            id="summary-heading"
            className="text-2xl font-bold text-brand-blue"
          >
            Order summary
          </h2>
          <ul className="mt-3 space-y-3">
            {cart.lines.map((line) => {
              const hit = resolveSize(cart.menu, line.sizeId)!;
              return (
                <li
                  key={line.id}
                  className="break-words border-b border-line pb-3"
                >
                  <p>
                    {line.quantity} × {hit.item.code} {hit.item.name}
                    {hit.size.name !== "regular" &&
                      ` (${hit.size.name})`} —{" "}
                    {formatCents(hit.size.priceCents * line.quantity)}
                  </p>
                  {!!line.components.length && (
                    <p>
                      Half orders:{" "}
                      {line.components
                        .map(
                          (code) =>
                            `${code} ${menuItems(cart.menu).find((item) => item.code === code)?.name ?? ""}`,
                        )
                        .join(" + ")}
                    </p>
                  )}
                  {line.spicy && <p>Make it spicy</p>}
                  {line.instructions && (
                    <p className="break-words">
                      Instructions: {line.instructions}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          <dl className="mt-5 space-y-3 tabular-nums">
            <div className="flex flex-wrap justify-between gap-2">
              <dt>Subtotal</dt>
              <dd>{formatCents(cart.subtotalCents)}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt>Estimated tax ({settings.taxRateBps / 100}%)</dt>
              <dd>{formatCents(tax)}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2 border-t-2 border-ink pt-3 text-xl font-bold text-brand-blue">
              <dt>Estimated total</dt>
              <dd>{formatCents(cart.subtotalCents + tax)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-sm">
            Prices and availability are verified by the server. Review the final
            total on Stripe before paying.
          </p>
        </section>
        <form
          onSubmit={submit}
          noValidate
          aria-busy={busy}
          className="sticker min-w-0 space-y-4 rounded-card bg-paper p-4 sm:p-6"
        >
          {error && (
            <div
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              className="rounded-xl border-2 border-brand-red-dark p-3 text-brand-red-dark focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              {error}
            </div>
          )}
          <fieldset disabled={busy} className="min-w-0 space-y-4">
            <legend className="text-2xl font-bold text-brand-blue">
              Customer information
            </legend>
            {(
              [
                [
                  "name",
                  "Name (required)",
                  "text",
                  CUSTOMER_LIMITS.name,
                  "name",
                ],
                [
                  "email",
                  "Email (required)",
                  "email",
                  CUSTOMER_LIMITS.email,
                  "email",
                ],
                [
                  "phone",
                  "Phone (optional)",
                  "tel",
                  CUSTOMER_LIMITS.phone,
                  "tel",
                ],
              ] as const
            ).map(([name, label, type, maxLength, autoComplete]) => (
              <div key={name}>
                <label htmlFor={name} className="mb-2 block font-bold">
                  {label}
                </label>
                <input
                  id={name}
                  name={name}
                  type={type}
                  autoComplete={autoComplete}
                  defaultValue={name === "email" ? accountEmail : undefined}
                  maxLength={maxLength}
                  required={name !== "phone"}
                  aria-invalid={!!fields[name]}
                  aria-describedby={fields[name] ? `${name}-error` : undefined}
                  className="block min-h-12 w-full min-w-0 max-w-full rounded-xl border-2 border-ink bg-cream px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue aria-invalid:border-brand-red-dark"
                />
                {fields[name] && (
                  <p
                    className="mt-2 text-sm text-brand-red-dark"
                    id={`${name}-error`}
                  >
                    {fields[name]}
                  </p>
                )}
              </div>
            ))}
            <div>
              <label htmlFor="pickup" className="mb-2 block font-bold">
                Pickup date and time (Houston time, required)
              </label>
              <input
                id="pickup"
                type="datetime-local"
                required
                step={60}
                min={earliestInput(now, lead)}
                value={pickup}
                onChange={(event) => setPickup(event.target.value)}
                aria-invalid={!!pickupProblem}
                aria-describedby="pickup-help pickup-error"
                className="block min-h-12 w-full min-w-0 max-w-full rounded-xl border-2 border-ink bg-cream px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue aria-invalid:border-brand-red-dark"
              />
              <p id="pickup-help" className="mt-2 text-sm">
                Pickup only. Allow at least {lead} minutes. All times are
                Houston time. {businessHoursLabel(businessHours)}
              </p>
              <p
                id="pickup-error"
                className="mt-2 text-sm text-brand-red-dark"
                role="status"
              >
                {pickupProblem}
              </p>
            </div>
            {closed && (
              <p
                role="status"
                className="rounded-xl border-2 border-ink bg-mustard p-3 font-bold"
              >
                Online ordering is currently closed. Please return during the
                listed business hours.
              </p>
            )}
            <button
              type="submit"
              disabled={busy || closed || !!pickupProblem || !pickup}
              className={`${btnPrimary} w-full`}
            >
              {busy ? "Opening secure checkout…" : "Continue to Stripe payment"}
            </button>
          </fieldset>
        </form>
      </div>
    </>
  );
}
