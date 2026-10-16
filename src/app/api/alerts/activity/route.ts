import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { safeTimeZone, hourIn, DIGEST_HOUR } from "@/lib/alert-dispatch";

// ============================================================================
// GET /api/alerts/activity — what the alert system has seen and sent
// ----------------------------------------------------------------------------
// Backs the Alert Activity screen. Per company: faults open now, faults that
// cleared in the last 48 hours, and the state of today's daily summary. Plus
// the latest email attempts of every kind.
//
// Read-only. Scoping follows /api/notifications: a customer session sees its
// own company only, and no support digests.
// ============================================================================

async function scopedCustomerId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (user?.role !== "super_admin" && user?.customerId) return user.customerId;
  } catch {
    /* no session — treat as unscoped, same as /api/notifications */
  }
  return null;
}

export async function GET() {
  try {
    const scope = await scopedCustomerId();
    const p = scope ? [scope] : [];

    const customers = await query(`
      SELECT c.id, c.name, c.timezone
        FROM customers c
       WHERE c.deleted_at IS NULL
         AND COALESCE(c.notifications_enabled, TRUE) = TRUE
         AND EXISTS (
           SELECT 1 FROM devices d
            WHERE d.customer_id = c.id AND d.deleted_at IS NULL
              AND d.device_type = 'FMC650' AND d.asset_name IN ('DG', 'EOW')
         )
         ${scope ? "AND c.id = $1" : ""}
       ORDER BY c.name
    `, p);

    const episodes = await query(`
      SELECT e.id, e.customer_id, e.device_id, e.alert_id, e.severity, e.message,
             e.first_seen_at, e.last_seen_at, e.cleared_at,
             e.customer_reported_at, e.support_notified_at, e.immediate_sent_at,
             COALESCE(d.device_name, d.imei) AS device_name, d.imei
        FROM alert_episodes e
        LEFT JOIN devices d ON d.id = e.device_id
       WHERE (e.cleared_at IS NULL OR e.cleared_at > NOW() - INTERVAL '48 hours')
         ${scope ? "AND e.customer_id = $1" : ""}
       ORDER BY (e.cleared_at IS NULL) DESC, e.severity, e.first_seen_at DESC
    `, p);

    const dispatches = await query(`
      SELECT a.id, a.kind, a.customer_id, c.name AS customer_name, a.sent_at,
             a.status, a.recipients, a.cc, a.episode_count, a.subject
        FROM alert_dispatches a
        LEFT JOIN customers c ON c.id = a.customer_id
       WHERE ${scope ? "a.customer_id = $1" : "TRUE"}
       ORDER BY a.sent_at DESC
       LIMIT 60
    `, p);

    const now = new Date();
    const data = customers.rows.map((c: any) => {
      const tz = safeTimeZone(c.timezone);
      const localDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
      const today = localDate(now);
      const todays = dispatches.rows.filter(
        (d: any) => d.kind === "customer_digest" && d.customer_id === c.id
          && localDate(new Date(d.sent_at)) === today
      );
      const delivered = todays.find((d: any) => d.status === "sent");
      const lastDigest = dispatches.rows.find(
        (d: any) => d.kind === "customer_digest" && d.customer_id === c.id
      );

      const mine = episodes.rows.filter((e: any) => e.customer_id === c.id);
      let digestToday: string;
      if (delivered)                         digestToday = "sent";
      else if (todays.length >= 3)           digestToday = `failed ${todays.length}× — retries tomorrow`;
      else if (todays.length > 0)            digestToday = `failed ${todays.length}× — will retry`;
      else if (hourIn(now, tz) < DIGEST_HOUR) digestToday = `due at ${DIGEST_HOUR}:00 local`;
      else if (mine.length === 0)            digestToday = "nothing to report";
      else                                   digestToday = "due on the next scan";

      return {
        id: c.id,
        name: c.name,
        timezone: tz,
        timezone_set: !!c.timezone,
        local_time: new Intl.DateTimeFormat("en-GB", {
          timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
        }).format(now),
        digest_today: digestToday,
        last_digest: lastDigest
          ? { sent_at: lastDigest.sent_at, status: lastDigest.status }
          : null,
        open:     mine.filter((e: any) => e.cleared_at === null),
        resolved: mine.filter((e: any) => e.cleared_at !== null),
      };
    });

    return NextResponse.json({
      success: true,
      scoped: !!scope,
      customers: data,
      dispatches: dispatches.rows,
    });
  } catch (error: any) {
    if (error?.code === "42P01") {
      return NextResponse.json({
        success: false,
        error: "Alert history tables are missing. Apply db/migrations/019_alert_episodes.sql on the server.",
      }, { status: 500 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
