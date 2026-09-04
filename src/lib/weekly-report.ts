// ============================================================================
// WEEKLY CUSTOMER REPORT — data shape and email template
// ----------------------------------------------------------------------------
// The numbers are computed in src/app/api/reports/weekly/route.ts; this file
// only knows how to turn them into an email. Keeping the template separate
// means it can be previewed in a browser (GET ...?format=html) without sending.
//
// Everything a stationary genset can tell us comes from a handful of signals:
//   Din.1  (IO 1)   run status — the engine-on clock, start counter, run lengths
//   Ain.1  (IO 9)   output current — "producing output" hours, average and peak
//   IO 66 / IO 67   external supply and tracker battery — supply health
//   IO 21           GSM signal — connectivity
//   gps_records     a DG should not move; a displacement is worth a line
//   notification_log / device_water_short_log — what the alert scan found
//
// ── Design ──────────────────────────────────────────────────────────────────
// Restrained editorial layout: a dark green masthead, Georgia numerals against
// a sans body, hairline rules instead of boxes, and colour used only to mark a
// unit that needs attention. Deliberately NOT a dashboard of coloured cards —
// this is read on a phone by someone who wants to know if anything is wrong.
//
// Information hierarchy is carried by how much each unit gets:
//   attention → full detail: eight figures, the daily chart, and the notes
//   healthy   → four figures and nothing else; it is fine, say so and move on
//   no data   → one line explaining the silence
//
// Email clients strip most CSS, so the layout is tables with inline styles. The
// one <style> block carries a mobile media query that Gmail and Apple Mail
// honour and everything else ignores harmlessly.
// ============================================================================

import { DG_MOVED_KM } from "@/lib/dg-metrics";

export type DeviceBrand = "GreenX" | "GreenDrive";
export type DeviceWeekStatus = "healthy" | "attention" | "no_data";

export interface WeeklyAlertLine {
  id: string;
  severity: "critical" | "warning";
  message: string;
  /** How many scans logged this alert during the week. */
  count: number;
}

export interface WeeklyDay {
  /** YYYY-MM-DD, IST calendar day. */
  day: string;
  /** "Mon 25" */
  label: string;
  engineOnHours: number;
  starts: number;
  /** Average output current while producing (> 2 A). NULL = never produced. */
  avgAmps: number | null;
}

export interface DeviceWeekly {
  deviceId: string;
  deviceName: string;
  imei: string;
  /** Tracker hardware, e.g. "FMB120". */
  hardware: string;
  brand: DeviceBrand;
  /** "380KVA", "Engine on Wheels", or the hardware name when no rating is known. */
  model: string;

  lastSeenAt: string | null;
  /** Distinct clock hours in the week with at least one packet, out of 168. */
  hoursWithData: number;
  dataAvailabilityPct: number;

  engineOnHours: number;
  /** Engine on AND output current above the load threshold. */
  loadHours: number;
  starts: number;
  longestRunHours: number;
  avgAmps: number | null;
  peakAmps: number | null;
  /** Commissioned setpoint in amps, if configured. */
  setAmps: number | null;

  supplyMinV: number | null;
  supplyAvgV: number | null;
  batteryMinV: number | null;
  gsmAvgPct: number | null;

  waterEpisodes: number;
  waterShortHours: number;

  /** Spread of the week's GPS fixes in km. NULL when too few fixes. */
  displacementKm: number | null;

  alerts: WeeklyAlertLine[];
  daily: WeeklyDay[];

  status: DeviceWeekStatus;
  /** One line explaining a non-healthy status. */
  statusNote: string;
}

export interface WeeklyReportData {
  customerName: string;
  contactName: string;
  /** YYYY-MM-DD (IST Monday). */
  weekStart: string;
  /** YYYY-MM-DD (IST Sunday, inclusive). */
  weekEnd: string;
  /** The week had not finished when the report was generated. */
  partial: boolean;
  generatedAt: string;
  devices: DeviceWeekly[];
}

export interface FleetSummary {
  units: number;
  reporting: number;
  needAttention: number;
  engineOnHours: number;
  loadHours: number;
  starts: number;
  alertLines: number;
}

// ─── Formatting helpers ──────────────────────────────────────────────────────

