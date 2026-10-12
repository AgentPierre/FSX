import type { BusinessHour } from "./types";

const TZ = "America/Chicago";
const MS_MIN = 60_000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function centralParts(d: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return {
    dayOfWeek: WEEKDAYS.indexOf(get("weekday")),
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/** True if the instant falls inside that Central day's open window. */
export function isOpenAt(d: Date, hours: BusinessHour[]): boolean {
  const { dayOfWeek, minutes } = centralParts(d);
  const h = hours.find((x) => x.dayOfWeek === dayOfWeek);
  if (!h || h.openMinutes === null || h.closeMinutes === null) return false;
  return minutes >= h.openMinutes && minutes <= h.closeMinutes;
}

export function earliestPickup(now: Date, leadMinutes: number): Date {
  return new Date(now.getTime() + leadMinutes * MS_MIN);
}
