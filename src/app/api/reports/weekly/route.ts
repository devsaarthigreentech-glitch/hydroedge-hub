import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { sendHtmlEmail } from "@/lib/email";
import {
  buildWeeklyReportHtml, weeklyReportSubject, fleetSummary, dayLabel,
  DeviceWeekly, WeeklyReportData, WeeklyDay, WeeklyAlertLine, DeviceBrand,
} from "@/lib/weekly-report";
// Engine/electrical numbers and the movement rule live in one module so the
// Analytics tab and this report can never quote different figures for the
// same week — including the threshold at which a DG counts as relocated.
import {
  computeDgMetrics, computeDgMovement, currentDivisorFor,
} from "@/lib/dg-metrics";

// ============================================================================
// POST /api/reports/weekly — send each company its weekly unit report
// GET  /api/reports/weekly — compute without sending (dry run / HTML preview)
//
// Week = Monday 00:00 IST → next Monday 00:00 IST. By default the most recent
// COMPLETED week, so a Monday-morning cron reports on the seven days that just
// ended. See WEEKLY_REPORT.md.
//
// Which devices appear (per device, 'auto' unless overridden):
//   devices.weekly_report = 'never'   → out
//   devices.weekly_report = 'always'  → in
//   otherwise all of:  status = 'active'
//                      commissioned (tested, or has an SGT-Gx series name)
//                      reported within SILENT_AFTER_DAYS of the week's end
//
// The rule exists because a company can have many more devices ASSIGNED than
// running — one has 26 on the books and 2 in the field. GET shows the decision
// and reason for every device so this can be checked before anything sends.
//
// Who gets emailed: same rule as the alert digest (migration 004) —
//   customers.notifications_enabled, users.notifications_enabled, active users
//   with an email — with support on CC.
//
// Params (both verbs):
//   ?customer_id=uuid        one company only
//   ?week_ending=YYYY-MM-DD  report the 7 days ending on that IST date
// POST only:
//   ?test_to=you@x.com       send everything to you, no CC, no log, no gate
//   ?dry_run=1               compute and return JSON, send nothing
//   ?force=1                 send even if this company/week was already sent
// GET only:
//   ?format=html             render the email for the given customer_id
// ============================================================================

const pool = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME     || "sgt_hydroedge",
  user:     process.env.DB_USER     || "sgt_admin",
  password: process.env.DB_PASSWORD || "",
  // A week of io_records for one device is a few hundred thousand rows on a
  // 1 vCPU host; the app pool's 15s ceiling is too tight for that.
  max: 3,
  statement_timeout: 120_000,
  query_timeout:     120_000,
  keepAlive: true,
});

const REPORTING_TZ       = "Asia/Kolkata";
const IST_OFFSET         = "+05:30";       // IST has no DST, so a fixed offset is exact
const SILENT_AFTER_DAYS  = 30;             // 'auto' rule: must have reported this recently
const SERIES_NAME = /^SGT-G[DXMI]-\d{4}-\d+$/;

// ─── Date helpers (IST calendar) ─────────────────────────────────────────────

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function istToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: REPORTING_TZ });
}

