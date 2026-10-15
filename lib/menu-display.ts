import type { BusinessHour } from "./types";

const SIZE_LABELS: Record<string, string> = {
  regular: "Regular",
  sm: "Small",
  lg: "Large",
  S: "Small",
  M: "Medium",
  L: "Large",
};

export function sizeLabel(name: string): string {
  return SIZE_LABELS[name] ?? name;
}

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function timeLabel(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${hour % 12 || 12}${minute ? `:${String(minute).padStart(2, "0")}` : ""} ${hour < 12 ? "am" : "pm"}`;
}

/** Render the weekly Central-time contract, grouping adjacent days with identical hours. */
export function businessHoursLabel(hours: BusinessHour[]): string {
  const groups: { first: string; last: string; label: string }[] = [];
  for (const day of [1, 2, 3, 4, 5, 6, 0]) {
    const row = hours.find((hour) => hour.dayOfWeek === day);
    const label = !row
      ? "Hours unavailable"
      : row.openMinutes === null && row.closeMinutes === null
        ? "Closed"
        : row.openMinutes === null || row.closeMinutes === null
          ? "Hours unavailable"
          : `${timeLabel(row.openMinutes)}–${timeLabel(row.closeMinutes)} Central`;
    const previous = groups[groups.length - 1];
    if (previous?.label === label) previous.last = DAYS[day];
    else groups.push({ first: DAYS[day], last: DAYS[day], label });
  }
  return groups
    .map(
      ({ first, last, label }) =>
        `${first === last ? first : `${first}–${last}`}: ${label}`,
    )
    .join(" · ");
}
