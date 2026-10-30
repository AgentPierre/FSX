"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelOrder } from "@/lib/cancel-order";
import { btnPrimary, btnSecondary } from "@/lib/ui";

export default function CancelOrderButton({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || cancelled) return;
    setError("");
    setBusy(true);
    try {
      await cancelOrder(orderId);
      setCancelled(true);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not cancel this order. Try again.");
    } finally { setBusy(false); }
  }

  return <section aria-labelledby="cancel-title" className="mt-8 border-t border-line pt-6">
    <h2 id="cancel-title" className="text-xl font-bold">Cancel ticket</h2>
    <p className="mt-2 max-w-prose text-sm text-muted">Cancellation is final. It keeps the order in history and does not issue a refund. Handle any refund separately in Stripe.</p>
    {cancelled ? <p role="status" className="mt-4 font-semibold">Order cancelled. Updating the details…</p> : <>
      <button type="button" disabled={busy} aria-expanded={confirming} aria-controls="cancel-confirmation" onClick={() => { setConfirming(!confirming); setError(""); }} className={`${btnSecondary} mt-4`}>Cancel order</button>
      {confirming && <form id="cancel-confirmation" onSubmit={submit} aria-busy={busy} className="mt-4 rounded-lg border border-ink bg-paper p-4">
        <p className="font-semibold">Cancel order #{orderNumber}?</p>
        <p className="mt-2 text-sm">The ticket will be marked Cancelled. This cannot be undone.</p>
        <div className="mt-4 flex flex-wrap gap-4">
          <button type="submit" disabled={busy} className={btnPrimary}>{busy ? "Cancelling…" : "Confirm cancellation"}</button>
          <button type="button" disabled={busy} onClick={() => { setConfirming(false); setError(""); }} className={btnSecondary}>Keep order</button>
        </div>
        {error && <p role="alert" className="mt-4 font-semibold text-brand-red-dark">{error}</p>}
      </form>}
    </>}
  </section>;
}
