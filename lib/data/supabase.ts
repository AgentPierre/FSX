import type { PostgrestError } from "@supabase/supabase-js";
import type { Database, Json } from "../database.types";
import { createAdminClient } from "../supabase/admin";
import { createClient } from "../supabase/server";
import { ApiError } from "../errors";
import type { BusinessHour, MenuCategory, Order, OrderLine, Settings, TicketStatus } from "../types";
import type { OwnerOrderPage, OwnerOrderQuery } from "../views";
import type { DataStore, MarkPaidResult } from "./store";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

function check(error: PostgrestError | null) {
  if (!error) return;
  if (error.code === "23514") throw new ApiError(409, "checkout_conflict", "The menu or order changed. Refresh and try again.");
  if (error.code === "42501") throw new ApiError(403, "forbidden", "Not allowed for this account.");
  // Do not return SQL details or contact data to the caller.
  console.error("Supabase operation failed", { code: error.code });
  throw new ApiError(503, "database_unavailable", "Could not access order data. Please try again.");
}

async function mapOrders(rows: OrderRow[]): Promise<Order[]> {
  if (!rows.length) return [];
  const db = createAdminClient();
  const ids = rows.map((row) => row.id);
  const [lineResult, paymentResult] = await Promise.all([
    db.from("order_lines").select("*").in("order_id", ids).order("id"),
    db.from("payments").select("order_id,stripe_checkout_session_id,paid_at").in("order_id", ids),
  ]);
  check(lineResult.error); check(paymentResult.error);
  const lines = lineResult.data ?? [];
  const [sizeResult, componentResult] = await Promise.all([
    db.from("item_sizes").select("id,menu_items(code)").in("id", [...new Set(lines.map((line) => line.item_size_id))]),
    db.from("order_line_components").select("order_line_id,component_position,menu_items(code)")
      .in("order_line_id", lines.map((line) => line.id)).order("component_position"),
  ]);
  check(sizeResult.error); check(componentResult.error);
  const codes = new Map((sizeResult.data ?? []).map((size) => [size.id, size.menu_items?.code ?? ""]));
  const components = new Map<string, string[]>();
  for (const component of componentResult.data ?? []) {
    const list = components.get(component.order_line_id) ?? [];
    if (component.menu_items) list.push(component.menu_items.code);
    components.set(component.order_line_id, list);
  }
  const payments = new Map((paymentResult.data ?? []).map((payment) => [payment.order_id, payment]));
  return rows.map((row) => {
    const payment = payments.get(row.id);
    return {
      id: row.id, orderNumber: row.display_order_number,
      customerName: row.customer_name, customerEmail: row.customer_email, customerPhone: row.customer_phone,
      pickupTime: row.pickup_at, paymentStatus: row.payment_status as Order["paymentStatus"],
      ticketStatus: row.ticket_status as Order["ticketStatus"], paidAt: payment?.paid_at ?? null,
      subtotalCents: row.subtotal_cents, taxCents: row.tax_cents, totalCents: row.total_cents,
      taxRateBps: Math.round(row.tax_rate * 10000), stripeSessionId: payment?.stripe_checkout_session_id ?? null,
      createdAt: row.created_at,
      lines: lines.filter((line) => line.order_id === row.id).map((line): OrderLine => ({
        sizeId: line.item_size_id, itemCode: codes.get(line.item_size_id) ?? "",
        nameSnapshot: line.item_name_snapshot, sizeName: line.size_code_snapshot,
        unitPriceCents: line.unit_price_cents, quantity: line.quantity, spicy: line.spicy_requested,
        instructions: line.instructions ?? "", components: components.get(line.id) ?? [],
      })),
    };
  });
}

