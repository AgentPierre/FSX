import type { PublicOrder } from "./public-order";

export const MIN_PASSWORD_LENGTH = 8;

/**
 * Customer accounts stay hidden (links gone, pages return 404) until NEXT_PUBLIC_CUSTOMER_ACCOUNTS is "on".
 * The value is baked in at build time, so changing it needs a redeploy. It must be read exactly like this so
 * Next.js can inline it into browser code as well as server code.
 */
export function customerAccountsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_CUSTOMER_ACCOUNTS === "on";
}

export function emailError(email: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : "Enter a valid email address.";
}

export function passwordError(password: string): string | null {
  return password.length >= MIN_PASSWORD_LENGTH ? null : `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`;
}

/** First problem with the sign-up form, or null. Supabase enforces its own rules too; this just fails early. */
export function credentialsError(email: string, password: string): string | null {
  return emailError(email) ?? passwordError(password);
}

/** First problem with the "choose a new password" form, or null. */
export function newPasswordError(password: string, confirm: string): string | null {
  return passwordError(password) ?? (password === confirm ? null : "The two passwords do not match.");
}

/** Checkout pre-fill: use the signed-in email only if the customer has not typed one already. */
export function prefillEmail(current: string, accountEmail: string): string {
  return current.trim() ? current : accountEmail;
}

const TICKET_LABEL = {
  received: "Received",
  in_progress: "Being made",
  ready: "Ready for pickup",
  completed: "Picked up",
  cancelled: "Cancelled",
} as const;

/** One short status for the order list. Only paid orders are listed, so a missing ticket status means received. */
export function orderStatusLabel(order: Pick<PublicOrder, "paymentStatus" | "ticketStatus">): string {
  if (order.paymentStatus === "expired") return "Not completed";
  return TICKET_LABEL[order.ticketStatus ?? "received"];
}

/** "Tue, Nov 3, 6:00 PM" in Houston time, whatever the customer's device clock says. */
export function pickupLabel(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Chicago", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

/** "2 × Sesame Chicken, 1 × Egg Roll" */
export function itemsSummary(order: Pick<PublicOrder, "lines">): string {
  return order.lines.map((line) => `${line.quantity} × ${line.name}`).join(", ");
}
