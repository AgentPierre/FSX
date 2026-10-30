import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ApiError } from "@/lib/errors";
import type { TicketStatus } from "@/lib/types";

export const statusLabels: Record<TicketStatus, string> = {
  received: "Received", in_progress: "In progress", ready: "Ready",
  completed: "Completed", cancelled: "Cancelled",
};
const statusStyles: Record<TicketStatus, string> = {
  received: "bg-status-received text-white", in_progress: "bg-status-progress text-white",
  ready: "bg-status-ready text-white", completed: "bg-tile text-ink", cancelled: "bg-ink text-paper",
};
export const ownerLink = "inline-flex min-h-11 items-center rounded px-2 font-semibold text-brand-blue underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue";
export const fieldStyle = "mt-2 block min-h-11 w-full rounded-md border border-muted bg-paper px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue";

export function TicketBadge({ status }: { status: TicketStatus | null }) {
  return <span className={`inline-flex rounded px-3 py-1 text-sm font-bold ${status ? statusStyles[status] : "bg-tile"}`}>
    {status ? statusLabels[status] : "No ticket"}
  </span>;
}

const dateTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago", dateStyle: "medium", timeStyle: "short",
});
export function OrderTime({ value }: { value: string | null }) {
  return value ? <time dateTime={value}>{dateTime.format(new Date(value))}</time> : <>Not recorded</>;
}

/** Handle only known public errors; unexpected failures go to the safe error boundary. */
export function ownerPageError(error: unknown) {
  if (!(error instanceof ApiError)) throw error;
  if (error.status === 401) redirect("/login");
  if (error.status === 404) notFound();
  if (error.status !== 400 && error.status !== 403 && error.status !== 503) throw error;
  return <main className="mx-auto max-w-3xl p-6 sm:p-10">
    <h1 className="text-3xl font-bold">{error.status === 403 ? "Owner access required" : error.status === 400 ? "Check your filters" : "Orders are unavailable"}</h1>
    <p role="alert" className="mt-4">{error.status === 403 ? "This account cannot view customer order history." : error.status === 400 ? "Use valid dates with the start on or before the end, a ticket status, and a positive page number. Search is limited to 100 characters." : "We could not load orders. Please try again shortly."}</p>
    <Link href={error.status === 403 ? "/staff" : "/owner/orders"} className={`${ownerLink} mt-4`}>
      {error.status === 403 ? "Go to kitchen" : "Return to order history"}
    </Link>
  </main>;
}
