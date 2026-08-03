import { site } from "@/lib/site";

/**
 * Dates are formatted in UTC on purpose: content dates are calendar dates, not
 * instants, and a fixed timezone keeps server and client output identical.
 */
export function formatDate(
  date: Date,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" },
): string {
  return new Intl.DateTimeFormat(site.locale, { ...options, timeZone: "UTC" }).format(date);
}

export function formatMonthYear(date: Date): string {
  return formatDate(date, { year: "numeric", month: "short" });
}

/** `2026-01-15` — for <time dateTime> and feed/sitemap output. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
