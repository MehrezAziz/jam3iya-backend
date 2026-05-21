/** Calendar date (no time) as UTC midnight for DATE columns. */
export function parseCalendarDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function calendarDateToday(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}

export function isStartOnOrBeforeToday(startsAtIso: string): boolean {
  return parseCalendarDate(startsAtIso) <= calendarDateToday();
}
