import type {
  BusinessHour,
  MenuCategory,
  MenuItem,
  Order,
  Settings,
  TicketStatus,
} from "../types";
import type { OwnerOrderPage, OwnerOrderQuery } from "../views";
import type { DataStore, MarkPaidResult } from "./store";

const size = (id: string, name: string, priceCents: number) => ({
  id,
  name,
  priceCents,
});
const item = (
  code: string,
  name: string,
  sizes: MenuItem["sizes"],
  extra: Partial<MenuItem> = {},
): MenuItem => ({
  id: `it_${code.toLowerCase()}`,
  code,
  name,
  description: "",
  isAvailable: true,
  isActive: true,
  isSpicyFlag: false,
  isCatering: false,
  sizes,
  ...extra,
});

// Sample data only. Real data comes from docs/menu.csv via seed.sql after the schema is approved.
const MENU: MenuCategory[] = [
  {
    id: "c1",
    name: "Appetizers",
    sortOrder: 1,
    items: [item("A2", "Egg Roll", [size("sz_a2", "regular", 150)])],
  },
  {
    // Same as docs/menu.csv: G2–G10 are full-price entrées. G1 picks two of them as halves;
    // there are no separate "half order" items or $0 sizes.
    id: "c2",
    name: "Gen Joe's Specials",
    sortOrder: 2,
    items: [
      item("G1", "Combination Plate", [size("sz_g1", "regular", 1299)]),
      item("G2", "Gen Joe's Chicken", [size("sz_g2", "regular", 1299)], {
        isSpicyFlag: true,
      }),
      item("G5", "Broccoli Chicken", [size("sz_g5", "regular", 1299)]),
    ],
  },
  {
    id: "c4",
    name: "Fried Rice",
    sortOrder: 4,
    items: [
      item("R1", "Chicken Fried Rice", [
        size("sz_r1_sm", "sm", 599),
        size("sz_r1_lg", "lg", 899),
      ]),
    ],
  },
  {
    id: "c5",
    name: "Catering",
    sortOrder: 5,
    items: [
      item(
        "T1",
        "Catering Tray",
        [
          size("sz_t1_s", "S", 3999),
          size("sz_t1_m", "M", 5999),
          size("sz_t1_l", "L", 7999),
        ],
        { isCatering: true },
      ),
    ],
  },
  {
    id: "c6",
    name: "Drinks",
    sortOrder: 6,
    items: [item("D1", "Drink", [size("sz_d1", "regular", 150)])],
  },
];

// Mon–Sat 11:00–21:00 Central, Sunday closed.
const HOURS: BusinessHour[] = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
  dayOfWeek: d,
  openMinutes: d === 0 ? null : 11 * 60,
  closeMinutes: d === 0 ? null : 21 * 60,
}));

const SETTINGS: Settings = {
  taxRateBps: 825,
  leadRegularMinutes: 15,
  leadCateringMinutes: 40,
};

class StubStore implements DataStore {
  private orders = new Map<string, Order>();
  private paidSessions = new Set<string>();
  private seq = 0;

  async getMenu() {
    return MENU;
  }
  async getSettings() {
    return SETTINGS;
  }
  async getBusinessHours() {
    return HOURS;
  }
  async insertOrder(
    o: Omit<Order, "id" | "orderNumber" | "createdAt" | "paidAt">,
  ) {
    this.seq += 1;
    const order: Order = {
      ...o,
      paidAt: null,
      id: crypto.randomUUID(),
      orderNumber: String(this.seq).padStart(4, "0"),
      createdAt: new Date().toISOString(),
    };
    this.orders.set(order.id, order);
    return order;
  }
  async getOrder(id: string) {
    return this.orders.get(id) ?? null;
  }
  async setStripeSession(orderId: string, sessionId: string) {
    const o = this.orders.get(orderId);
    if (o) o.stripeSessionId = sessionId;
  }
  async expireOrder(orderId: string) {
    const o = this.orders.get(orderId);
    if (o && o.paymentStatus === "pending_payment") o.paymentStatus = "expired";
  }
  async listKitchenOrders() {
    const live = ["received", "in_progress", "ready"];
    return [...this.orders.values()]
      .filter(
        (o) =>
          o.paymentStatus === "paid" &&
          o.ticketStatus !== null &&
          live.includes(o.ticketStatus),
      )
      .sort((a, b) => a.paidAt!.localeCompare(b.paidAt!));
  }
  async listOrders(q: OwnerOrderQuery): Promise<OwnerOrderPage> {
    const needle = q.q?.trim().toLowerCase();
    const matches = [...this.orders.values()]
      .filter((o) => o.paymentStatus === "paid")
      // Compare instants, not strings: "10:00-05:00" and "15:00Z" are the same moment.
      .filter((o) => !q.from || Date.parse(o.paidAt!) >= Date.parse(q.from))
      .filter((o) => !q.to || Date.parse(o.paidAt!) < Date.parse(q.to))
      .filter((o) => !q.ticketStatus || o.ticketStatus === q.ticketStatus)
      .filter(
        (o) =>
          !needle ||
          o.customerName.toLowerCase().includes(needle) ||
          o.orderNumber.includes(needle),
      )
      .sort((a, b) => b.paidAt!.localeCompare(a.paidAt!));
    const start = (q.page - 1) * q.pageSize;
    return {
      orders: matches.slice(start, start + q.pageSize),
      total: matches.length,
    };
  }
  async markPaid(orderId: string, sessionId: string): Promise<MarkPaidResult> {
    if (this.paidSessions.has(sessionId)) return "already_paid";
    const o = this.orders.get(orderId);
    if (!o) return "not_found";
    if (o.stripeSessionId !== sessionId) return "session_mismatch";
    if (o.paymentStatus !== "pending_payment") return "not_pending";
    this.paidSessions.add(sessionId);
    o.paymentStatus = "paid";
    o.ticketStatus = "received";
    o.paidAt = new Date().toISOString();
    return "paid";
  }
  async setTicketStatus(orderId: string, status: TicketStatus) {
    const o = this.orders.get(orderId)!;
    o.ticketStatus = status;
    return o;
  }
}

// Survive Next.js dev hot reloads.
const g = globalThis as unknown as { __fsxStub?: StubStore };
export const stubStore: DataStore = (g.__fsxStub ??= new StubStore());
