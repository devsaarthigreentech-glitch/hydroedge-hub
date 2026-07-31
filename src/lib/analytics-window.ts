// ============================================================================
// ANALYTICS WINDOW RESOLUTION
// ----------------------------------------------------------------------------
// Decides whether an analytics request can be answered from device_daily_summary
// or has to fall back to a live scan of io_records / gps_records.
//
// The rollup grain is the IST calendar day, so it can only answer requests whose
// window is a whole number of IST days. Anything with a time-of-day component
// (the custom range picker in AnalyticsTab) falls back to the live path.
// ============================================================================

/** IST is a fixed +05:30 offset — no DST, so plain arithmetic is safe. */
const IST_OFFSET_MIN = 5 * 60 + 30;
const MS_PER_DAY = 86_400_000;

export type AnalyticsWindow =
  | { mode: "summary"; days: string[] }
  | { mode: "live"; reason: string };

/** Today's date in IST as YYYY-MM-DD. */
export function istToday(now: Date = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MIN * 60_000)
    .toISOString()
    .slice(0, 10);
}

/** Shift a YYYY-MM-DD day string. Anchored at noon UTC so it can never roll over. */
export function addDays(isoDay: string, delta: number): string {
  const d = new Date(`${isoDay}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Inclusive list of day strings. */
export function dayRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/**
 * True when `date` sits exactly on IST midnight — i.e. it is a clean day
 * boundary the rollup can represent.
 */
function isIstMidnight(date: Date): boolean {
  const shifted = date.getTime() + IST_OFFSET_MIN * 60_000;
  return shifted % MS_PER_DAY === 0;
}

/** The IST calendar day a timestamp falls in. */
function istDayOf(date: Date): string {
  return new Date(date.getTime() + IST_OFFSET_MIN * 60_000).toISOString().slice(0, 10);
}

/**
 * Work out how to serve a request.
 *
 * `days=N` means the last N IST calendar days, today included.
 *
 * NOTE this is a deliberate change from the live routes, which use a rolling
 * `NOW() - N days` window starting at the current time-of-day. The old window's
 * oldest day was always a partial one; whole days are both what the UI labels
 * imply and the only thing a daily rollup can represent.
 */
export function resolveWindow(params: URLSearchParams, now: Date = new Date()): AnalyticsWindow {
  const start = params.get("start_datetime");
  const end = params.get("end_datetime");

  if (start && end) {
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) {
      return { mode: "live", reason: "unparseable datetime range" };
    }
    if (e <= s) return { mode: "live", reason: "end is not after start" };
    if (!isIstMidnight(s) || !isIstMidnight(e)) {
      return { mode: "live", reason: "range is not aligned to IST day boundaries" };
    }
    // `end` is the exclusive midnight after the last day the user wants.
    const lastDay = addDays(istDayOf(e), -1);
    return { mode: "summary", days: dayRange(istDayOf(s), lastDay) };
  }

  const raw = parseInt(params.get("days") || "1", 10);
  if (!Number.isFinite(raw) || raw < 1) {
    return { mode: "live", reason: "invalid days parameter" };
  }
  // Guard against someone asking for 100k days and materialising the array.
  const days = Math.min(raw, 3660);
  const today = istToday(now);
  return { mode: "summary", days: dayRange(addDays(today, -(days - 1)), today) };
}
