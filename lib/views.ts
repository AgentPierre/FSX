import type { Order, OrderLine, PaymentStatus, TicketStatus } from "./types";

/**
 * Role-specific views of an order (BR-20: each audience sees different things).
 * - customer: `lib/public-order.ts` (no email, phone or Stripe ids)
 * - kitchen: what to cook and when. No email, phone, money or Stripe ids.
 * - owner: everything except card data, which we never have.
 */

export interface KitchenTicket {
  id: string;
  orderNumber: string;
  customerName: string;
  ticketStatus: TicketStatus;
  pickupTime: string;
  paidAt: string; // for the "within 5 seconds" check and the elapsed timer
  lines: {
    name: string;
    sizeName: string;
    quantity: number;
    spicy: boolean;
    instructions: string;
    components: string[];
  }[];
}

export function toKitchenTicket(o: Order): KitchenTicket {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    ticketStatus: o.ticketStatus!,
    pickupTime: o.pickupTime,
    paidAt: o.paidAt!,
    lines: o.lines.map(kitchenLine),
  };
}

function kitchenLine(l: OrderLine) {
  return {
    name: l.nameSnapshot,
    sizeName: l.sizeName,
    quantity: l.quantity,
    spicy: l.spicy,
    instructions: l.instructions,
    components: l.components,
  };
}

export interface OwnerOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  pickupTime: string;
  paymentStatus: PaymentStatus;
  ticketStatus: TicketStatus | null;
  paidAt: string | null;
  createdAt: string;
  itemCount: number;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  stripeSessionId: string | null;
  lines: (ReturnType<typeof kitchenLine> & { unitPriceCents: number })[];
}

export function toOwnerOrder(o: Order): OwnerOrder {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    customerPhone: o.customerPhone,
    pickupTime: o.pickupTime,
    paymentStatus: o.paymentStatus,
    ticketStatus: o.ticketStatus,
    paidAt: o.paidAt,
    createdAt: o.createdAt,
    itemCount: o.lines.reduce((n, l) => n + l.quantity, 0),
    subtotalCents: o.subtotalCents,
    taxCents: o.taxCents,
    totalCents: o.totalCents,
    stripeSessionId: o.stripeSessionId,
    lines: o.lines.map((l) => ({
      ...kitchenLine(l),
      unitPriceCents: l.unitPriceCents,
    })),
  };
}

export interface OwnerOrderQuery {
  from?: string; // ISO instant, inclusive (paid at or after)
  to?: string; // ISO instant, exclusive
  ticketStatus?: TicketStatus;
  q?: string; // customer name or order number
  page: number; // 1-based
  pageSize: number;
}

export interface OwnerOrderPage {
  orders: Order[];
  total: number;
}
