import { store } from "./data";
import { ApiError } from "./errors";
import { earliestPickup, isOpenAt } from "./hours";
import { taxCents } from "./money";
import type {
  CreateOrderInput,
  ItemSize,
  MenuItem,
  Order,
  OrderLine,
} from "./types";

const COMBO_CODE = "G1";
const COMBO_HALF = /^G([2-9]|10)$/;

/**
 * Validates a cart against business rules and the database, recomputes every price
 * server-side, and inserts the order as pending_payment. Never trusts the browser.
 */
export async function createPendingOrder(
  input: CreateOrderInput,
  now: Date = new Date(),
): Promise<{ order: Order; earliestPickup: Date }> {
  const [menu, settings, hours] = await Promise.all([
    store.getMenu(),
    store.getSettings(),
    store.getBusinessHours(),
  ]);

  if (!isOpenAt(now, hours)) {
    throw new ApiError(
      409,
      "store_closed",
      "Online ordering is open Monday–Saturday, 11:00 am – 9:00 pm Central.",
    );
  }

  const bySize = new Map<string, { item: MenuItem; size: ItemSize }>();
  const byCode = new Map<string, MenuItem>();
  for (const cat of menu)
    for (const item of cat.items) {
      byCode.set(item.code, item);
      for (const size of item.sizes) bySize.set(size.id, { item, size });
    }

  const unavailable = (item: MenuItem) =>
    new ApiError(409, "item_unavailable", `${item.name} is not available.`, {
      code: item.code,
    });

  let lead = settings.leadRegularMinutes;
  const lines: OrderLine[] = input.lines.map((l) => {
    const hit = bySize.get(l.sizeId);
    if (!hit)
      throw new ApiError(400, "invalid_request", "Unknown menu item.", {
        sizeId: l.sizeId,
      });
    const { item, size } = hit;
    if (!item.isActive || !item.isAvailable) throw unavailable(item);
    // Nothing on the menu is free. A $0 size is a data error and must never be sold as a line.
    if (size.priceCents <= 0)
      throw new ApiError(
        400,
        "invalid_request",
        `${item.name} can't be ordered on its own.`,
        { code: item.code },
      );

    const components = l.components ?? [];
    if (item.code === COMBO_CODE) {
      if (
        components.length !== 2 ||
        !components.every((c) => COMBO_HALF.test(c))
      )
        throw new ApiError(
          400,
          "invalid_request",
          "Combination Plate needs two half orders from G2–G10.",
        );
      for (const c of components) {
        const half = byCode.get(c);
        if (!half)
          throw new ApiError(400, "invalid_request", `Unknown item ${c}.`);
        if (!half.isActive || !half.isAvailable) throw unavailable(half);
      }
    } else if (components.length > 0) {
      throw new ApiError(
        400,
        "invalid_request",
        "Only the Combination Plate takes components.",
      );
    }

    if (item.isCatering) lead = Math.max(lead, settings.leadCateringMinutes);

    return {
      sizeId: size.id,
      itemCode: item.code,
      nameSnapshot: item.name,
      sizeName: size.name,
      unitPriceCents: size.priceCents, // from the database, never the request
      quantity: l.quantity,
      spicy: l.spicy ?? false,
      instructions: l.instructions ?? "",
      components,
    };
  });

  const earliest = earliestPickup(now, lead);
  const pickup = new Date(input.pickupTime);
  if (pickup < earliest) {
    throw new ApiError(
      422,
      "pickup_too_early",
      `Earliest pickup for this order is ${lead} minutes from now.`,
      { earliestPickup: earliest.toISOString(), leadMinutes: lead },
    );
  }
  if (!isOpenAt(pickup, hours)) {
    throw new ApiError(
      422,
      "pickup_outside_hours",
      "Pickup time must be within business hours.",
    );
  }

  const subtotalCents = lines.reduce(
    (sum, l) => sum + l.unitPriceCents * l.quantity,
    0,
  );
  const tax = taxCents(subtotalCents, settings.taxRateBps);

  const order = await store.insertOrder({
    customerName: input.customer.name,
    customerEmail: input.customer.email,
    customerPhone: input.customer.phone || null,
    pickupTime: pickup.toISOString(),
    paymentStatus: "pending_payment",
    ticketStatus: null, // an unpaid order never reaches the kitchen
    subtotalCents,
    taxCents: tax,
    totalCents: subtotalCents + tax,
    taxRateBps: settings.taxRateBps,
    stripeSessionId: null,
    lines,
  });
  return { order, earliestPickup: earliest };
}
