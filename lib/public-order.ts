import type { Order, PaymentStatus, TicketStatus } from "./types";

/** What a customer may see about their own order. No email, phone or Stripe ids. */
export interface PublicOrder {
  id: string;
  orderNumber: string;
  paymentStatus: PaymentStatus;
  ticketStatus: TicketStatus | null;
  pickupTime: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  lines: {
    name: string;
    sizeName: string;
    quantity: number;
    spicy: boolean;
    components: string[];
  }[];
}

export function toPublicOrder(o: Order): PublicOrder {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    paymentStatus: o.paymentStatus,
    ticketStatus: o.ticketStatus,
    pickupTime: o.pickupTime,
    subtotalCents: o.subtotalCents,
    taxCents: o.taxCents,
    totalCents: o.totalCents,
    lines: o.lines.map((l) => ({
      name: l.nameSnapshot,
      sizeName: l.sizeName,
      quantity: l.quantity,
      spicy: l.spicy,
      components: l.components,
    })),
  };
}
