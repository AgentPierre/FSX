import { z } from "zod";
import { isTicketStatus } from "./ticket";
import type { TicketStatus } from "./types";

const instant = z.iso.datetime({ offset: true }).transform((v) => new Date(v).toISOString());
const search = z.string().max(100).transform((v) => {
  const value = v.trim();
  return /^#\d+$/.test(value) ? value.slice(1) : value;
}).optional();

export const ownerOrderQuerySchema = z.object({
  from: instant.optional(),
  to: instant.optional(),
  status: z.string().refine(isTicketStatus, "Choose a valid ticket status.").transform((v) => v as TicketStatus).optional(),
  q: search,
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
}).refine((q) => !q.from || !q.to || q.from < q.to, {
  message: "The end date must follow the start date.", path: ["to"],
});

const calendarDate = z.preprocess(
  (v) => v === "" ? undefined : v,
  z.iso.date().refine((v) => v >= "1000-01-01" && v <= "9998-12-31").optional(),
);
const centralClock = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

/** Midnight on a restaurant calendar day, including the correct DST offset. */
export function centralMidnight(date: string, nextDay = false): string {
  const target = new Date(`${date}T00:00:00.000Z`);
  if (nextDay) target.setUTCDate(target.getUTCDate() + 1);
  let value = target.getTime();
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = centralClock.formatToParts(new Date(value));
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)!.value;
    const observed = Date.parse(`${part("year").padStart(4, "0")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}Z`);
    const delta = target.getTime() - observed;
    value += delta;
    if (delta === 0) break;
  }
  return new Date(value).toISOString();
}

/** UI dates are inclusive calendar days; the API keeps its ISO instant contract. */
export const ownerHistoryQuerySchema = z.object({
  start: calendarDate,
  end: calendarDate,
  status: z.preprocess((v) => v === "" ? undefined : v, z.string().optional()),
  q: z.string().optional(),
  page: z.unknown().optional(),
}).transform(({ start, end, ...rest }): z.input<typeof ownerOrderQuerySchema> => ({
  ...rest,
  from: start ? centralMidnight(start) : undefined,
  to: end ? centralMidnight(end, true) : undefined,
  pageSize: 25,
})).pipe(ownerOrderQuerySchema);

export type HistorySearchParams = Record<string, string | string[] | undefined>;

/** Only known history parameters can be carried into navigation or return links. */
export function historyHref(raw: HistorySearchParams, page?: number): string {
  const params = new URLSearchParams();
  for (const key of ["q", "start", "end", "status", "page"]) {
    const value = raw[key];
    if (typeof value === "string" && value) params.set(key, value);
  }
  if (page !== undefined) params.set("page", String(page));
  return `/owner/orders${params.size ? `?${params}` : ""}`;
}
