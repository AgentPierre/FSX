import { formatCents, taxCents } from "@/lib/money";

/**
 * Subtotal, tax and total for the cart page. The server recomputes all of it when the order is placed
 * (same `taxCents`), so this is what Stripe will show, not a guess.
 */
export function CartTotals({ subtotalCents, taxRateBps }: { subtotalCents: number | null; taxRateBps: number | null }) {
  const row = "flex flex-wrap justify-between gap-3";
  const tax = subtotalCents !== null && taxRateBps !== null ? taxCents(subtotalCents, taxRateBps) : null;
  return (
    <>
      {subtotalCents === null ? (
        <p className="text-xl font-semibold">Price unavailable</p>
      ) : tax === null ? (
        <>
          <p className={`${row} text-xl font-semibold`}><span>Subtotal</span><span className="tabular-nums">{formatCents(subtotalCents)}</span></p>
          <p className="mt-2 text-sm">Tax is added at checkout.</p>
        </>
      ) : (
        <dl className="space-y-1">
          <div className={row}><dt>Subtotal</dt><dd className="tabular-nums">{formatCents(subtotalCents)}</dd></div>
          <div className={row}><dt>Tax ({(taxRateBps ?? 0) / 100}%)</dt><dd className="tabular-nums">{formatCents(tax)}</dd></div>
          <div className={`${row} border-t-2 border-ink pt-2 text-xl font-bold`}><dt>Total</dt><dd className="tabular-nums">{formatCents(subtotalCents + tax)}</dd></div>
        </dl>
      )}
      <p className="mt-2 text-sm text-muted">Prices and availability are verified again when you place your order.</p>
    </>
  );
}
