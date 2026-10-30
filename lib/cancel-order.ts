/** Change the ticket only; refunds and the paid payment record stay in Stripe's workflow. */
export async function cancelOrder(orderId: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/ticket`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ status: "cancelled" }),
    });
  } catch {
    throw new Error("Could not reach the server. Check your connection and try again.");
  }
  if (response.status === 401) throw new Error("Your session expired. Sign in again before cancelling.");
  if (response.status === 403) throw new Error("Only an owner can cancel this order.");
  if (response.status === 404) throw new Error("This order is no longer available. Refresh the page.");
  if (response.status === 409) throw new Error("This order changed. Refresh the page before trying again.");
  if (!response.ok) throw new Error("Could not cancel this order. Please try again shortly.");
  const result = await response.json().catch(() => null);
  if (result?.orderId !== orderId || result?.ticketStatus !== "cancelled") {
    throw new Error("Could not confirm cancellation. Refresh the page to check the order.");
  }
}
