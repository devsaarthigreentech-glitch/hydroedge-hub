// ============================================================================
// Alert dispatch — what the scan found, and who hears about it when
// ----------------------------------------------------------------------------
// POST /api/alerts/check detects alarms; this module owns everything after
// that. Three outputs, deliberately very different in volume:
//
//   Customer digest   One email per company per day, at DIGEST_HOUR in the
//                     company's own timezone (customers.timezone). Lists every
//                     fault still open plus every fault that cleared since the
//                     previous delivered digest — so a fault that came and went
//                     while nobody was scanning at 09:00 is still reported.
//
//   Support digest    To SUPPORT_EMAILS, at most once per SUPPORT_BLOCK_HOURS
//                     block (IST), and only when a NEW fault started. A fault
//                     already announced is not repeated, and one that recurs
//                     within REPEAT_LOOKBACK_HOURS of a previous occurrence is
//                     not "new". A quiet day sends nothing.
//
//   Immediate         IMMEDIATE_ALERT_IDS only, on detection, repeated at most
//                     once a day while the fault stays open.
//
// State lives in alert_episodes (one row per fault occurrence) and
// alert_dispatches (one row per email attempt) — see migration 019. Delivery
// marks are only written for a DELIVERED email: a failed send never makes the
// system believe a customer was told.
// ============================================================================

import {
  sendBatchAlertEmail, sendHtmlEmail, SUPPORT_EMAILS, formatInZone, DeviceAlert,
} from "@/lib/email";

export const DEFAULT_TZ           = "Asia/Kolkata";
export const DIGEST_HOUR          = 9;
const SUPPORT_TZ                  = "Asia/Kolkata";
const SUPPORT_BLOCK_HOURS         = 6;
const MAX_ATTEMPTS_PER_WINDOW     = 3;   // per day for a customer, per block for support
const REPEAT_LOOKBACK_HOURS       = 24;  // support: recurrence inside this is not new
const IMMEDIATE_REPEAT_HOURS      = 24;
const IMMEDIATE_RETRY_MINUTES     = 30;  // after a failed urgent send
const MAX_DIGEST_LOOKBACK_DAYS    = 7;

/** A fault that has been undetected this long is closed. */
export const EPISODE_CLEAR_GRACE_MINUTES = 30;

/**
 * Alarms that can only be evaluated while the engine runs. Their absence while
 * the engine is off says nothing — an empty tank is still empty — so they are
 * held open on a stopped device instead of being reported as resolved, up to
 * PAUSED_EPISODE_MAX_DAYS.
 */
export const ENGINE_DEPENDENT_ALERT_IDS = [
  "remote_shutdown", "abnormal_no_current", "system_off_water_tank", "abnormal_low_current",
  "electrolyser_water_short", "bubbler_water_short", "main_tank_short",
  "under_current", "over_current",
];
const PAUSED_EPISODE_MAX_DAYS = 7;

// Alert ids that bypass the daily roundup. Keep this list short: every addition
// is another email that can arrive at 3am.
export const IMMEDIATE_ALERT_IDS = new Set(["external_power_low"]);

const DAY_MS  = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DetectedAlarm {
  deviceId:   string;
  customerId: string;
  alertId:    string;
  severity:   "critical" | "warning";
  message:    string;
  action:     string;
}

export interface DeviceMeta { name: string; imei: string; model: string; }

export interface CustomerContext {
  id:          string;
  name:        string;
  contactName: string;
  timezone:    string;
  recipients:  { email: string; name: string }[];
  deviceIds:   string[];
}

export interface DispatchOptions {
  /** Redirect every email here, ignore the clock gates, write no delivery state. */
  testTo?:  string | null;
  /** Send nothing and write no delivery state — just report what would happen. */
  dryRun?:  boolean;
  /** Set when the scan was limited to one customer; support digest is skipped. */
  partial?: boolean;
}

interface EpisodeRow {
  id: number; device_id: string; customer_id: string; alert_id: string;
  severity: "critical" | "warning"; message: string; action: string;
  first_seen_at: Date; last_seen_at: Date; cleared_at: Date | null;
  customer_reported_at: Date | null;
}

// ─── Time helpers ─────────────────────────────────────────────────────────────

/** A usable IANA zone, or the default when the stored value is blank or bogus. */
export function safeTimeZone(tz: string | null | undefined): string {
  if (!tz) return DEFAULT_TZ;
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
}