class SupabaseStore implements DataStore {
  async getMenu(): Promise<MenuCategory[]> {
    // Session/anon client deliberately uses public RLS rather than the service role for browsing.
    const db = await createClient();
    const [categoryResult, itemResult, sizeResult] = await Promise.all([
      db.from("menu_categories").select("*").order("sort_order").order("id"),
      db.from("menu_items").select("*").eq("is_active", true).order("sort_order").order("id"),
      db.from("item_sizes").select("*").order("sort_order").order("id"),
    ]);
    check(categoryResult.error); check(itemResult.error); check(sizeResult.error);
    return (categoryResult.data ?? []).map((category) => ({
      id: category.id, name: category.name, sortOrder: category.sort_order,
      items: (itemResult.data ?? []).filter((item) => item.category_id === category.id).map((item) => ({
        id: item.id, code: item.code, name: item.name, description: item.description ?? "",
        isActive: item.is_active, isAvailable: item.is_available,
        isSpicyFlag: item.is_spicy_flag, isCatering: item.is_catering,
        sizes: (sizeResult.data ?? []).filter((size) => size.menu_item_id === item.id).map((size) => ({
          id: size.id, name: size.size_code, priceCents: size.price_cents,
        })),
      })),
    }));
  }
  async getSettings(): Promise<Settings> {
    const db = await createClient();
    const { data, error } = await db.from("settings").select("*").eq("id", 1).single();
    check(error);
    if (!data) throw new ApiError(503, "settings_unavailable", "Pickup settings are unavailable.");
    return { taxRateBps: Math.round(data.tax_rate * 10000), leadRegularMinutes: data.regular_lead_minutes, leadCateringMinutes: data.catering_lead_minutes };
  }
  async getBusinessHours(): Promise<BusinessHour[]> {
    const db = await createClient();
    const { data, error } = await db.from("business_hours").select("*").order("day_of_week");
    check(error);
    const minutes = (time: string | null) => time === null ? null : Number(time.slice(0,2))*60+Number(time.slice(3,5));
    return (data ?? []).map((row) => ({ dayOfWeek: row.day_of_week, openMinutes: minutes(row.opens_at), closeMinutes: minutes(row.closes_at) }));
  }
  async insertOrder(order: Omit<Order, "id" | "orderNumber" | "createdAt" | "paidAt">, earliestPickupAt?: string): Promise<Order> {
    if (!earliestPickupAt) throw new Error("Computed earliest pickup time is required.");
    const db = createAdminClient();
    const { data, error } = await db.rpc("create_checkout_order", { p_order: order as unknown as Json, p_earliest_pickup_at: earliestPickupAt });
    check(error);
    const created = data ? await this.getOrder(data) : null;
    if (!created) throw new ApiError(503,"database_unavailable","Could not load the created order.");
    return created;
  }
  async getOrder(id: string): Promise<Order | null> {
    // Link-based guest access is an existing dev-lead decision. Public routes must use toPublicOrder.
    const { data, error } = await createAdminClient().from("orders").select("*").eq("id", id).maybeSingle();
    if (error?.code === "22P02") return null;
    check(error);
    return data ? (await mapOrders([data]))[0] : null;
  }
  async setStripeSession(orderId: string, sessionId: string): Promise<void> {
    const { error } = await createAdminClient().rpc("attach_checkout_session", { p_order_id: orderId, p_session_id: sessionId });
    check(error);
  }
  async expireOrder(orderId: string): Promise<void> {
    const { error } = await createAdminClient().from("orders").update({ payment_status: "expired" }).eq("id", orderId).eq("payment_status", "pending_payment");
    check(error);
  }
  async markPaid(orderId: string, sessionId: string): Promise<MarkPaidResult> {
    const { data, error } = await createAdminClient().rpc("confirm_checkout_payment", { p_order_id: orderId, p_session_id: sessionId });
    check(error);
    const results: MarkPaidResult[] = ["paid","already_paid","not_found","session_mismatch","not_pending"];
    if (!results.includes(data as MarkPaidResult)) throw new ApiError(503,"database_unavailable","Unexpected payment result.");
    return data as MarkPaidResult;
  }
  async listKitchenOrders(): Promise<Order[]> {
    const db = createAdminClient();
    const { data, error } = await db.from("orders").select("*,payments!inner(paid_at)")
      .eq("payment_status","paid").in("ticket_status",["received","in_progress","ready"]);
    check(error);
    const orders = await mapOrders(data ?? []);
    return orders.sort((a,b) => (a.paidAt ?? a.createdAt).localeCompare(b.paidAt ?? b.createdAt));
  }
  async listOrders(query: OwnerOrderQuery): Promise<OwnerOrderPage> {
    let request = createAdminClient().from("orders").select("*,payments!inner(paid_at)", { count: "exact" }).eq("payment_status","paid");
    if (query.from) request = request.gte("payments.paid_at", query.from);
    if (query.to) request = request.lt("payments.paid_at", query.to);
    if (query.ticketStatus) request = request.eq("ticket_status",query.ticketStatus);
    if (query.q?.trim()) {
      // Use a quoted PostgREST value: user commas/parentheses cannot inject filter clauses.
      const literal = JSON.stringify(`%${query.q.trim().replace(/[\\%_]/g,"\\$&")}%`);
      request = request.or(`customer_name.ilike.${literal},display_order_number.ilike.${literal}`);
    }
    const start = (query.page-1)*query.pageSize;
    // Sort parent orders before pagination, using the one-to-one payment relationship.
    const { data, error, count } = await request.order("payments(paid_at)", { ascending: false })
      .order("id").range(start,start+query.pageSize-1);
    check(error);
    return { orders: await mapOrders(data ?? []), total: count ?? 0 };
  }
  async setTicketStatus(orderId: string, status: TicketStatus): Promise<Order> {
    // MUST use the authenticated owner's/staff's cookies: service-role identity cannot cancel.
    const db = await createClient();
    const { data, error } = await db.from("orders").update({ ticket_status: status }).eq("id",orderId).select("id").maybeSingle();
    check(error);
    if (!data) throw new ApiError(403,"forbidden","This account cannot update that ticket.");
    const order = await this.getOrder(data.id);
    if (!order) throw new ApiError(404,"not_found","Order not found.");
    return order;
  }
}

export const supabaseStore: DataStore = new SupabaseStore();
