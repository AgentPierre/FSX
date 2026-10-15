import { NextResponse } from "next/server";
import { store } from "@/lib/data";
import type { OrderLine, TicketStatus } from "@/lib/types";

export const runtime = "nodejs";

/**
 * DEV ONLY. Fills the in-memory stub with paid orders so the kitchen board and owner pages can be
 * built without Stripe. Returns 404 in production. Remove when the Supabase store replaces the stub.
 */
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: { code: "not_found", message: "Not found." } },
      { status: 404 },
    );
  }

  const line = (
    code: string,
    name: string,
    sizeId: string,
    sizeName: string,
    priceCents: number,
    extra: Partial<OrderLine> = {},
  ): OrderLine => ({
    sizeId,
    itemCode: code,
    nameSnapshot: name,
    sizeName,
    unitPriceCents: priceCents,
    quantity: 1,
    spicy: false,
    instructions: "",
    components: [],
    ...extra,
  });

  const samples: {
    name: string;
    lines: OrderLine[];
    status: TicketStatus;
    minsAgo: number;
  }[] = [
    {
      name: "Ana Torres",
      status: "received",
      minsAgo: 1,
      lines: [
        line("G1", "Combination Plate", "sz_g1", "regular", 1299, {
          components: ["G2", "G5"],
          spicy: true,
          instructions: "No onions",
        }),
      ],
    },
    {
      name: "Ben Carter",
      status: "received",
      minsAgo: 4,
      lines: [
        line("R1", "Chef's Fried Rice", "sz_r1_lg", "lg", 1190, {
          quantity: 2,
        }),
        line("A2", "Egg Roll", "sz_a2", "regular", 150, { quantity: 4 }),
      ],
    },
    {
      name: "Priya Shah",
      status: "in_progress",
      minsAgo: 9,
      lines: [line("T1", "Chicken Tray", "sz_t1_m", "M", 5999)],
    },
    {
      name: "Marcus Lee",
      status: "ready",
      minsAgo: 17,
      lines: [
        line("G2", "Gen Joe's Chicken", "sz_g2", "regular", 1299, {
          spicy: true,
        }),
        line("B1", "Soft Drink or Iced Tea", "sz_b1", "regular", 150),
      ],
    },
    {
      name: "Dana Ruiz",
      status: "completed",
      minsAgo: 40,
      lines: [line("A2", "Egg Roll", "sz_a2", "regular", 150, { quantity: 2 })],
    },
  ];

  const steps: TicketStatus[] = [
    "received",
    "in_progress",
    "ready",
    "completed",
  ];
  const settings = await store.getSettings();
  let seeded = 0;
  for (const s of samples) {
    const subtotal = s.lines.reduce(
      (t, l) => t + l.unitPriceCents * l.quantity,
      0,
    );
    const tax = Math.round((subtotal * settings.taxRateBps) / 10_000);
    const order = await store.insertOrder({
      customerName: s.name,
      customerEmail: `${s.name.split(" ")[0].toLowerCase()}@example.com`,
      customerPhone: null,
      pickupTime: new Date(
        Date.now() + (20 - s.minsAgo) * 60_000,
      ).toISOString(),
      paymentStatus: "pending_payment",
      ticketStatus: null,
      subtotalCents: subtotal,
      taxCents: tax,
      totalCents: subtotal + tax,
      taxRateBps: settings.taxRateBps,
      stripeSessionId: null,
      lines: s.lines,
    });
    const session = `cs_dev_${order.id}`;
    await store.setStripeSession(order.id, session);
    await store.markPaid(order.id, session);
    for (const step of steps.slice(1, steps.indexOf(s.status) + 1)) {
      await store.setTicketStatus(order.id, step);
    }
    seeded += 1;
  }
  return NextResponse.json({ seeded }, { status: 201 });
}
