import Link from "next/link";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getOwnerOrder } from "@/lib/owner-orders";
import { historyHref, type HistorySearchParams } from "@/lib/owner-order-query";
import { formatCents } from "@/lib/money";
import { OrderTime, ownerLink, ownerPageError, TicketBadge } from "../order-ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order details", robots: { index: false, follow: false } };

export default async function Page({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<HistorySearchParams>;
}) {
  const { id } = await params;
  let order;
  try { order = await getOwnerOrder({ headers: await headers() }, id); }
  catch (error) { return ownerPageError(error); }
  return <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
    <Link href={historyHref(await searchParams)} className={ownerLink}>← Back to order history</Link>
    <header className="mt-5 flex flex-wrap items-start justify-between gap-4 border-b-2 border-ink pb-6">
      <div><p className="text-sm font-bold uppercase tracking-widest text-brand-blue">Online order · Paid</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Order #{order.orderNumber}</h1>
        <p className="mt-3 text-muted">Paid <OrderTime value={order.paidAt} /> · Central</p></div>
      <TicketBadge status={order.ticketStatus} />
    </header>
    <dl className="grid gap-6 border-b border-line py-6 sm:grid-cols-2">
      <div><dt className="text-sm font-semibold text-muted">Customer</dt><dd className="mt-1 break-words text-xl font-bold">{order.customerName}</dd></div>
      <div><dt className="text-sm font-semibold text-muted">Pickup · Central</dt><dd className="mt-1 font-semibold"><OrderTime value={order.pickupTime} /></dd></div>
      <div><dt className="text-sm font-semibold text-muted">Email</dt><dd className="mt-1 break-all">{order.customerEmail}</dd></div>
      <div><dt className="text-sm font-semibold text-muted">Phone</dt><dd className="mt-1">{order.customerPhone || "Not provided"}</dd></div>
    </dl>
    <section aria-labelledby="items-title" className="py-6">
      <h2 id="items-title" className="text-2xl font-bold">Items <span className="text-lg font-normal text-muted">({order.itemCount})</span></h2>
      <ul className="mt-4 divide-y divide-line border-y border-line bg-paper px-4">
        {order.lines.map((line, index) => <li key={index} className="py-5">
          <div className="flex items-start justify-between gap-4">
            <div><h3 className="font-sans text-lg font-bold">{line.quantity} × {line.name}</h3>
              <p className="mt-1 text-sm text-muted">Size: {line.sizeName} · {formatCents(line.unitPriceCents)} each</p>
              <p className="mt-2 text-sm">{line.spicy ? "Spicy requested" : "No spicy request"}</p>
              {line.components.length > 0 && <p className="mt-1 text-sm">Combo selections: {line.components.join(" + ")}</p>}
              {line.instructions && <p className="mt-2 max-w-prose whitespace-pre-wrap break-words text-sm"><span className="font-bold">Instructions: </span>{line.instructions}</p>}
            </div>
            <p className="shrink-0 font-bold tabular">{formatCents(line.unitPriceCents * line.quantity)}</p>
          </div>
        </li>)}
      </ul>
    </section>
    <dl className="ml-auto max-w-sm space-y-3 tabular">
      <div className="flex justify-between gap-4"><dt>Subtotal</dt><dd>{formatCents(order.subtotalCents)}</dd></div>
      <div className="flex justify-between gap-4"><dt>Tax</dt><dd>{formatCents(order.taxCents)}</dd></div>
      <div className="flex justify-between gap-4 border-t-2 border-ink pt-3 text-xl font-bold"><dt>Total paid</dt><dd>{formatCents(order.totalCents)}</dd></div>
    </dl>
    <section className="mt-8 border-t border-line pt-6" aria-labelledby="payment-title">
      <h2 id="payment-title" className="text-xl font-bold">Payment reference</h2>
      <p className="mt-2 text-sm text-muted">Stripe Checkout session</p>
      <p className="mt-1 break-all font-mono text-sm">{order.stripeSessionId || "Not recorded"}</p>
      <p className="mt-3 text-sm text-muted">Refunds are handled in the Stripe dashboard. Cancelled tickets keep their original payment record.</p>
    </section>
  </main>;
}
