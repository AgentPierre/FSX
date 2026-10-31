import { optionalUser, requireUser, type AuthRequest } from "./auth";
import { store } from "./data";
import { ApiError } from "./errors";
import { toPublicOrder } from "./public-order";

/** "My orders": the signed-in customer's paid orders, in the same reduced shape as the guest order page. */
export async function listMyOrders(request: AuthRequest) {
  const userId = await requireUser(request);
  const orders = await store.listCustomerOrders(userId);
  // The store already filters by account and paid status; checking again means a store bug cannot show another
  // customer's order, because this route reads with the service role.
  return { orders: orders.filter((o) => o.customerUserId === userId && o.paymentStatus === "paid").map(toPublicOrder) };
}

/**
 * Best effort: link a just-created order to the signed-in customer. A guest, or any failure here, simply leaves
 * an ordinary guest order, so this never blocks checkout or reaches the payment step. The id comes from the session.
 */
export async function linkOrderToSignedInCustomer(request: AuthRequest, orderId: string): Promise<void> {
  try {
    const userId = await optionalUser(request);
    if (userId) await store.setOrderCustomer(orderId, userId);
  } catch (err) {
    console.error("Could not link the order to the customer account", { orderId, code: err instanceof ApiError ? err.code : "unknown" });
  }
}