export function hourIn(d: Date, tz: string): number {
  return parseInt(
    new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(d),
    10
  );
}

// ─── Episodes ─────────────────────────────────────────────────────────────────

/**
 * Upsert one episode per detected alarm and close the ones that have gone
 * undetected for the grace period. Only devices in this scan are closed, so a
 * scan limited to one customer cannot close another customer's faults.
 * `stoppedDeviceIds` are devices whose engine is not running right now: their
 * engine-dependent episodes are left open (see ENGINE_DEPENDENT_ALERT_IDS).
 */
export async function recordEpisodes(
  client: any,
  detected: DetectedAlarm[],
  scannedDeviceIds: string[],
  stoppedDeviceIds: string[] = []
): Promise<{ opened: number; closed: number }> {
  let opened = 0;
  for (const a of detected) {
    const r = await client.query(`
      INSERT INTO alert_episodes (device_id, customer_id, alert_id, severity, message, action)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (device_id, alert_id) WHERE cleared_at IS NULL
      DO UPDATE SET last_seen_at = NOW(),
                    customer_id  = EXCLUDED.customer_id,
                    severity     = EXCLUDED.severity,
                    message      = EXCLUDED.message,
                    action       = EXCLUDED.action
      RETURNING (xmax = 0) AS inserted
    `, [a.deviceId, a.customerId, a.alertId, a.severity, a.message, a.action]);
    if (r.rows[0]?.inserted) opened++;
  }

  // cleared_at = last_seen_at: the fault really stopped somewhere after the
  // last scan that saw it, which is closer to the truth than "now".
  const closed = await client.query(`
    UPDATE alert_episodes
       SET cleared_at = last_seen_at
     WHERE cleared_at IS NULL
       AND device_id = ANY($1)
       AND last_seen_at < NOW() - INTERVAL '1 minute' * $2
       AND NOT (
         device_id = ANY($3) AND alert_id = ANY($4)
         AND last_seen_at > NOW() - INTERVAL '1 day' * $5
       )
  `, [scannedDeviceIds, EPISODE_CLEAR_GRACE_MINUTES, stoppedDeviceIds,
      ENGINE_DEPENDENT_ALERT_IDS, PAUSED_EPISODE_MAX_DAYS]);

  return { opened, closed: closed.rowCount || 0 };
}

// ─── Shared bits ──────────────────────────────────────────────────────────────

async function logDispatch(
  client: any,
  row: { kind: string; customerId: string | null; status: string; recipients: string[];
         cc: string[]; episodeCount: number; subject: string }
) {
  await client.query(`
    INSERT INTO alert_dispatches (kind, customer_id, status, recipients, cc, episode_count, subject)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [row.kind, row.customerId, row.status, row.recipients.join(", "),
      row.cc.join(", "), row.episodeCount, row.subject]);
}

/** notification_log is what the weekly report counts alerts from. */
async function logNotifications(
  client: any,
  episodes: EpisodeRow[],
  meta: Map<string, DeviceMeta>,
  customerName: string,
  recipients: string[],
  status: string,
  kind: "digest" | "immediate"
) {
  for (const e of episodes) {
    const m = meta.get(e.device_id);
    await client.query(`
      INSERT INTO notification_log
        (device_id, alert_id, severity, message, action,
         customer_email, customer_name, device_name, device_imei,
         email_status, dispatch_kind)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [e.device_id, e.alert_id, e.severity, e.message, e.action,
        recipients.join(", "), customerName, m?.name || "", m?.imei || "", status, kind]);
  }
}

function toDeviceAlert(e: EpisodeRow, meta: Map<string, DeviceMeta>, tz: string): DeviceAlert {
  const m = meta.get(e.device_id);
  const open = e.cleared_at === null;
  return {
    deviceName:  m?.name  || e.device_id,
    deviceImei:  m?.imei  || "",
    deviceModel: m?.model || "",
    severity:    e.severity,
    message:     e.message,
    action:      e.action,
    active:      open,
    status: open
      ? `Ongoing since ${formatInZone(e.first_seen_at, tz)}`
      : `Started ${formatInZone(e.first_seen_at, tz)} · resolved ${formatInZone(e.cleared_at!, tz)}`,
  };
}

