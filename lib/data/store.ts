import type {
  BusinessHour,
  MenuCategory,
  Order,
  Settings,
  TicketStatus,
} from "../types";
import type { OwnerOrderPage, OwnerOrderQuery } from "../views";

export type MarkPaidResult =
  | "paid" // pending_payment -> paid, ticket -> received
  | "already_paid" // repeat delivery for this session; nothing changed
  | "not_found"
  | "session_mismatch" // session is not the one saved on this order
  | "not_pending"; // order already expired or paid; nothing changed

/** Every route talks to this interface. Stub today, Supabase after 12 Oct. */
export interface DataStore {
  getMenu(): Promise<MenuCategory[]>;
  getSettings(): Promise<Settings>;
  getBusinessHours(): Promise<BusinessHour[]>;
  insertOrder(
    order: Omit<Order, "id" | "orderNumber" | "createdAt" | "paidAt">,
    earliestPickupAt?: string,
  ): Promise<Order>;
  getOrder(id: string): Promise<Order | null>;
  setStripeSession(orderId: string, sessionId: string): Promise<void>;
  /**
   * Marks an unpaid order `expired` (checkout abandoned, or Stripe session could not be created).
   * Only touches `pending_payment` orders. Never affects a paid order.
   */
  expireOrder(orderId: string): Promise<void>;
  /** Paid orders still on the board (received, in_progress, ready), oldest paid first. */
  listKitchenOrders(): Promise<Order[]>;
  /** Paid orders for the owner dashboard, newest first, filtered and paginated. */
  listOrders(query: OwnerOrderQuery): Promise<OwnerOrderPage>;
  /**
   * Idempotent and conditional: only flips an order that is still pending_payment and whose saved
   * Stripe session matches. The Supabase version must do the same checks in one atomic UPDATE.
   */
  markPaid(orderId: string, sessionId: string): Promise<MarkPaidResult>;
  setTicketStatus(orderId: string, status: TicketStatus): Promise<Order>;
}
