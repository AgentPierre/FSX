import Link from "next/link";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { listOwnerOrders } from "@/lib/owner-orders";
import { historyHref, type HistorySearchParams } from "@/lib/owner-order-query";
import { formatCents } from "@/lib/money";
import { btnPrimary } from "@/lib/ui";
import { fieldStyle, OrderTime, ownerLink, ownerPageError, statusLabels, TicketBadge } from "./order-ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order history", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<HistorySearchParams> }) {
  const raw = await searchParams;
  let result;
  try {
    result = await listOwnerOrders({ headers: await headers() }, raw, true);
  } catch (error) { return ownerPageError(error); }
  const { orders, total, page, pageSize } = result;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const value = (key: string) => typeof raw[key] === "string" ? raw[key] : "";
  const returnQuery = historyHref(raw).split("?")[1];
  const outOfRange = page > pages;
  return <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
    <Link href="/owner" className={ownerLink}>← Owner dashboard</Link>
    <header className="mt-5 border-b-2 border-ink pb-6">
      <p className="text-sm font-bold uppercase tracking-widest text-brand-blue">Menciu&apos;s Chopstix · Owner</p>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Order history</h1>
      <p className="mt-3 text-muted">Online paid orders, including cancelled tickets. All times are Central.</p>
    </header>
    <form action="/owner/orders" method="get" className="my-6 grid gap-4 rounded-lg border border-line bg-paper p-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="font-semibold">Customer or order number
        <input type="search" name="q" maxLength={100} defaultValue={value("q")} placeholder="Name or #0042" className={fieldStyle} />
      </label>
      <label className="font-semibold">Payment date from
        <input type="date" name="start" min="1000-01-01" max="9998-12-31" defaultValue={value("start")} className={fieldStyle} />
      </label>
      <label className="font-semibold">Payment date through
        <input type="date" name="end" min="1000-01-01" max="9998-12-31" defaultValue={value("end")} className={fieldStyle} />
      </label>
      <label className="font-semibold">Ticket status
        <select name="status" defaultValue={value("status")} className={fieldStyle}>
          <option value="">All statuses</option>
          {Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2 lg:col-span-4">
        <button type="submit" className={btnPrimary}>Apply filters</button>
        <Link href="/owner/orders" className={ownerLink}>Clear filters</Link>
        <p className="text-sm text-muted">Dates include the whole selected day in Central time.</p>
      </div>
    </form>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <p className="font-semibold">{total} {total === 1 ? "order" : "orders"} found</p>
      {!outOfRange && total > 0 && <p className="text-sm text-muted">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}</p>}
    </div>
    {outOfRange ? <section className="border-y border-line py-10">
      <h2 className="text-xl font-bold">This page has no orders</h2>
      <Link href={historyHref(raw, 1)} className={`${ownerLink} mt-3`}>Go to the first page</Link>
    </section> : orders.length === 0 ? <section className="border-y border-line py-10">
      <h2 className="text-xl font-bold">No orders match these filters</h2>
      <p className="mt-2 text-muted">Try another customer name, widen the payment dates, or clear the filters.</p>
      <Link href="/owner/orders" className={`${ownerLink} mt-3`}>View all paid orders</Link>
    </section> : <div className="overflow-x-auto rounded-lg border border-line bg-paper focus-visible:outline-2 focus-visible:outline-brand-blue" tabIndex={0} role="region" aria-label="Order history table">
      <table className="w-full min-w-[680px] text-left">
        <caption className="sr-only">Online paid orders, newest payment first. Select an order number to view details. Dates and times are Central.</caption>
        <thead className="border-b-2 border-ink bg-tile text-sm">
          <tr>{["Order", "Paid · Central", "Customer", "Items", "Total", "Ticket status"].map((label) => <th key={label} scope="col" className="px-4 py-3">{label}</th>)}</tr>
        </thead>
        <tbody>{orders.map((order) => <tr key={order.id} className="border-b border-line last:border-0 hover:bg-cream focus-within:bg-cream">
          <th scope="row" className="px-2 py-2"><Link className={ownerLink} href={`/owner/orders/${order.id}${returnQuery ? `?${returnQuery}` : ""}`}>#{order.orderNumber}</Link></th>
          <td className="px-4 py-4 text-sm tabular"><OrderTime value={order.paidAt} /></td>
          <td className="max-w-64 break-words px-4 py-4 font-semibold">{order.customerName}</td>
          <td className="px-4 py-4 tabular">{order.itemCount}</td>
          <td className="px-4 py-4 font-bold tabular">{formatCents(order.totalCents)}</td>
          <td className="whitespace-nowrap px-4 py-4"><TicketBadge status={order.ticketStatus} /></td>
        </tr>)}</tbody>
      </table>
    </div>}
    {!outOfRange && <nav aria-label="Order history pages" className="mt-6 flex items-center justify-between gap-4">
      {page > 1 ? <Link href={historyHref(raw, page - 1)} className={ownerLink} rel="prev">← Previous</Link> : <span className="px-2 text-muted" aria-disabled="true">← Previous</span>}
      <p className="text-sm tabular">Page {page} of {pages} · 25 per page</p>
      {page < pages ? <Link href={historyHref(raw, page + 1)} className={ownerLink} rel="next">Next →</Link> : <span className="px-2 text-muted" aria-disabled="true">Next →</span>}
    </nav>}
  </main>;
}
