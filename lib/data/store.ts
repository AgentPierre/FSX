import type {
  BusinessHour,
  MenuCategory,
  Order,
  Settings,
  TicketStatus,
} from "../types";

export type MarkPaidResult =
  | "paid" // pending_payment -> paid, ticket -> received
  | "already_paid" // repeat delivery for this session; nothing changed
  | "not_found"
  | "session_mismatch" // session is not the one saved on this order
  | "not_pending"; // order was cancelled or refunded; nothing changed

/** Every route talks to this interface. Stub today, Supabase after 12 Oct. */
export interface DataStore {
  getMenu(): Promise<MenuCategory[]>;
  getSettings(): Promise<Settings>;
  getBusinessHours(): Promise<BusinessHour[]>;
  insertOrder(
    order: Omit<Order, "id" | "orderNumber" | "createdAt">,
  ): Promise<Order>;
  getOrder(id: string): Promise<Order | null>;
  setStripeSession(orderId: string, sessionId: string): Promise<void>;
  cancelOrder(orderId: string): Promise<void>;
  /**
   * Idempotent and conditional: only flips an order that is still pending_payment and whose saved
   * Stripe session matches. The Supabase version must do the same checks in one atomic UPDATE.
   */
  markPaid(orderId: string, sessionId: string): Promise<MarkPaidResult>;
  setTicketStatus(orderId: string, status: TicketStatus): Promise<Order>;
}