/** Open first, critical before warning, oldest first. */
function sortEpisodes(rows: EpisodeRow[]): EpisodeRow[] {
  return [...rows].sort((a, b) =>
    (a.cleared_at === null ? 0 : 1) - (b.cleared_at === null ? 0 : 1) ||
    (a.severity === "critical" ? 0 : 1) - (b.severity === "critical" ? 0 : 1) ||
    new Date(a.first_seen_at).getTime() - new Date(b.first_seen_at).getTime()
  );
}

// ─── No-data backoff ──────────────────────────────────────────────────────────
//
// "This device has been dark for 104 days" does not change between one day and
// the next, and repeating it daily is how a customer learns to filter the whole
// alert stream to trash. An OPEN no-data episode is therefore only re-listed in
// the digest every 14 days for the first three weeks of an outage, then every
// 30. (The episode opens when the device crosses 7 days dark, so 14 days of
// episode age is day 21 of the outage.) Two hours are shaved off so the repeat
// lands in the intended morning's digest instead of drifting a day later.
function noDataDue(e: EpisodeRow, now: Date): boolean {
  if (e.alert_id !== "no_data_7d" || e.cleared_at !== null) return true;
  if (!e.customer_reported_at) return true;
  const ageDays    = (now.getTime() - new Date(e.first_seen_at).getTime()) / DAY_MS;
  const repeatDays = ageDays < 14 ? 14 : 30;
  const sinceMs    = now.getTime() - new Date(e.customer_reported_at).getTime();
  return sinceMs >= repeatDays * DAY_MS - 2 * HOUR_MS;
}

// ─── Immediate ────────────────────────────────────────────────────────────────

export async function dispatchImmediate(
  client: any,
  customers: CustomerContext[],
  meta: Map<string, DeviceMeta>,
  opts: DispatchOptions
): Promise<any[]> {
  const results: any[] = [];
  const ids = [...IMMEDIATE_ALERT_IDS];
  const live = !opts.testTo && !opts.dryRun;

  for (const c of customers) {
    if (c.deviceIds.length === 0) continue;
    const r = await client.query(`
      SELECT * FROM alert_episodes
       WHERE customer_id = $1 AND device_id = ANY($2) AND alert_id = ANY($3)
         AND cleared_at IS NULL
         ${opts.testTo ? "" : `
         AND (immediate_sent_at    IS NULL OR immediate_sent_at    < NOW() - INTERVAL '1 hour'   * $4)
         AND (immediate_attempt_at IS NULL OR immediate_attempt_at < NOW() - INTERVAL '1 minute' * $5)`}
    `, opts.testTo
      ? [c.id, c.deviceIds, ids]
      : [c.id, c.deviceIds, ids, IMMEDIATE_REPEAT_HOURS, IMMEDIATE_RETRY_MINUTES]);

    const episodes: EpisodeRow[] = sortEpisodes(r.rows);
    if (episodes.length === 0) continue;

    const recipients = c.recipients.map((u) => u.email);
    const entry: any = {
      customer: c.name, customer_id: c.id, dispatch: "immediate",
      alerts: episodes.map((e) => ({ device: meta.get(e.device_id)?.name, message: e.message })),
      production_would_send_to: recipients,
    };

    if (opts.dryRun) {
      results.push({ ...entry, status: "dry run — not sent" });
      continue;
    }

    const email = await sendBatchAlertEmail({
      to:           opts.testTo ? [opts.testTo] : recipients,
      cc:           opts.testTo ? [] : undefined,
      contactName:  c.recipients[0]?.name || c.contactName,
      customerName: c.name,
      alerts:       episodes.map((e) => toDeviceAlert(e, meta, c.timezone)),
      timestamp:    new Date().toISOString(),
      dispatchKind: "immediate",
      timeZone:     c.timezone,
    });
    const status = email.success ? "sent" : `error: ${email.error}`;

    if (live) {
      const epIds = episodes.map((e) => e.id);
      await client.query(
        `UPDATE alert_episodes
            SET immediate_attempt_at = NOW()
                ${email.success ? ", immediate_sent_at = NOW()" : ""}
          WHERE id = ANY($1)`,
        [epIds]
      );
      await logDispatch(client, {
        kind: "immediate", customerId: c.id, status, recipients: email.sentTo,
        cc: email.ccTo, episodeCount: episodes.length, subject: `URGENT — ${c.name}`,
      });
      await logNotifications(client, episodes, meta, c.name, recipients, status, "immediate");
    }

    results.push({ ...entry, actual_sent_to: email.sentTo, actual_cc: email.ccTo, status });
  }
  return results;
}

