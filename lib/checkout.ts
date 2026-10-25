import { centralParts, earliestPickup, isOpenAt } from "./hours";
import { resolveSize } from "./cart";
import { createOrderSchema } from "./validation";
import type {
  BusinessHour,
  CreateOrderInput,
  MenuCategory,
  Settings,
} from "./types";

/** Checkout-local fallback until the cart provider supplies shared ordersOpen. */
export function checkoutOrdersOpen(
  now: Date,
  hours: BusinessHour[] | null,
): boolean | null {
  const today = hours?.find(
    (day) => day.dayOfWeek === centralParts(now).dayOfWeek,
  );
  if (!today) return null;
  return isOpenAt(now, [today]);
}

export function houstonInputValue(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) =>
    parts.find((part) => part.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
}

// Interpret the wall clock in Houston, independently of the customer's browser timezone.
// Discover offsets on either side of a DST transition; reject nonexistent/ambiguous minutes.
export function houstonInstant(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const wall = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(wall)) return null;
  const matches = new Map<number, Date>();
  for (const hours of [-36, 0, 36]) {
    const sample = new Date(wall + hours * 3_600_000);
    const offset =
      Date.parse(`${houstonInputValue(sample)}:00Z`) - sample.getTime();
    if (!Number.isFinite(offset)) continue;
    const candidate = new Date(wall - offset);
    if (!Number.isFinite(candidate.getTime())) continue;
    if (houstonInputValue(candidate) === value)
      matches.set(candidate.getTime(), candidate);
  }
  return matches.size === 1 ? [...matches.values()][0] : null;
}

export function pickupError(
  pickup: Date | null,
  now: Date,
  lead: number,
  hours: BusinessHour[],
): string | null {
  if (checkoutOrdersOpen(now, hours) === false)
    return "Online ordering is currently closed. Please return during business hours.";
  if (checkoutOrdersOpen(now, hours) === null)
    return "Pickup information is unavailable. Refresh the page to try again.";
  if (!pickup || !Number.isFinite(pickup.getTime()))
    return "Choose a valid pickup date and time in Houston time.";
  if (pickup < earliestPickup(now, lead))
    return `Choose a pickup time at least ${lead} minutes from now.`;
  if (!isOpenAt(pickup, hours))
    return "Choose a pickup time within the restaurant's business hours.";
  return null;
}

export function checkoutLead(
  lines: CreateOrderInput["lines"],
  menu: MenuCategory[],
  settings: Settings,
): number {
  return lines.some((line) => resolveSize(menu, line.sizeId)?.item.isCatering)
    ? Math.max(settings.leadRegularMinutes, settings.leadCateringMinutes)
    : settings.leadRegularMinutes;
}

export function buildCheckoutPayload(
  customer: CreateOrderInput["customer"],
  pickup: Date,
  lines: CreateOrderInput["lines"],
): CreateOrderInput {
  return createOrderSchema.parse({
    customer,
    pickupTime: pickup.toISOString(),
    lines,
  });
}

export function validateCustomer(customer: CreateOrderInput["customer"]) {
  return createOrderSchema.shape.customer.safeParse({
    ...customer,
    email: customer.email.trim(),
  });
}

/** Retain an already-created session when only persistence/navigation needs another attempt. */
export function createCheckoutSubmission() {
  let active = false;
  let session: {
    key: string;
    url: string;
    orderId?: string;
    remember?: (id: string) => void;
  } | null = null;
  return {
    get isActive() {
      return active;
    },
    reset() {
      active = false;
      session = null;
    },
    async submit(
      payload: CreateOrderInput,
      persist: () => void,
      navigate: (url: string) => void,
      send?: typeof fetch,
      remember?: (orderId: string) => void,
    ): Promise<boolean> {
      if (active) return false;
      active = true;
      let redirected = false;
      try {
        persist(); // Fail before order creation if the cart cannot survive leaving this page.
        const key = JSON.stringify(payload);
        if (!session || session.key !== key) {
          let orderId: string | undefined;
          const url = await requestCheckout(payload, send, (id) => {
            orderId = id;
          });
          session = { key, url, orderId, remember };
        }
        if (remember) {
          if (!session.orderId)
            throw new Error(
              "Checkout returned no order reference. Your cart is preserved.",
            );
          session.remember?.(session.orderId);
        }
        persist(); // Recheck the current cart after awaiting the API, immediately before leaving.
        navigate(session.url);
        redirected = true;
        return true;
      } finally {
        if (!redirected) active = false;
      }
    },
  };
}

export function earliestInput(now: Date, lead: number): string {
  return houstonInputValue(
    new Date(Math.ceil(earliestPickup(now, lead).getTime() / 60_000) * 60_000),
  );
}

export function checkoutFailure(body: unknown): string {
  const error = (body as { error?: { code?: string; message?: string } } | null)
    ?.error;
  switch (error?.code) {
    case "pickup_too_early":
      return "That pickup time is now too early. Choose a later time and submit again.";
    case "pickup_outside_hours":
      return "Choose a pickup time within business hours.";
    case "store_closed":
      return "Online ordering is currently closed. Your cart has been saved.";
    case "item_unavailable":
    case "checkout_conflict":
      return "Menu prices or availability changed. Refresh the page and review your cart before trying again.";
    case "invalid_request":
      return "Please review your customer information, pickup time, and cart selections.";
    default:
      return "Checkout could not be started. Your cart is preserved. Please try again later.";
  }
}

/** One attempt only: creating an order is not idempotent across POST retries. */
export async function requestCheckout(
  payload: CreateOrderInput,
  send: typeof fetch = fetch,
  created?: (orderId: string) => void,
): Promise<string> {
  let response: Response;
  let body;
  try {
    response = await send("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    body = await response.json().catch(() => null);
  } catch {
    throw new Error(
      "We could not confirm whether checkout started. Your cart is preserved. No automatic retry was made; submitting again may create a new pending order.",
    );
  }
  if (!response.ok) throw new Error(checkoutFailure(body));
  try {
    const url = new URL(body?.checkoutUrl);
    if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com")
      throw new Error();
    if (typeof body.orderId === "string" && body.orderId)
      created?.(body.orderId);
    return url.href;
  } catch {
    throw new Error(
      "Checkout returned an invalid payment link. Your cart is preserved. Please contact the restaurant before trying again.",
    );
  }
}
