import type {
  BusinessHour,
  Order,
  Settings,
  TicketStatus,
} from "../types";
import type { DataStore, MarkPaidResult } from "./store";

import { menuFixture } from "./menu";

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
    return menuFixture;
  }
  async getSettings() {
    return SETTINGS;
  }
  async getBusinessHours() {
    return HOURS;
  }
  async insertOrder(o: Omit<Order, "id" | "orderNumber" | "createdAt">) {
    this.seq += 1;
    const order: Order = {
      ...o,
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
  async cancelOrder(orderId: string) {
    const o = this.orders.get(orderId);
    if (o && o.paymentStatus === "pending_payment")
      o.paymentStatus = "cancelled";
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
