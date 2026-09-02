// ============================================================================
// WEEKLY CUSTOMER REPORT — data shape and email template
// ----------------------------------------------------------------------------
// The numbers are computed in src/app/api/reports/weekly/route.ts; this file
// only knows how to turn them into an email. Keeping the template separate
// means it can be previewed in a browser (GET ...?format=html) without sending.
//
// Everything a stationary genset can tell us comes from a handful of signals:
//   Din.1  (IO 1)   run status — the engine-on clock, start counter, run lengths
//   Ain.1  (IO 9)   output current — "under load" hours, average and peak amps
//   IO 66 / IO 67   external supply and tracker battery — supply health
//   IO 21           GSM signal — connectivity
//   gps_records     a DG should not move; a displacement is worth a line
//   notification_log / device_water_short_log — what the alert scan found
//
// Email clients strip most CSS, so the layout is tables with inline styles.
// ============================================================================

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
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function fmtNum(v: number | null | undefined, unit: string, decimals = 1): string {
  if (v === null || v === undefined || !isFinite(v)) return "—";
  return `${v.toFixed(decimals)} ${unit}`.trim();
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW    = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

/** "25 Aug – 31 Aug 2026" (or "28 Dec 2025 – 3 Jan 2026" across a year). */
export function fmtDateRange(startDay: string, endDay: string): string {
  const a = parts(startDay);
  const b = parts(endDay);
  const left = a.y === b.y ? `${a.d} ${MONTHS[a.m - 1]}` : `${a.d} ${MONTHS[a.m - 1]} ${a.y}`;
  return `${left} – ${b.d} ${MONTHS[b.m - 1]} ${b.y}`;
}

function fmtIst(iso: string | null): string {
  if (!iso) return "never";
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  });
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
  const s = fleetSummary(data);
  const flag = s.needAttention > 0 ? "🟡" : s.reporting === 0 ? "⚪" : "🟢";
  return `${flag} Weekly ${brandWord(data)} Report — ${data.customerName} — ${fmtDateRange(data.weekStart, data.weekEnd)}`;
}

// ─── Template pieces ─────────────────────────────────────────────────────────

const C = {
  headerBg: "#166534",
  text: "#111827", muted: "#6b7280", faint: "#9ca3af",
  border: "#e5e7eb", surface: "#f8fafc",
  green: "#15803d", greenBg: "#f0fdf4", greenBorder: "#bbf7d0",
  amber: "#b45309", amberBg: "#fffbeb", amberBorder: "#fde68a",
  red: "#b91c1c", redBg: "#fef2f2", redBorder: "#fecaca",
  gray: "#64748b", grayBg: "#f1f5f9", grayBorder: "#e2e8f0",
  blue: "#1d4ed8", blueBg: "#eff6ff", blueBorder: "#bfdbfe",
  orange: "#c2410c", orangeBg: "#fff7ed", orangeBorder: "#fed7aa",
};

function pill(text: string, fg: string, bg: string, border: string): string {
  return `<span style="display:inline-block;font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;background:${bg};color:${fg};border:1px solid ${border};white-space:nowrap;">${escapeHtml(text)}</span>`;
}

function statusPill(d: DeviceWeekly): string {
  if (d.status === "no_data")   return pill("No data", C.gray, C.grayBg, C.grayBorder);
  if (d.status === "attention") return pill("Needs attention", C.amber, C.amberBg, C.amberBorder);
  return pill("Healthy", C.green, C.greenBg, C.greenBorder);
}

function brandPill(d: DeviceWeekly): string {
  const isDrive = d.brand === "GreenDrive";
  return pill(`${d.brand} · ${d.model}`,
    isDrive ? C.orange : C.blue, isDrive ? C.orangeBg : C.blueBg, isDrive ? C.orangeBorder : C.blueBorder);
}

function tile(label: string, value: string, sub?: string): string {
  return `
    <td width="25%" valign="top" style="padding:0 4px;">
      <div style="background:${C.surface};border:1px solid ${C.border};border-radius:8px;padding:10px 12px;">
        <div style="font-size:10px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${C.muted};">${escapeHtml(label)}</div>
        <div style="font-size:17px;font-weight:700;color:${C.text};margin-top:3px;white-space:nowrap;">${escapeHtml(value)}</div>
        ${sub ? `<div style="font-size:11px;color:${C.faint};margin-top:2px;">${escapeHtml(sub)}</div>` : ""}
      </div>
    </td>`;
}

function tileRow(cells: string[]): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 -4px 8px;"><tr>${cells.join("")}</tr></table>`;
}