// ─── Customer digest ──────────────────────────────────────────────────────────

export async function dispatchCustomerDigests(
  client: any,
  customers: CustomerContext[],
  meta: Map<string, DeviceMeta>,
  opts: DispatchOptions
): Promise<{ sent: any[]; held: any[] }> {
  const sent: any[] = [];
  const held: any[] = [];
  const now  = new Date();
  const live = !opts.testTo && !opts.dryRun;

  for (const c of customers) {
    if (c.deviceIds.length === 0) continue;
    const tz = c.timezone;

    const gate = await client.query(`
      SELECT
        MAX(sent_at) FILTER (WHERE status = 'sent') AS last_delivered,
        COUNT(*) FILTER (
          WHERE status = 'sent'
            AND (sent_at AT TIME ZONE $2::text)::date = (NOW() AT TIME ZONE $2::text)::date
        ) AS delivered_today,
        COUNT(*) FILTER (
          WHERE (sent_at AT TIME ZONE $2::text)::date = (NOW() AT TIME ZONE $2::text)::date
        ) AS attempts_today
      FROM alert_dispatches
      WHERE kind = 'customer_digest' AND customer_id = $1
    `, [c.id, tz]);
    const g = gate.rows[0] || {};
    const lastDelivered: Date | null = g.last_delivered ? new Date(g.last_delivered) : null;

    // Everything since the previous delivered digest — so a missed day is
    // caught up rather than lost — but never more than a week back.
    const floor = new Date(now.getTime() - MAX_DIGEST_LOOKBACK_DAYS * DAY_MS);
    const since = lastDelivered
      ? (lastDelivered > floor ? lastDelivered : floor)
      : new Date(now.getTime() - DAY_MS);

    const r = await client.query(`
      SELECT * FROM alert_episodes
       WHERE customer_id = $1 AND device_id = ANY($2)
         AND (cleared_at IS NULL OR cleared_at > $3)
    `, [c.id, c.deviceIds, since]);
    const considered = (r.rows as EpisodeRow[]).filter((e) => noDataDue(e, now));

    // One line per device and fault. A fault that cleared and came back shows
    // once, as its open episode; otherwise as its latest occurrence.
    const byKey = new Map<string, EpisodeRow>();
    for (const e of considered) {
      const k = `${e.device_id}|${e.alert_id}`;
      const cur = byKey.get(k);
      const better = !cur
        || (cur.cleared_at !== null && e.cleared_at === null)
        || (cur.cleared_at !== null && e.cleared_at !== null
            && new Date(e.cleared_at).getTime() > new Date(cur.cleared_at).getTime());
      if (better) byKey.set(k, e);
    }
    const episodes = sortEpisodes([...byKey.values()]);

    let reason = "";
    if (!opts.testTo) {
      if (hourIn(now, tz) < DIGEST_HOUR)                     reason = `before ${DIGEST_HOUR}:00 ${tz}`;
      else if (Number(g.delivered_today) > 0)                reason = "already delivered today";
      else if (Number(g.attempts_today) >= MAX_ATTEMPTS_PER_WINDOW)
        reason = `${g.attempts_today} failed attempts today — retrying tomorrow`;
    }
    if (!reason && episodes.length === 0) reason = "nothing to report";

    if (reason) {
      if (episodes.length > 0) {
        held.push({ customer: c.name, customer_id: c.id, timezone: tz, items: episodes.length, reason });
      }
      continue;
    }

    const recipients = c.recipients.map((u) => u.email);
    const entry: any = {
      customer: c.name, customer_id: c.id, dispatch: "digest", timezone: tz,
      covering_since: since.toISOString(),
      open:     episodes.filter((e) => e.cleared_at === null).length,
      resolved: episodes.filter((e) => e.cleared_at !== null).length,
      alerts:   episodes.map((e) => ({
        device: meta.get(e.device_id)?.name, severity: e.severity, message: e.message,
        state: e.cleared_at === null ? "open" : "resolved",
      })),
      production_would_send_to: recipients,
    };

    if (opts.dryRun) {
      sent.push({ ...entry, status: "dry run — not sent" });
      continue;
    }

    const email = await sendBatchAlertEmail({
      to:           opts.testTo ? [opts.testTo] : recipients,
      cc:           opts.testTo ? [] : undefined,
      contactName:  c.recipients[0]?.name || c.contactName,
      customerName: c.name,
      alerts:       episodes.map((e) => toDeviceAlert(e, meta, tz)),
      timestamp:    now.toISOString(),
      dispatchKind: "digest",
      timeZone:     tz,
    });
    const status = email.success ? "sent" : `error: ${email.error}`;

    if (live) {
      if (email.success) {
        // Every episode the email covered, including the duplicates folded away.
        await client.query(
          `UPDATE alert_episodes SET customer_reported_at = NOW() WHERE id = ANY($1)`,
          [considered.map((e) => e.id)]
        );
      }
      await logDispatch(client, {
        kind: "customer_digest", customerId: c.id, status, recipients: email.sentTo,
        cc: email.ccTo, episodeCount: episodes.length, subject: `Daily summary — ${c.name}`,
      });
      await logNotifications(client, episodes, meta, c.name, recipients, status, "digest");
    }

    sent.push({ ...entry, actual_sent_to: email.sentTo, actual_cc: email.ccTo, status });
  }
  return { sent, held };
}

