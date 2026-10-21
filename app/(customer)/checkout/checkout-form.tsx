"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "../cart-provider";
import { menuItems, resolveSize, validateSelection } from "@/lib/cart";
import {
  buildCheckoutPayload,
  createCheckoutSubmission,
  validateCustomer,
  checkoutLead,
  earliestInput,
  hoursDescription,
  houstonInstant,
  pickupError,
} from "@/lib/checkout";
import { formatCents, taxCents } from "@/lib/money";
import { isOpenAt } from "@/lib/hours";

export function CheckoutForm() {
  const cart = useCart();
  const [now, setNow] = useState<Date | null>(null);
  const [pickup, setPickup] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [submission] = useState(createCheckoutSubmission);
  const errorRef = useRef<HTMLDivElement>(null);
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

  const { settings, businessHours } = cart;
  if (!cart.ready || !now)
    return <p role="status">Restoring your cart and pickup information…</p>;
  if (!cart.lines.length)
    return (
      <p>
        Your cart is empty.{" "}
        <Link href="/menu" className="underline">
          Browse the menu
        </Link>
      </p>
    );
  if (
    cart.lines.some((line) => validateSelection(line, cart.menu)) ||
    cart.subtotalCents === null
  )
    return (
      <p role="alert">
        Some selections are unavailable.{" "}
        <Link href="/cart" className="underline">
          Review your cart
        </Link>
      </p>
    );
  if (!settings || !businessHours?.length)
    return (
      <p role="alert">
        Pickup information is unavailable. Refresh the page to try again. Your
        cart is preserved.
      </p>
    );
  const lead = checkoutLead(cart.lines, cart.menu, settings);
  const closed = !isOpenAt(now, businessHours);
  const pickupProblem = pickup
    ? pickupError(houstonInstant(pickup), now, lead, businessHours)
    : null;
  const tax = taxCents(cart.subtotalCents, settings.taxRateBps);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submission.isActive || !settings || !businessHours) return;
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
      redirecting = await submission.submit(
        payload,
        cart.persistForCheckout,
        (url) => window.location.assign(url),
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
      <Link href="/cart" className="my-4 inline-block underline">
        Back to cart
      </Link>
      <section aria-labelledby="summary-heading" className="rounded border p-4">
        <h2 id="summary-heading" className="text-xl font-semibold">
          Order summary
        </h2>
        <ul className="mt-3 space-y-3">
          {cart.lines.map((line) => {
            const hit = resolveSize(cart.menu, line.sizeId)!;
            return (
              <li key={line.id}>
                <p>
                  {line.quantity} × {hit.item.code} {hit.item.name}
                  {hit.size.name !== "regular" && ` (${hit.size.name})`} —{" "}
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
        <p className="mt-4">
          Estimated subtotal: {formatCents(cart.subtotalCents)}
          <br />
          Estimated tax ({settings.taxRateBps / 100}%): {formatCents(tax)}
          <br />
          Estimated total: {formatCents(cart.subtotalCents + tax)}
        </p>
        <p className="mt-2 text-sm">
          Prices and availability are verified by the server. Review the final
          total on Stripe before paying.
        </p>
      </section>
      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        {error && (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="rounded border p-3"
          >
            {error}
          </div>
        )}
        <fieldset disabled={busy} className="space-y-4">
          <legend className="text-xl font-semibold">
            Customer information
          </legend>
          {(
            [
              ["name", "Name (required)", "text", 100, "name"],
              ["email", "Email (required)", "email", 254, "email"],
              ["phone", "Phone (optional)", "tel", 30, "tel"],
            ] as const
          ).map(([name, label, type, maxLength, autoComplete]) => (
            <div key={name}>
              <label htmlFor={name} className="block">
                {label}
              </label>
              <input
                id={name}
                name={name}
                type={type}
                autoComplete={autoComplete}
                maxLength={name === "email" ? maxLength : undefined}
                required={name !== "phone"}
                aria-invalid={!!fields[name]}
                aria-describedby={fields[name] ? `${name}-error` : undefined}
                className="min-h-11 w-full rounded border p-2"
              />
              {fields[name] && <p id={`${name}-error`}>{fields[name]}</p>}
            </div>
          ))}
          <div>
            <label htmlFor="pickup" className="block">
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
              className="min-h-11 w-full rounded border p-2"
            />
            <p id="pickup-help" className="mt-2 text-sm">
              Pickup only. Allow at least {lead} minutes. All times are
              America/Chicago. {hoursDescription(businessHours)}
            </p>
            <p id="pickup-error" role="status">
              {pickupProblem}
            </p>
          </div>
          {closed && (
            <p role="status">
              Online ordering is currently closed. Please return during the
              listed business hours.
            </p>
          )}
          <button
            type="submit"
            disabled={busy || closed || !!pickupProblem || !pickup}
            className="min-h-11 rounded border px-4 py-2 disabled:opacity-50"
          >
            {busy ? "Opening secure checkout…" : "Continue to Stripe payment"}
          </button>
        </fieldset>
      </form>
    </>
  );
}
