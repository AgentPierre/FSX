import { requireUser, type AuthRequest } from "./auth";
import { store } from "./data";
import { toPublicOrder } from "./public-order";

/** "My orders": the signed-in customer's paid orders, in the same reduced shape as the guest order page. */
export async function listMyOrders(request: AuthRequest) {
  const userId = await requireUser(request);
  const orders = await store.listCustomerOrders(userId);
  // The store already filters by account and paid status; checking again means a store bug cannot show another
  // customer's order, because this route reads with the service role.
  return { orders: orders.filter((o) => o.customerUserId === userId && o.paymentStatus === "paid").map(toPublicOrder) };
}