function addDays(isoDay: string, delta: number): string {
  const d = new Date(`${isoDay}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** 0 = Monday … 6 = Sunday. */
function mondayIndex(isoDay: string): number {
  return (new Date(`${isoDay}T12:00:00Z`).getUTCDay() + 6) % 7;
}

/** Instant of IST midnight at the start of the given day. */
function istMidnight(isoDay: string): Date {
  return new Date(`${isoDay}T00:00:00${IST_OFFSET}`);
}

interface Week { start: string; end: string; startAt: Date; endAt: Date; partial: boolean }

function resolveWeek(weekEnding: string | null): Week {
  const today = istToday();
  let end: string;
  if (weekEnding) {
    if (!ISO_DAY.test(weekEnding) || isNaN(istMidnight(weekEnding).getTime())) {
      throw new Error("week_ending must be YYYY-MM-DD");
    }
    end = weekEnding;
  } else {
    // Most recent completed Monday→Sunday week.
    const thisMonday = addDays(today, -mondayIndex(today));
    end = addDays(thisMonday, -1);
  }
  const start = addDays(end, -6);
  return {
    start, end,
    startAt: istMidnight(start),
    endAt:   istMidnight(addDays(end, 1)),
    partial: end >= today,
  };
}

// ─── Device selection ────────────────────────────────────────────────────────

interface DeviceRow {
  id: string; imei: string; device_name: string | null; device_type: string;
  asset_name: string; status: string; tested: boolean | null;
  set_ain1_raw: string | null; weekly_report: "auto" | "always" | "never";
  customer_id: string; customer_name: string; contact_name: string | null;
  notifications_enabled: boolean | null;
  last_contact_at: string | null; last_io_at: string | null;
}

interface Decision { include: boolean; reason: string }

function lastSeen(row: DeviceRow): Date | null {
  const candidates = [row.last_contact_at, row.last_io_at]
    .filter(Boolean)
    .map((t) => new Date(t as string).getTime())
    .filter((t) => !isNaN(t));
  return candidates.length ? new Date(Math.max(...candidates)) : null;
}

function decide(row: DeviceRow, week: Week): Decision {
  if (row.weekly_report === "never")  return { include: false, reason: "weekly_report = never" };
  if (row.weekly_report === "always") return { include: true,  reason: "weekly_report = always" };

  if (row.status !== "active") return { include: false, reason: `status is '${row.status}'` };

  const commissioned = row.tested === true || SERIES_NAME.test(row.device_name || "");
  if (!commissioned) return { include: false, reason: "not commissioned (not tested, no series name)" };

  const seen = lastSeen(row);
  if (!seen) return { include: false, reason: "never reported" };

  const cutoff = new Date(week.endAt.getTime() - SILENT_AFTER_DAYS * 24 * 3600 * 1000);
  if (seen < cutoff) {
    return { include: false, reason: `silent since ${seen.toISOString().slice(0, 10)} (over ${SILENT_AFTER_DAYS} days before week end)` };
  }
  return { include: true, reason: `active, commissioned, last seen ${seen.toISOString().slice(0, 10)}` };
}

function brandOf(row: DeviceRow): DeviceBrand {
  return row.asset_name === "EOW" ? "GreenDrive" : "GreenX";
}

function modelOf(row: DeviceRow): string {
  if (row.asset_name === "EOW") return "Engine on Wheels";
  const name = (row.device_name || "").toLowerCase();
  if (name.includes("1500")) return "1500KVA";
  if (name.includes("625"))  return "625KVA";
  if (row.device_type === "FMC650") return "380KVA";
  return row.device_type; // no rating known — say what hardware it is
}

// ─── Per-device metrics ──────────────────────────────────────────────────────

// Engine hours, load hours, starts, current and the position check all come
// from src/lib/dg-metrics.ts — the same code the Analytics tab calls, so the
// email and the screen cannot drift apart. Only the report-specific lookups
// below (water episodes, alert history) are still queried here.

const WATER_SQL = `
SELECT COUNT(*)::int AS episodes, COALESCE(SUM(short_seconds), 0)::bigint AS secs
  FROM device_water_short_log
 WHERE device_id = $1
   AND first_seen_at < $3
   AND COALESCE(cleared_at, NOW()) >= $2
`;

const ALERTS_SQL = `
SELECT alert_id, severity, MAX(message) AS message, COUNT(*)::int AS n
  FROM notification_log
 WHERE device_id = $1
   AND sent_at >= $2 AND sent_at < $3
 GROUP BY alert_id, severity
 ORDER BY MAX(sent_at) DESC
`;

const num = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
};
const round = (v: number | null, d = 1): number | null =>
  v === null ? null : parseFloat(v.toFixed(d));

async function computeDeviceWeek(client: any, row: DeviceRow, week: Week, tables: Tables): Promise<DeviceWeekly> {
  const divisor = currentDivisorFor(row.device_type);
  const args = [row.id, week.startAt, week.endAt];

  // The seven IST days of the week, so a day the unit never ran still appears
  // in the strip as a zero rather than dropping out of the chart.
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(week.start, i));

  const [metrics, movement] = await Promise.all([
    computeDgMetrics(client, row.id, row.device_type, week.startAt, week.endAt, weekDays),
    computeDgMovement(client, row.id, week.startAt, week.endAt),
  ]);

  const daily: WeeklyDay[] = metrics.daily.map((d) => ({
    day: d.day,
    label: dayLabel(d.day),
    engineOnHours: d.engineOnHours,
    starts: d.starts,
    avgAmps: d.avgAmps,
  }));

  const displacementKm = movement.spreadKm;

  // ── Water shortage episodes (table may not exist on older installs) ────────
  let waterEpisodes = 0, waterShortHours = 0;
  if (tables.water) {
    try {
      const w = (await client.query(WATER_SQL, args)).rows[0];
      waterEpisodes   = Number(w?.episodes || 0);
      waterShortHours = round(Number(w?.secs || 0) / 3600, 2) ?? 0;
    } catch (err: any) {
      console.warn(`[weekly] water log failed for ${row.device_name}: ${err.message}`);
    }
  }

  // ── Alerts the scan raised this week ───────────────────────────────────────
  let alerts: WeeklyAlertLine[] = [];
  if (tables.alerts) {
    try {
      alerts = (await client.query(ALERTS_SQL, args)).rows.map((a: any) => ({
        id: a.alert_id, severity: a.severity === "critical" ? "critical" : "warning",
        message: a.message, count: Number(a.n),
      }));
    } catch (err: any) {
      console.warn(`[weekly] notification log failed for ${row.device_name}: ${err.message}`);
    }
  }

  const hoursWithData = metrics.hoursWithData;
  const engineOnHours = metrics.engineOnHours;
  const loadHours     = metrics.loadHours;
  const setAmps       = round(num(row.set_ain1_raw) !== null ? (num(row.set_ain1_raw) as number) / divisor : null, 1);
  const avgAmps       = metrics.avgAmps;
  const isDrive       = row.asset_name === "EOW";

  // ── Status ─────────────────────────────────────────────────────────────────
  let status: DeviceWeekly["status"] = "healthy";
  const causes: string[] = [];
  if (hoursWithData === 0) {
    status = "no_data";
  } else {
    if (alerts.length > 0) causes.push(`${alerts.length} alert${alerts.length === 1 ? "" : "s"}`);
    if (waterEpisodes > 0) causes.push("water shortage");
    if (!isDrive && movement.moved) causes.push("position changed");
    if (engineOnHours > 0 && loadHours < engineOnHours * 0.5) causes.push("low output while running");
    if (setAmps !== null && avgAmps !== null && Math.abs(avgAmps - setAmps) > setAmps * 0.1) causes.push("output outside setpoint band");
    if (causes.length) status = "attention";
  }

  const seen = lastSeen(row);

  return {
    deviceId: row.id,
    deviceName: row.device_name || row.imei,
    imei: row.imei,
    hardware: row.device_type,
    brand: brandOf(row),
    model: modelOf(row),
    lastSeenAt: seen ? seen.toISOString() : null,
    hoursWithData,
    dataAvailabilityPct: Math.round((hoursWithData / 168) * 100),
    engineOnHours,
    loadHours,
    starts: metrics.starts,
    longestRunHours: metrics.longestRunHours,
    avgAmps,
    peakAmps: metrics.peakAmps,
    setAmps,
    supplyMinV: metrics.supplyMinV,
    supplyAvgV: metrics.supplyAvgV,
    batteryMinV: metrics.batteryMinV,
    gsmAvgPct: metrics.gsmAvgPct,
    waterEpisodes,
    waterShortHours,
    displacementKm,
    alerts,
    daily,
    status,
    statusNote: causes.join(", "),
  };
}

// ─── Assemble per-customer reports ───────────────────────────────────────────

interface Tables { override: boolean; log: boolean; alerts: boolean; water: boolean }

async function detectTables(client: any): Promise<Tables> {
  const r = await client.query(`
    SELECT
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'weekly_report') AS override,
      EXISTS (SELECT 1 FROM information_schema.tables  WHERE table_name = 'weekly_report_log')       AS log,
      EXISTS (SELECT 1 FROM information_schema.tables  WHERE table_name = 'notification_log')        AS alerts,
      EXISTS (SELECT 1 FROM information_schema.tables  WHERE table_name = 'device_water_short_log')  AS water
  `);
  return r.rows[0];
}

interface DeviceDecision { device: string; imei: string; reason: string }

interface CustomerReport {
  customerId: string;
  customerName: string;
  recipients: string[];
  skipReason?: string;
  included: DeviceDecision[];
  excluded: DeviceDecision[];
  data: WeeklyReportData | null;
}

async function computeReports(client: any, week: Week, customerId: string | null, warnings: string[]): Promise<CustomerReport[]> {
  const tables = await detectTables(client);
  if (!tables.override) warnings.push("devices.weekly_report column missing — run db/migrations/008_weekly_report.sql; treating every device as 'auto'");
  if (!tables.log)      warnings.push("weekly_report_log table missing — run db/migrations/008_weekly_report.sql; double-send guard is OFF");

  const params: unknown[] = [];
  let filter = "";
  if (customerId) { params.push(customerId); filter = `AND d.customer_id = $${params.length}`; }

  const devices = await client.query(`
    SELECT d.id, d.imei, d.device_name, d.device_type, d.asset_name, d.status, d.tested,
           d.set_ain1_raw, d.customer_id, d.last_contact_at,
           ${tables.override ? "d.weekly_report" : "'auto'"} AS weekly_report,
           c.name AS customer_name,
           c.contact_person_name AS contact_name,
           c.notifications_enabled,
           ls.last_io_at
      FROM devices d
      JOIN customers c ON c.id = d.customer_id
      -- Newest packet, one indexed seek per device. last_contact_at alone is not
      -- enough: it stays NULL for devices that predate migration 000.
      LEFT JOIN LATERAL (
        SELECT io.timestamp AS last_io_at
          FROM io_records io
         WHERE io.device_id = d.id
         ORDER BY io.timestamp DESC
         LIMIT 1
      ) ls ON TRUE
     WHERE d.deleted_at IS NULL
       AND c.deleted_at IS NULL
       AND d.asset_name IN ('DG', 'EOW')
       ${filter}
     ORDER BY c.name, d.device_name
  `, params);

  // Group by company.
  const groups = new Map<string, { rows: DeviceRow[]; name: string; contact: string | null; enabled: boolean }>();
  for (const row of devices.rows as DeviceRow[]) {
    const g = groups.get(row.customer_id) ?? {
      rows: [], name: row.customer_name, contact: row.contact_name,
      enabled: row.notifications_enabled !== false,
    };
    g.rows.push(row);
    groups.set(row.customer_id, g);
  }

  // Recipients, same rule as the alert digest.
  const ids = [...groups.keys()];
  const usersByCustomer: Record<string, { email: string; name: string }[]> = {};
  if (ids.length) {
    const users = await client.query(`
      SELECT customer_id, email, full_name FROM users
       WHERE customer_id = ANY($1) AND status = 'active'
         AND deleted_at IS NULL AND email IS NOT NULL AND email != ''
         AND COALESCE(notifications_enabled, TRUE) = TRUE
       ORDER BY full_name NULLS LAST
    `, [ids]);
    for (const u of users.rows) {
      (usersByCustomer[u.customer_id] ??= []).push({ email: u.email, name: u.full_name || u.email });
    }
  }

  const reports: CustomerReport[] = [];
  for (const [id, g] of groups) {
    const report: CustomerReport = {
      customerId: id, customerName: g.name,
      recipients: (usersByCustomer[id] || []).map((u) => u.email),
      included: [], excluded: [], data: null,
    };

    const chosen: DeviceRow[] = [];
    for (const row of g.rows) {
      const d = decide(row, week);
      const entry = { device: row.device_name || row.imei, imei: row.imei, reason: d.reason };
      if (d.include) { report.included.push(entry); chosen.push(row); }
      else report.excluded.push(entry);
    }

    if (!g.enabled) {
      report.skipReason = "company notifications are off (customers.notifications_enabled)";
    } else if (chosen.length === 0) {
      report.skipReason = "no operational devices this week";
    } else {
      const deviceWeeks: DeviceWeekly[] = [];
      for (const row of chosen) {
        try {
          deviceWeeks.push(await computeDeviceWeek(client, row, week, tables));
        } catch (err: any) {
          // One slow or broken device must not cost the company its report.
          warnings.push(`${row.device_name || row.imei}: metrics failed (${err.message}) — left out`);
        }
      }
      if (deviceWeeks.length === 0) {
        report.skipReason = "metrics failed for every included device";
      } else {
        report.data = {
          customerName: g.name,
          contactName: usersByCustomer[id]?.[0]?.name || g.contact || g.name,
          weekStart: week.start, weekEnd: week.end, partial: week.partial,
          generatedAt: new Date().toISOString(),
          devices: deviceWeeks,
        };
      }
    }
    reports.push(report);
  }
  return reports;
}

// ─── POST: send ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const sp         = request.nextUrl.searchParams;
  const testTo     = sp.get("test_to");
  const customerId = sp.get("customer_id");
  const dryRun     = sp.get("dry_run") === "1";
  const force      = sp.get("force") === "1";
  const isTest     = !!testTo;

  let week: Week;
  try { week = resolveWeek(sp.get("week_ending")); }
  catch (err: any) { return NextResponse.json({ success: false, error: err.message }, { status: 400 }); }

  const client = await pool.connect();
  const warnings: string[] = [];
  try {
    const tables  = await detectTables(client);
    const reports = await computeReports(client, week, customerId, warnings);
    const results: any[] = [];

    for (const r of reports) {
      const base = {
        customer: r.customerName, customer_id: r.customerId,
        included: r.included, excluded: r.excluded,
        recipients: r.recipients,
      };

      if (!r.data) { results.push({ ...base, status: `skipped: ${r.skipReason}` }); continue; }
      if (dryRun)  { results.push({ ...base, status: "dry run", summary: fleetSummary(r.data) }); continue; }

      // Double-send guard — only a delivered report closes it.
      if (!isTest && !force && tables.log) {
        const sent = await client.query(
          `SELECT sent_at FROM weekly_report_log
            WHERE customer_id = $1 AND week_start = $2 AND email_status = 'sent' LIMIT 1`,
          [r.customerId, week.start]
        );
        if (sent.rows.length) {
          results.push({ ...base, status: `skipped: already sent ${new Date(sent.rows[0].sent_at).toISOString()} (use ?force=1)` });
          continue;
        }
      }

      const email = await sendHtmlEmail({
        to:       isTest ? [testTo!] : r.recipients,
        cc:       isTest ? [] : undefined,
        subject:  weeklyReportSubject(r.data),
        html:     buildWeeklyReportHtml(r.data),
        fromName: "SGT Hydroedge Reports",
      });
      const status = email.success ? "sent" : `error: ${email.error}`;

      if (!isTest && tables.log) {
        await client.query(
          `INSERT INTO weekly_report_log
             (customer_id, week_start, week_end, device_count, recipients, email_status, summary)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [r.customerId, week.start, week.end, r.data.devices.length,
           r.recipients.join(", "), status, JSON.stringify(fleetSummary(r.data))]
        );
      }

      results.push({
        ...base, status,
        actual_sent_to: email.sentTo, actual_cc: email.ccTo,
        ...(isTest ? { test_mode: true, production_would_send_to: r.recipients } : {}),
        summary: fleetSummary(r.data),
      });
    }

    return NextResponse.json({
      success: true,
      week: { start: week.start, end: week.end, partial: week.partial, timezone: REPORTING_TZ },
      ...(isTest ? { test_mode: true, test_email: testTo } : {}),
      ...(dryRun ? { dry_run: true } : {}),
      customers: results.length,
      emails_sent: results.filter((x) => x.status === "sent").length,
      results,
      ...(warnings.length ? { warnings } : {}),
    });
  } catch (err: any) {
    console.error("[WEEKLY REPORT ERROR]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}

// ─── GET: preview / dry run ──────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const sp         = request.nextUrl.searchParams;
  const customerId = sp.get("customer_id");
  const format     = sp.get("format");

  let week: Week;
  try { week = resolveWeek(sp.get("week_ending")); }
  catch (err: any) { return NextResponse.json({ success: false, error: err.message }, { status: 400 }); }

  if (format === "html" && !customerId) {
    return NextResponse.json({ success: false, error: "format=html needs customer_id" }, { status: 400 });
  }

  const client = await pool.connect();
  const warnings: string[] = [];
  try {
    const reports = await computeReports(client, week, customerId, warnings);

    if (format === "html") {
      const r = reports[0];
      if (!r || !r.data) {
        const why = r?.skipReason || "no GreenX / GreenDrive devices for this customer";
        return new NextResponse(
          `<pre style="font-family:monospace;padding:24px;">No report for this customer/week: ${why}\n\n` +
          `Excluded:\n${(r?.excluded || []).map((e) => `  ${e.device}  —  ${e.reason}`).join("\n") || "  (none)"}</pre>`,
          { headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      }
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${weeklyReportSubject(r.data)}</title></head>` +
                   `<body style="margin:0;padding:24px;background:#f3f4f6;">${buildWeeklyReportHtml(r.data)}</body></html>`;
      return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    return NextResponse.json({
      success: true,
      week: { start: week.start, end: week.end, partial: week.partial, timezone: REPORTING_TZ },
      dry_run: true,
      customers: reports.map((r) => ({
        customer: r.customerName, customer_id: r.customerId,
        recipients: r.recipients,
        status: r.data ? "would send" : `skipped: ${r.skipReason}`,
        included: r.included, excluded: r.excluded,
        ...(r.data ? { subject: weeklyReportSubject(r.data), summary: fleetSummary(r.data), devices: r.data.devices } : {}),
      })),
      ...(warnings.length ? { warnings } : {}),
    });
  } catch (err: any) {
    console.error("[WEEKLY REPORT ERROR]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
