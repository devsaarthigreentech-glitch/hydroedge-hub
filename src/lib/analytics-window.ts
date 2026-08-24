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

/** Minutes elapsed since IST midnight. */
function istMinuteOfDay(date: Date): number {
  const shifted = date.getTime() + IST_OFFSET_MIN * 60_000;
  return Math.floor((((shifted % MS_PER_DAY) + MS_PER_DAY) % MS_PER_DAY) / 60_000);
}

/**
 * 23:59 — what AnalyticsTab's date picker emits for an inclusive end-of-day
 * (`endTime` defaults to "23:59" and toISTIso appends ":00+05:30").
 */
const LAST_MINUTE_OF_IST_DAY = 23 * 60 + 59;

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
    if (!isIstMidnight(s)) {
      return { mode: "live", reason: "range does not start on an IST day boundary" };
    }

    // The end arrives in one of two conventions and both mean "whole days":
    //   * exclusive — IST midnight AFTER the last day wanted
    //   * inclusive — 23:59 on the last day, which is what the date picker in
    //     AnalyticsTab sends. Rejecting this was why EVERY custom range fell
    //     through to the live scan, however deeply the device was backfilled.
    // Any other time-of-day is a genuine partial day the daily grain cannot
    // represent, and still has to be computed live.
    let lastDay: string;
    if (isIstMidnight(e)) {
      lastDay = addDays(istDayOf(e), -1);
    } else if (istMinuteOfDay(e) === LAST_MINUTE_OF_IST_DAY) {
      // Note this covers the whole final day, including its last 59 seconds,
      // whereas the live path's `BETWEEN ... AND 23:59:00` stops short of them.
      // The summary is the more correct of the two; the difference is a minute
      // of a device-day and cannot move a daily total meaningfully.
      lastDay = istDayOf(e);
    } else {
      return { mode: "live", reason: "range does not end on an IST day boundary" };
    }
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