function dailyStrip(d: DeviceWeekly): string {
  const max = Math.max(...d.daily.map((x) => x.engineOnHours), 0.001);
  const head = d.daily.map((x) =>
    `<th style="font-size:10px;font-weight:700;color:${C.muted};padding:6px 2px;border-bottom:1px solid ${C.border};text-align:center;">${escapeHtml(x.label)}</th>`
  ).join("");
  const body = d.daily.map((x) => {
    // Shade the cell by how busy the day was; a day with no running stays plain.
    const ratio = x.engineOnHours / max;
    const bg = x.engineOnHours <= 0 ? "#ffffff" : ratio > 0.66 ? "#dcfce7" : ratio > 0.33 ? "#ecfdf5" : "#f7fef9";
    const starts = x.starts > 0 ? `${x.starts} start${x.starts === 1 ? "" : "s"}` : "—";
    return `<td style="text-align:center;padding:8px 2px;background:${bg};border-bottom:1px solid ${C.border};">
      <div style="font-size:13px;font-weight:700;color:${x.engineOnHours > 0 ? C.text : C.faint};">${escapeHtml(fmtHours(x.engineOnHours))}</div>
      <div style="font-size:10px;color:${C.faint};margin-top:2px;">${escapeHtml(starts)}</div>
    </td>`;
  }).join("");
  return `
    <div style="font-size:10px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${C.muted};margin:14px 0 6px;">Engine-on time by day</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid ${C.border};border-radius:8px;">
      <tr>${head}</tr><tr>${body}</tr>
    </table>`;
}

function noteLine(icon: string, text: string, fg: string, bg: string, border: string): string {
  return `<div style="background:${bg};border:1px solid ${border};border-radius:8px;padding:9px 12px;margin:8px 0 0;font-size:12px;color:${fg};">${icon} ${escapeHtml(text)}</div>`;
}

function alertsBlock(d: DeviceWeekly): string {
  if (d.alerts.length === 0) return "";
  const items = d.alerts.slice(0, 6).map((a) => {
    const crit = a.severity === "critical";
    return `<div style="background:${crit ? C.redBg : C.amberBg};border:1px solid ${crit ? C.redBorder : C.amberBorder};border-radius:8px;padding:9px 12px;margin-bottom:6px;">
      <span style="font-size:8px;font-weight:700;padding:2px 6px;border-radius:4px;text-transform:uppercase;background:${crit ? "#dc2626" : "#d97706"};color:#fff;">${a.severity}</span>
      <span style="font-size:12px;font-weight:600;color:${crit ? C.red : C.amber};margin-left:6px;">${escapeHtml(a.message)}</span>
      <span style="font-size:11px;color:${C.faint};margin-left:6px;">· raised ${a.count}×</span>
    </div>`;
  }).join("");
  const more = d.alerts.length > 6 ? `<div style="font-size:11px;color:${C.faint};">+ ${d.alerts.length - 6} more</div>` : "";
  return `
    <div style="font-size:10px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${C.muted};margin:14px 0 6px;">Alerts raised this week</div>
    ${items}${more}`;
}

function deviceCard(d: DeviceWeekly): string {
  const isDrive = d.brand === "GreenDrive";
  const unit = isDrive ? "Engine" : "DG";

  const notes: string[] = [];
  if (d.status === "no_data") {
    notes.push(noteLine("⚪", `No data received this week. Last seen ${fmtIst(d.lastSeenAt)} IST.`, C.gray, C.grayBg, C.grayBorder));
  } else {
    if (d.dataAvailabilityPct < 50) {
      notes.push(noteLine("📡", `Reported in only ${d.dataAvailabilityPct}% of hours this week — figures may be under-counted. Last seen ${fmtIst(d.lastSeenAt)} IST.`, C.amber, C.amberBg, C.amberBorder));
    }
    if (d.engineOnHours > 0 && d.loadHours < d.engineOnHours * 0.5) {
      notes.push(noteLine("⚠️", `${unit} ran ${fmtHours(d.engineOnHours)} but produced output for only ${fmtHours(d.loadHours)} — check the electrolyser while running.`, C.amber, C.amberBg, C.amberBorder));
    }
    if (d.waterEpisodes > 0) {
      notes.push(noteLine("💧", `Water shortage detected ${d.waterEpisodes} time${d.waterEpisodes === 1 ? "" : "s"} (${fmtHours(d.waterShortHours)} of engine-on time). Keep the tanks topped up.`, C.amber, C.amberBg, C.amberBorder));
    }
    if (!isDrive && d.displacementKm !== null && d.displacementKm > 0.3) {
      notes.push(noteLine("📍", `Position changed by about ${d.displacementKm.toFixed(1)} km during the week. A stationary DG should not move — please confirm it was relocated.`, C.red, C.redBg, C.redBorder));
    }
    if (d.setAmps !== null && d.avgAmps !== null && Math.abs(d.avgAmps - d.setAmps) > d.setAmps * 0.1) {
      notes.push(noteLine("⚡", `Average output ${d.avgAmps.toFixed(1)} A is outside ±10% of the ${d.setAmps.toFixed(1)} A setpoint.`, C.amber, C.amberBg, C.amberBorder));
    }
  }

  const numbers = d.status === "no_data" ? "" : `
    ${tileRow([
      tile("Engine-on time", fmtHours(d.engineOnHours), "Din.1 = ON"),
      tile("Under load", fmtHours(d.loadHours), "output > 2 A"),
      tile("Starts", String(d.starts), d.starts > 0 ? `longest run ${fmtHours(d.longestRunHours)}` : undefined),
      tile("Avg output", fmtNum(d.avgAmps, "A"), d.peakAmps !== null ? `peak ${d.peakAmps.toFixed(1)} A` : undefined),
    ])}
    ${tileRow([
      tile("Supply voltage", fmtNum(d.supplyMinV, "V"), d.supplyAvgV !== null ? `min · avg ${d.supplyAvgV.toFixed(1)} V` : "min"),
      tile("Tracker battery", fmtNum(d.batteryMinV, "V", 2), "min"),
      tile("GSM signal", fmtNum(d.gsmAvgPct, "%", 0), "average"),
      tile("Data availability", `${d.dataAvailabilityPct}%`, `${d.hoursWithData} of 168 h`),
    ])}
    ${dailyStrip(d)}`;

  return `
    <div style="border:1px solid ${C.border};border-radius:10px;overflow:hidden;margin-bottom:20px;">
      <div style="background:${C.surface};padding:12px 16px;border-bottom:1px solid ${C.border};">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td valign="top">
            <div style="font-size:14px;font-weight:700;color:${C.text};">${escapeHtml(d.deviceName)}</div>
            <div style="font-size:11px;color:${C.muted};margin-top:2px;font-family:monospace;">${escapeHtml(d.imei)} · ${escapeHtml(d.hardware)}</div>
          </td>
          <td valign="top" align="right" style="white-space:nowrap;">
            ${brandPill(d)} ${statusPill(d)}
          </td>
        </tr></table>
      </div>
      <div style="padding:14px 16px;">
        ${numbers}
        ${notes.join("")}
        ${alertsBlock(d)}
      </div>
    </div>`;
}

