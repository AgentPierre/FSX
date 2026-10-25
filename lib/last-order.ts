// The customer has no account, so the order page link is their only way back to an order. Remember the
// most recent one on this device so the menu can offer a "Your order #0042" shortcut.
const KEY = "chopstix-last-order";
const MAX_AGE_MS = 12 * 60 * 60 * 1000;
const ORDER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Fired on this page whenever the remembered order is saved or cleared (the browser's own `storage`
 *  event only reaches other tabs). */
export const LAST_ORDER_CHANGED = "chopstix:last-order";

export interface LastOrder { id: string; orderNumber: string; savedAt: number }

/** Reads what was stored; anything malformed, tampered with or older than 12 hours is ignored. */
export function parseLastOrder(raw: string | null, now: number): LastOrder | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const { id, orderNumber, savedAt } = value as Partial<LastOrder>;
    if (typeof id !== "string" || !ORDER_ID.test(id)) return null;
    if (typeof orderNumber !== "string" || !/^\d{1,10}$/.test(orderNumber)) return null;
    if (typeof savedAt !== "number" || !Number.isFinite(savedAt) || now - savedAt >= MAX_AGE_MS || savedAt > now + 60_000) return null;
    return { id, orderNumber, savedAt };
  } catch {
    return null;
  }
}

function announceChange(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(LAST_ORDER_CHANGED));
}

/** Milliseconds until a remembered order stops being shown. */
export function msUntilExpiry(order: LastOrder, now: number): number {
  return Math.max(0, MAX_AGE_MS - (now - order.savedAt));
}

export function saveLastOrder(order: { id: string; orderNumber: string }): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ id: order.id, orderNumber: order.orderNumber, savedAt: Date.now() }));
    announceChange();
  } catch {
    // Storage can be blocked (private windows); the shortcut is a convenience, so just skip it.
  }
}

/** Forgets the remembered order, but only if it is `id`: finishing an old order must not drop a newer one. */
export function clearLastOrder(id: string): void {
  try {
    if (parseLastOrder(localStorage.getItem(KEY), Date.now())?.id === id) {
      localStorage.removeItem(KEY);
      announceChange();
    }
  } catch {
    // Nothing to clear if storage is blocked.
  }
}

export function readLastOrder(): LastOrder | null {
  try {
    return parseLastOrder(localStorage.getItem(KEY), Date.now());
  } catch {
    return null;
  }
}