export function escapeHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 12.58 → "12h 35m"; 0 → "0h". */
export function fmtHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || !isFinite(hours)) return "—";
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0 && m === 0) return "0h";
  if (h === 0) return `${m}m`;
  // Zero-pad the minutes so a column of these lines up: "46h 05m", not "46h 5m".
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, "0")}m`;
}

/** Whole hours for prose — "412 hours". */
function roundHours(h: number): string {
  return Math.round(h).toLocaleString("en-IN");
}

/**
 * Fleet totals to the hour: "412h".
 *
 * Minutes are meaningful for one unit ("71h 20m") and noise once nine units are
 * summed — nobody acts on 25 minutes across a fleet, and the extra digits cost
 * the row its scannability.
 */
function fmtHoursCoarse(h: number): string {
  return `${Math.round(h).toLocaleString("en-IN")}h`;
}

function fmtVal(v: number | null | undefined, unit: string, dp = 1): string {
  if (v === null || v === undefined || !isFinite(v)) return "—";
  return `${v.toFixed(dp)}${unit ? " " + unit : ""}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parts(isoDay: string): { y: number; m: number; d: number; dow: number } {
  const [y, m, d] = isoDay.split("-").map((x) => parseInt(x, 10));
  const dow = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  return { y, m, d, dow };
}

/** "Mon 25" */
export function dayLabel(isoDay: string): string {
  const p = parts(isoDay);
  return `${DOW[p.dow]} ${p.d}`;
}

/** Weekday only — the chart sits under a header that already carries the dates. */
function weekdayLabel(isoDay: string): string {
  return DOW[parts(isoDay).dow];
}

/**
 * "24–30 Aug 2026" — compact enough to survive a subject line, which is where
 * this is used. Widens only as far as the dates force it: a week spanning two
 * months gives "28 Aug – 3 Sep 2026", and one spanning a year gives both years.
 */
export function fmtDateRange(startDay: string, endDay: string): string {
  const a = parts(startDay);
  const b = parts(endDay);
  if (a.y === b.y && a.m === b.m) return `${a.d}–${b.d} ${MONTHS[b.m - 1]} ${b.y}`;
  if (a.y === b.y) return `${a.d} ${MONTHS[a.m - 1]} – ${b.d} ${MONTHS[b.m - 1]} ${b.y}`;
  return `${a.d} ${MONTHS[a.m - 1]} ${a.y} – ${b.d} ${MONTHS[b.m - 1]} ${b.y}`;
}

/** "24 – 30 August 2026", the longer form used in the masthead. */
function fmtDateRangeLong(startDay: string, endDay: string): string {
  const a = parts(startDay);
  const b = parts(endDay);
  if (a.y === b.y && a.m === b.m) return `${a.d} – ${b.d} ${MONTHS_LONG[b.m - 1]} ${b.y}`;
  if (a.y === b.y) return `${a.d} ${MONTHS_LONG[a.m - 1]} – ${b.d} ${MONTHS_LONG[b.m - 1]} ${b.y}`;
  return `${a.d} ${MONTHS_LONG[a.m - 1]} ${a.y} – ${b.d} ${MONTHS_LONG[b.m - 1]} ${b.y}`;
}