// ─── Support digest ───────────────────────────────────────────────────────────

export async function dispatchSupportDigest(
  client: any,
  customers: CustomerContext[],
  meta: Map<string, DeviceMeta>,
  opts: DispatchOptions
): Promise<any> {
  if (opts.partial && !opts.testTo && !opts.dryRun) {
    return { status: "skipped — scan was limited to one customer" };
  }

  const deviceIds = customers.flatMap((c) => c.deviceIds);
  if (deviceIds.length === 0) return { status: "no devices" };
  const live = !opts.testTo && !opts.dryRun;

  // Start of the current 6-hour block in IST: 00:00, 06:00, 12:00 or 18:00.
  const gate = await client.query(`
    WITH b AS (
      SELECT (date_trunc('day', NOW() AT TIME ZONE $1::text)
              + make_interval(hours => (floor(extract(hour FROM NOW() AT TIME ZONE $1::text) / $2::int) * $2::int)::int)
             ) AT TIME ZONE $1::text AS block_start
    )
    SELECT b.block_start,
           COUNT(d.id) FILTER (WHERE d.status = 'sent') AS delivered,
           COUNT(d.id) AS attempts
      FROM b
      LEFT JOIN alert_dispatches d
        ON d.kind = 'support_digest' AND d.sent_at >= b.block_start
     GROUP BY b.block_start
  `, [SUPPORT_TZ, SUPPORT_BLOCK_HOURS]);
  const g = gate.rows[0] || {};

  if (!opts.testTo) {
    if (Number(g.delivered) > 0) {
      return { status: "held — already sent this 6-hour block", block_start: g.block_start };
    }
    if (Number(g.attempts) >= MAX_ATTEMPTS_PER_WINDOW) {
      return { status: `held — ${g.attempts} failed attempts this block`, block_start: g.block_start };
    }
  }

  // New = not yet announced, started recently, and not a recurrence of the same
  // fault on the same device within the lookback.
  const r = await client.query(`
    SELECT e.* FROM alert_episodes e
     WHERE e.support_notified_at IS NULL
       AND e.device_id = ANY($1)
       AND e.first_seen_at > NOW() - INTERVAL '2 days'
       AND NOT EXISTS (
         SELECT 1 FROM alert_episodes p
          WHERE p.device_id = e.device_id AND p.alert_id = e.alert_id
            AND p.id <> e.id AND p.first_seen_at < e.first_seen_at
            AND COALESCE(p.cleared_at, p.last_seen_at) > e.first_seen_at - INTERVAL '1 hour' * $2
       )
  `, [deviceIds, REPEAT_LOOKBACK_HOURS]);
  const episodes = sortEpisodes(r.rows);

  if (episodes.length === 0) return { status: "nothing new", block_start: g.block_start };

  const byCustomer = new Map(customers.map((c) => [c.id, c.name]));
  const subject = `🛠️ ${episodes.length} new fault${episodes.length > 1 ? "s" : ""} across ${
    new Set(episodes.map((e) => e.customer_id)).size} customer${
    new Set(episodes.map((e) => e.customer_id)).size > 1 ? "s" : ""}`;
  const summary = {
    to: opts.testTo ? [opts.testTo] : SUPPORT_EMAILS,
    faults: episodes.map((e) => ({
      customer: byCustomer.get(e.customer_id), device: meta.get(e.device_id)?.name,
      severity: e.severity, message: e.message, state: e.cleared_at === null ? "open" : "resolved",
    })),
  };

  if (opts.dryRun) return { status: "dry run — not sent", subject, ...summary };

  const email = await sendHtmlEmail({
    to:       opts.testTo ? [opts.testTo] : SUPPORT_EMAILS,
    cc:       [],
    subject,
    html:     buildSupportHtml(episodes, meta, byCustomer),
    fromName: "SGT Hydroedge Support Digest",
  });
  const status = email.success ? "sent" : `error: ${email.error}`;

  if (live) {
    if (email.success) {
      await client.query(
        `UPDATE alert_episodes SET support_notified_at = NOW() WHERE id = ANY($1)`,
        [episodes.map((e) => e.id)]
      );
    }
    await logDispatch(client, {
      kind: "support_digest", customerId: null, status, recipients: email.sentTo,
      cc: [], episodeCount: episodes.length, subject,
    });
  }

  return { status, subject, ...summary };
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildSupportHtml(
  episodes: EpisodeRow[],
  meta: Map<string, DeviceMeta>,
  customerNames: Map<string, string>
): string {
  const groups = new Map<string, EpisodeRow[]>();
  for (const e of episodes) {
    const k = e.customer_id;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(e);
  }

  const sections = [...groups.entries()].map(([cid, rows]) => {
    const trs = rows.map((e) => {
      const m = meta.get(e.device_id);
      const isCrit = e.severity === "critical";
      const state = e.cleared_at === null
        ? `<span style="color:#dc2626;font-weight:600;">Open</span>`
        : `<span style="color:#16a34a;">Resolved ${formatInZone(e.cleared_at, SUPPORT_TZ)}</span>`;
      return `
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:8px 6px;font-size:12px;color:#0f172a;">
            <div style="font-weight:600;">${esc(m?.name || e.device_id)}</div>
            <div style="font-family:monospace;color:#64748b;font-size:11px;">${esc(m?.imei || "")}</div>
          </td>
          <td style="padding:8px 6px;font-size:12px;">
            <span style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;color:#fff;background:${isCrit ? "#dc2626" : "#d97706"};text-transform:uppercase;">${e.severity}</span>
            <div style="margin-top:4px;color:#0f172a;">${esc(e.message)}</div>
          </td>
          <td style="padding:8px 6px;font-size:11px;color:#475569;white-space:nowrap;">
            ${formatInZone(e.first_seen_at, SUPPORT_TZ)}<br>${state}
          </td>
        </tr>`;
    }).join("");
    return `
      <div style="margin-bottom:20px;">
        <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:6px;">${esc(customerNames.get(cid) || cid)}</div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;">
          <tr style="background:#f8fafc;">
            <th style="text-align:left;padding:6px;font-size:10px;color:#64748b;text-transform:uppercase;">Device</th>
            <th style="text-align:left;padding:6px;font-size:10px;color:#64748b;text-transform:uppercase;">Fault</th>
            <th style="text-align:left;padding:6px;font-size:10px;color:#64748b;text-transform:uppercase;">Started / state</th>
          </tr>
          ${trs}
        </table>
      </div>`;
  }).join("");

  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:680px;margin:0 auto;">
  <div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0;">
    <h1 style="color:#fff;margin:0;font-size:18px;">New faults — support digest</h1>
    <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:12px;">
      ${episodes.length} fault${episodes.length > 1 ? "s" : ""} started since the last digest · ${formatInZone(new Date(), SUPPORT_TZ)}
    </p>
  </div>
  <div style="padding:20px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
    ${sections}
    <p style="font-size:11px;color:#9ca3af;margin:16px 0 0;line-height:1.6;">
      Internal email. Sent at most every ${SUPPORT_BLOCK_HOURS} hours, only when something new starts.
      Ongoing faults are not repeated here — customers see them in their daily summary.
      Full history: Alert Activity in the admin panel.
    </p>
  </div>
</div>`;
}