// ─── Whole email ─────────────────────────────────────────────────────────────

export function buildWeeklyReportHtml(data: WeeklyReportData): string {
  const s = fleetSummary(data);
  const range = fmtDateRange(data.weekStart, data.weekEnd);
  const brand = brandWord(data);

  const intro = s.reporting === 0
    ? `None of your ${brand} units sent data this week.`
    : s.needAttention > 0
    ? `${s.needAttention} of your ${s.units} ${brand} unit${s.units === 1 ? "" : "s"} need${s.needAttention === 1 ? "s" : ""} attention this week. Details are below.`
    : `All ${s.units} of your ${brand} unit${s.units === 1 ? "" : "s"} ran normally this week.`;

  const cards = [...data.devices]
    // Problems first, then by name — so the top of the email is the part that matters.
    .sort((a, b) => {
      const rank = (d: DeviceWeekly) => d.status === "attention" ? 0 : d.status === "no_data" ? 2 : 1;
      return rank(a) - rank(b) || a.deviceName.localeCompare(b.deviceName);
    })
    .map(deviceCard)
    .join("");

  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:640px;margin:0 auto;background:#ffffff;">

  <div style="background:${C.headerBg};padding:24px 28px;border-radius:12px 12px 0 0;">
    <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:700;">📊 Weekly ${escapeHtml(brand)} Report</h1>
    <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:13px;">
      ${escapeHtml(data.customerName)} · ${escapeHtml(range)}${data.partial ? " · week in progress" : ""}
    </p>
  </div>

  <div style="padding:24px 28px;border:1px solid ${C.border};border-top:none;border-radius:0 0 12px 12px;">

    <p style="font-size:14px;color:${C.text};margin:0 0 12px;line-height:1.5;">Hi ${escapeHtml(data.contactName || data.customerName)},</p>
    <p style="font-size:13px;color:#4b5563;margin:0 0 20px;line-height:1.5;">${escapeHtml(intro)} All times are IST.</p>

    ${tileRow([
      tile("Engine-on time", fmtHours(s.engineOnHours), `across ${s.units} unit${s.units === 1 ? "" : "s"}`),
      tile("Under load", fmtHours(s.loadHours), "output > 2 A"),
      tile("Starts", String(s.starts), "this week"),
      tile("Alerts", String(s.alertLines), s.needAttention > 0 ? `${s.needAttention} unit${s.needAttention === 1 ? "" : "s"} flagged` : "none"),
    ])}

    <div style="height:12px;"></div>

    ${cards}

    <div style="margin-top:24px;padding-top:16px;border-top:1px solid ${C.border};">
      <p style="font-size:11px;color:${C.faint};margin:0;line-height:1.6;">
        This report covers units that are commissioned and reporting; units not yet installed are not listed.
        Engine-on time is measured from the run-status input (Din.1). "Under load" is time with output current above 2 A.
        Generated ${escapeHtml(fmtIst(data.generatedAt))} IST by SGT Hydroedge monitoring. Reply to this email to reach support.
      </p>
    </div>
  </div>
</div>`;
}