function fmtIst(iso: string | null): string {
  if (!iso) return "never";
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

/**
 * "SGT-GX-0426-0027" → "GX‑0027" for use inside a sentence, with a non-breaking
 * hyphen so the identifier never wraps mid-name. Anything not matching the
 * series pattern is returned whole.
 */
function shortName(deviceName: string): string {
  const m = /^SGT-(G[DXMI])-\d{4}-(\d+)$/.exec(deviceName.trim());
  return m ? `${m[1]}&#8209;${m[2]}` : escapeHtml(deviceName);
}

// ─── Aggregates ──────────────────────────────────────────────────────────────

export function fleetSummary(data: WeeklyReportData): FleetSummary {
  const s: FleetSummary = { units: data.devices.length, reporting: 0, needAttention: 0,
    engineOnHours: 0, loadHours: 0, starts: 0, alertLines: 0 };
  for (const d of data.devices) {
    if (d.status !== "no_data") s.reporting++;
    if (d.status === "attention") s.needAttention++;
    s.engineOnHours += d.engineOnHours;
    s.loadHours     += d.loadHours;
    s.starts        += d.starts;
    s.alertLines    += d.alerts.length;
  }
  return s;
}

function brandWord(data: WeeklyReportData): string {
  const brands = new Set(data.devices.map((d) => d.brand));
  if (brands.size === 1) return [...brands][0];
  return "GreenX / GreenDrive";
}

export function weeklyReportSubject(data: WeeklyReportData): string {
  return `Weekly ${brandWord(data)} report — ${data.customerName} — ${fmtDateRange(data.weekStart, data.weekEnd)}`;
}

// ─── Palette ─────────────────────────────────────────────────────────────────

const C = {
  masthead:    "#0f2620",
  mastheadSub: "#8fada2",
  rule:        "#3f8f6b",   // brand green — accent bar, healthy marker, chart bars
  green:       "#3f8f6b",
  greenText:   "#2f7a58",
  attention:   "#b4531f",   // the only warm colour in the design
  ink:         "#1b2422",
  muted:       "#8b9591",
  mutedDark:   "#78837f",
  mutedLight:  "#98a29e",
  faint:       "#c3ccc8",
  hair:        "#eef1f0",   // lightest rule, between metric rows
  hairMid:     "#eaeeec",
  border:      "#e3e8e5",   // unit card border
  borderDark:  "#cfd6d3",   // fleet stat rules, chart baseline
  barEmpty:    "#dfe4e2",
  white:       "#ffffff",
};

const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";

// ─── Template pieces ─────────────────────────────────────────────────────────

/** One figure: a serif number over a small caption. */
function metric(value: string, caption: string, opts: { last?: boolean; first?: boolean; tone?: string; rule?: boolean } = {}): string {
  const pad = opts.first ? "14px 12px 12px 0" : opts.last ? "14px 0 12px 12px" : "14px 12px 12px";
  const border = opts.rule ? `border-bottom:1px solid ${C.hair};` : "";
  return `
    <td width="25%" style="padding:${pad};${border}">
      <div style="font-family:${SERIF};font-size:19px;color:${opts.tone || C.ink};">${value}</div>
      <div style="font-size:11px;color:${C.muted};margin-top:3px;">${escapeHtml(caption)}</div>
    </td>`;
}

/**
 * Hours run each day.
 *
 * Bars are plain divs with a pixel height — no images, no SVG, because both are
 * blocked or broken in enough mail clients to make a chart that silently
 * disappears. A day with no running gets a 2px stub rather than nothing, so the
 * gap reads as "we have data, it did not run" instead of a rendering fault.
 */
function dailyChart(d: DeviceWeekly): string {
  const max = Math.max(...d.daily.map((x) => x.engineOnHours), 0.001);
  const bars = d.daily.map((x, i) => {
    const on = x.engineOnHours > 0;
    const h = on ? Math.max(3, Math.round((x.engineOnHours / max) * 40)) : 2;
    const first = i === 0 ? ` height="46"` : "";
    return `<td width="14.28%" valign="bottom"${first} style="padding:0 4px;"><div style="height:${h}px;background:${on ? C.green : C.barEmpty};"></div></td>`;
  }).join("");
  const labels = d.daily.map((x) => {
    const on = x.engineOnHours > 0;
    const val = on ? x.engineOnHours.toFixed(1) : "—";
    return `<td align="center" style="padding:7px 0 0;font-size:11px;color:${C.muted};">${weekdayLabel(x.day)}<br><span style="font-family:${SERIF};font-size:13px;color:${on ? C.ink : C.faint};">${val}</span></td>`;
  }).join("");

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr><td colspan="7" style="font-size:11px;color:${C.muted};padding-bottom:10px;">Hours run each day</td></tr>
      <tr>${bars}</tr>
      <tr style="border-top:1px solid ${C.borderDark};">${labels}</tr>
    </table>`;
}

/**
 * The observations block — plain sentences, not alert chips.
 *
 * Everything worth saying about a unit is a sentence a site engineer can act on,
 * so it is written as one. The left rule is the only decoration.
 */
function observations(d: DeviceWeekly): string {
  const isDrive = d.brand === "GreenDrive";
  const unit = isDrive ? "Engine" : "DG";
  const lines: string[] = [];

  if (d.status === "no_data") {
    lines.push(`No data received this week. Last seen ${escapeHtml(fmtIst(d.lastSeenAt))} IST — worth checking the SIM and the tracker's power feed.`);
  } else {
    if (d.engineOnHours > 0 && d.loadHours < d.engineOnHours * 0.5) {
      lines.push(`Ran ${fmtHours(d.engineOnHours)} but produced output for only ${fmtHours(d.loadHours)}. Worth checking the electrolyser while the engine is running.`);
    }
    if (d.waterEpisodes > 0) {
      lines.push(`Water ran short ${d.waterEpisodes === 1 ? "once" : d.waterEpisodes === 2 ? "twice" : `${d.waterEpisodes} times`}, across ${fmtHours(d.waterShortHours)} of running time.`);
    }
    if (!isDrive && d.displacementKm !== null && d.displacementKm > DG_MOVED_KM) {
      lines.push(`Position moved about ${d.displacementKm.toFixed(1)} km, past the ${DG_MOVED_KM} km limit. A stationary set should not move — please confirm it was relocated.`);
    }
    if (d.setAmps !== null && d.avgAmps !== null && Math.abs(d.avgAmps - d.setAmps) > d.setAmps * 0.1) {
      lines.push(`Average output ${d.avgAmps.toFixed(1)} A against a ${d.setAmps.toFixed(1)} A setpoint — outside the ±10% band.`);
    }
    if (d.dataAvailabilityPct < 50) {
      lines.push(`${unit} reported in only ${d.dataAvailabilityPct}% of the week's hours, so the figures above are a floor rather than a total.`);
    }
  }

  // Alerts the scan actually raised, kept as a short list under the prose so the
  // narrative stays readable and the record is still there.
  const alertLines = d.alerts.slice(0, 6).map((a) =>
    `<div style="font-size:12px;line-height:1.6;color:${C.ink};margin-top:5px;">${escapeHtml(a.message)}<span style="color:${C.muted};"> — ${a.severity}, ${a.count} time${a.count === 1 ? "" : "s"}</span></div>`
  ).join("");
  const more = d.alerts.length > 6
    ? `<div style="font-size:12px;color:${C.muted};margin-top:5px;">and ${d.alerts.length - 6} more</div>` : "";

  if (lines.length === 0 && d.alerts.length === 0) return "";

  const prose = lines.map((l, i) =>
    `<p style="font-size:13px;line-height:1.6;color:${C.ink};margin:0${i === lines.length - 1 && !alertLines ? "" : " 0 9px"};">${l}</p>`
  ).join("");

  const alertsBlock = alertLines
    ? `<div style="margin-top:${lines.length ? 12 : 0}px;">
         <div style="font-size:11px;color:${C.muted};">Alerts raised this week</div>${alertLines}${more}
       </div>`
    : "";

  const tone = d.status === "no_data" ? C.muted : C.attention;

  return `
    <tr>
      <td colspan="2" style="padding:22px 20px 20px;">
        <div style="border-left:2px solid ${tone};padding:2px 0 2px 14px;">
          ${prose}${alertsBlock}
        </div>
      </td>
    </tr>`;
}

