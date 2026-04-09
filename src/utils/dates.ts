/** YYYY-MM from YYYY-MM-DD, or null if not a valid ISO date string. */
export function yearMonthFromIsoDate(iso: string | null | undefined): string | null {
  const s = iso?.trim();
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s.slice(0, 7);
}

/** Calendar year-month for loan checklist (YYYY-MM), local time. */
export function calendarMonthKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Format YYYY-MM (calendar month) for section titles, e.g. "March 2026". */
export function formatYearMonthHeading(ym: string): string {
  const m = ym.match(/^(\d{4})-(\d{2})$/);
  if (!m) return ym;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || mo < 1 || mo > 12) return ym;
  const date = new Date(y, mo - 1, 1);
  return date.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
}

/** Format YYYY-MM-DD for display (en-PH friendly). */
export function formatIsoDateEnPh(iso: string): string {
  const parts = iso.split('-').map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return iso;
  const [y, m, d] = parts;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Local calendar date → YYYY-MM-DD (no UTC shift). */
export function isoFromLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse strict YYYY-MM-DD to local Date, or null. */
export function parseIsoToDate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
}

/** Add whole calendar months to an ISO date, clamping the day (e.g. Jan 31 + 1 mo → Feb 28). */
export function addCalendarMonthsToIsoDate(iso: string, deltaMonths: number): string | null {
  const d0 = parseIsoToDate(iso);
  if (!d0) return null;
  if (deltaMonths === 0) return iso;
  const y = d0.getFullYear();
  const m = d0.getMonth();
  const day = d0.getDate();
  const target = new Date(y, m + deltaMonths, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const clamped = Math.min(day, lastDay);
  return isoFromLocalDate(new Date(target.getFullYear(), target.getMonth(), clamped));
}