/**
 * "GreenX 380KVA · FMC650 · 862123049871234"
 *
 * When no KVA rating is known the route falls back to naming the tracker as the
 * model, which would print "GreenX FMB120 · FMB120". Collapse the repeat rather
 * than shipping a line that looks like a bug to the customer.
 */
function unitMeta(d: DeviceWeekly): string {
  const model = d.model === d.hardware ? "" : ` ${d.model}`;
  return `${d.brand}${model} · ${d.hardware} · ${d.imei}`;
}

function unitCard(d: DeviceWeekly): string {
  const accent =
    d.status === "attention" ? C.attention :
    d.status === "no_data"   ? C.muted : C.green;
  const statusText =
    d.status === "attention" ? "Needs attention" :
    d.status === "no_data"   ? "No data" : "Ran normally";
  const statusColor =
    d.status === "attention" ? C.attention :
    d.status === "no_data"   ? C.muted : C.greenText;

  // Healthy units get four figures and nothing more. A unit that is fine does
  // not need a chart, and giving it one buries the unit that is not.
  const detailed = d.status === "attention";

  // Colour the output figure only when it is genuinely short of the run time —
  // the same test that writes the "ran X but produced Y" line below. Keying it
  // to "is this a detailed card" instead marked healthy output on a unit
  // flagged for something else entirely, which is how a reader learns to
  // distrust the colour.
  const outputShort = d.engineOnHours > 0 && d.loadHours < d.engineOnHours * 0.5;

  const rowOne = `
    <tr>
      ${metric(fmtHours(d.engineOnHours), "Engine-on", { first: true, rule: detailed })}
      ${metric(fmtHours(d.loadHours), "Producing output", { rule: detailed, tone: outputShort ? C.attention : C.ink })}
      ${metric(String(d.starts), d.starts > 0 ? `Starts, longest ${fmtHours(d.longestRunHours)}` : "Starts", { rule: detailed })}
      ${metric(fmtVal(d.avgAmps, "A"), d.peakAmps !== null ? `Average, peak ${d.peakAmps.toFixed(1)} A` : "Average output", { last: true, rule: detailed })}
    </tr>`;

  const rowTwo = detailed ? `
    <tr>
      ${metric(fmtVal(d.supplyMinV, "V"), "Lowest supply", { first: true })}
      ${metric(fmtVal(d.batteryMinV, "V", 2), "Tracker battery")}
      ${metric(fmtVal(d.gsmAvgPct, "%", 0), "GSM signal")}
      ${metric(`${d.dataAvailabilityPct}%`, `${d.hoursWithData} of 168 hours`, { last: true })}
    </tr>` : "";

  const figures = d.status === "no_data" ? "" : `
    <tr>
      <td colspan="2" style="padding:0 20px${detailed ? "" : " 20px"};">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${rowOne}${rowTwo}
        </table>
      </td>
    </tr>`;

  const chart = detailed ? `
    <tr>
      <td colspan="2" style="padding:8px 20px 0;">${dailyChart(d)}</td>
    </tr>` : "";

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid ${C.border};margin-bottom:20px;">
      <tr>
        <td width="3" style="background:${accent};"></td>
        <td style="padding:0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr>
              <td style="padding:16px 20px 13px;">
                <div style="font-family:${SERIF};font-size:18px;color:${C.ink};">${escapeHtml(d.deviceName)}</div>
                <div style="font-size:11px;color:${C.muted};margin-top:4px;">${escapeHtml(unitMeta(d))}</div>
              </td>
              <td align="right" valign="top" style="padding:19px 20px 13px;font-size:12px;color:${statusColor};white-space:nowrap;">${statusText}</td>
            </tr>
            <tr><td colspan="2" style="padding:0 20px;"><div style="border-top:1px solid ${C.ink};"></div></td></tr>
            ${figures}${chart}${observations(d)}
          </table>
        </td>
      </tr>
    </table>`;
}

/**
 * The opening paragraph.
 *
 * Deliberately a sentence about this week rather than a restatement of the
 * numbers below it: totals, then the one unit most responsible for the
 * shortfall, named. Someone who reads only this line should still know whether
 * to do anything.
 */
function narrative(data: WeeklyReportData, s: FleetSummary): string {
  if (s.reporting === 0) {
    return `None of your units sent data this week, so there is nothing to report on. That is itself worth looking into — the section below lists when each was last heard from.`;
  }

  const opening = `Your fleet ran ${roundHours(s.engineOnHours)} hours this week and produced output for ${roundHours(s.loadHours)} of them.`;

  if (s.needAttention === 0) {
    return `${opening} Every unit ran normally and nothing needs your attention.`;
  }

  // The unit with the largest gap between running and producing — the biggest
  // single contributor to the shortfall the opening sentence just quoted.
  const worst = data.devices
    .filter((d) => d.status === "attention")
    .sort((a, b) => (b.engineOnHours - b.loadHours) - (a.engineOnHours - a.loadHours))[0];

  if (!worst) {
    return `${opening} ${s.needAttention} unit${s.needAttention === 1 ? "" : "s"} need${s.needAttention === 1 ? "s" : ""} attention — details below.`;
  }

  const moved = worst.brand !== "GreenDrive" && worst.displacementKm !== null && worst.displacementKm > DG_MOVED_KM;
  const gap = worst.engineOnHours - worst.loadHours;
  const blames = gap > 0 && s.engineOnHours - s.loadHours > 0 && gap >= (s.engineOnHours - s.loadHours) * 0.4;

  let second: string;
  if (blames && moved) {
    second = `${shortName(worst.deviceName)} accounts for most of the shortfall, and it has also moved position.`;
  } else if (blames) {
    second = `${shortName(worst.deviceName)} accounts for most of the shortfall.`;
  } else if (moved) {
    second = `${shortName(worst.deviceName)} has moved position, and ${s.needAttention === 1 ? "is the only unit" : `${s.needAttention} units`} needing attention this week.`;
  } else {
    second = `${s.needAttention} unit${s.needAttention === 1 ? "" : "s"} need${s.needAttention === 1 ? "s" : ""} a look, starting with ${shortName(worst.deviceName)}.`;
  }

  return `${opening} ${second}`;
}

// ─── Whole email ─────────────────────────────────────────────────────────────

export function buildWeeklyReportHtml(data: WeeklyReportData): string {
  const s = fleetSummary(data);

  // Problems first, then healthy, then silent — so the top of the email is the
  // part that needs doing something about.
  const cards = [...data.devices]
    .sort((a, b) => {
      const rank = (d: DeviceWeekly) => d.status === "attention" ? 0 : d.status === "healthy" ? 1 : 2;
      return rank(a) - rank(b) || a.deviceName.localeCompare(b.deviceName);
    })
    .map(unitCard)
    .join("");

  return `<style>
  @media (max-width:560px) {
    td[width="25%"] { display:block; width:100% !important; border-right:none !important; }
  }
</style>
<div style="font-family:${SANS};max-width:640px;margin:0 auto;background:${C.white};">

  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${C.masthead};">
    <tr>
      <td style="padding:28px 30px 24px;">
        <div style="font-family:${SERIF};font-size:23px;color:${C.white};letter-spacing:-.2px;">Weekly unit report</div>
        <div style="font-size:12px;color:${C.mastheadSub};margin-top:7px;">${escapeHtml(data.customerName)} · ${escapeHtml(fmtDateRangeLong(data.weekStart, data.weekEnd))}${data.partial ? " · week in progress" : ""}</div>
      </td>
      <td align="right" valign="top" style="padding:28px 30px 24px;">
        <div style="font-family:${SERIF};font-size:30px;color:${C.white};line-height:1;">${s.needAttention}</div>
        <div style="font-size:11px;color:${C.mastheadSub};margin-top:6px;">of ${s.units} need attention</div>
      </td>
    </tr>
  </table>
  <div style="height:3px;background:${C.rule};"></div>

  <div style="padding:30px;">

    <p style="font-size:15px;line-height:1.65;color:${C.ink};margin:0 0 10px;">Dear ${escapeHtml(data.contactName || data.customerName)},</p>
    <p style="font-size:15px;line-height:1.65;color:${C.ink};margin:0 0 28px;max-width:56ch;">${narrative(data, s)}</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-top:1px solid ${C.borderDark};border-bottom:1px solid ${C.borderDark};">
      <tr>
        <td width="25%" style="padding:17px 14px 15px 0;border-right:1px solid ${C.hairMid};">
          <div style="font-family:${SERIF};font-size:25px;color:${C.ink};">${fmtHoursCoarse(s.engineOnHours)}</div>
          <div style="font-size:11px;color:${C.mutedDark};margin-top:5px;">Engine-on time</div>
        </td>
        <td width="25%" style="padding:17px 14px 15px;border-right:1px solid ${C.hairMid};">
          <div style="font-family:${SERIF};font-size:25px;color:${C.ink};">${fmtHoursCoarse(s.loadHours)}</div>
          <div style="font-size:11px;color:${C.mutedDark};margin-top:5px;">Producing output</div>
        </td>
        <td width="25%" style="padding:17px 14px 15px;border-right:1px solid ${C.hairMid};">
          <div style="font-family:${SERIF};font-size:25px;color:${C.ink};">${s.starts}</div>
          <div style="font-size:11px;color:${C.mutedDark};margin-top:5px;">Starts</div>
        </td>
        <td width="25%" style="padding:17px 0 15px 14px;">
          <div style="font-family:${SERIF};font-size:25px;color:${s.alertLines > 0 ? C.attention : C.ink};">${s.alertLines}</div>
          <div style="font-size:11px;color:${C.mutedDark};margin-top:5px;">Alerts raised</div>
        </td>
      </tr>
    </table>

    <div style="height:32px;"></div>

    ${cards}

    <div style="border-top:1px solid ${C.border};margin-top:28px;padding-top:15px;">
      <p style="font-size:11px;line-height:1.7;color:${C.mutedLight};margin:0;">
        Covers commissioned units that are reporting; units not yet installed are not listed.
        Engine-on time is measured from the run-status input. Producing output means current above 2 A.
        All times IST. Generated ${escapeHtml(fmtIst(data.generatedAt))} by SGT Hydroedge monitoring.
        Reply to this email to reach support.
      </p>
    </div>
  </div>
</div>`;
}
