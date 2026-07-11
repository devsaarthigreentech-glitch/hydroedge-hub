// ============================================================================
// API ROUTE: /api/nano/alerts?device_id=<uuid>&limit=100&active=1
// ----------------------------------------------------------------------------
// Discrete /alert events for one Nano device, newest first, resolved through
// nano_alert_catalog for severity / category / human message. On-call.
//   active=1 -> only currently-raised alerts (latest ev per alert_id+src != cleared)
// Also returns a compact summary (counts by severity) for a header strip.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const deviceId = request.nextUrl.searchParams.get('device_id');
    let limit = parseInt(request.nextUrl.searchParams.get('limit') || '100');
    const activeOnly = request.nextUrl.searchParams.get('active') === '1';
    if (!deviceId) return NextResponse.json({ success: false, error: 'device_id is required' }, { status: 400 });
    if (!Number.isFinite(limit) || limit < 1) limit = 100;
    if (limit > 500) limit = 500;

    // Event history resolved through the catalog
    const res = await query(
      `SELECT a.id, a.alert_id, a.src, a.ev, a.ts, a.ts_utc, a.received_at, a.stops,
              a.sev AS frame_sev, a.cat AS frame_cat, a.message_key AS frame_key,
              c.severity, c.severity_rank, c.category, c.condition, c.message_key,
              c.stops_engine, c.to_server, c.sms_eligible
         FROM nano_alerts a
         LEFT JOIN nano_alert_catalog c ON c.alert_id = a.alert_id
        WHERE a.device_id = $1
        ORDER BY a.id DESC
        LIMIT $2`,
      [deviceId, limit]
    );

    // Currently-active: latest event per (alert_id, src) whose phase isn't a clear
    const activeRes = await query(
      `WITH latest AS (
         SELECT DISTINCT ON (alert_id, COALESCE(src,''))
                alert_id, src, ev, ts_utc
           FROM nano_alerts
          WHERE device_id = $1
          ORDER BY alert_id, COALESCE(src,''), id DESC
       )
       SELECT l.alert_id, l.src, l.ev, l.ts_utc,
              c.severity, c.severity_rank, c.category, c.condition
         FROM latest l
         LEFT JOIN nano_alert_catalog c ON c.alert_id = l.alert_id
        WHERE l.ev IS DISTINCT FROM 'cleared'
        ORDER BY c.severity_rank DESC NULLS LAST, l.ts_utc DESC`,
      [deviceId]
    );

    const summary: Record<string, number> = { Critical: 0, Fault: 0, Warning: 0, Info: 0 };
    for (const r of activeRes.rows as any[]) {
      const s = r.severity || 'Info';
      if (summary[s] !== undefined) summary[s]++;
    }

    return NextResponse.json({
      success: true,
      data: {
        events: activeOnly ? [] : res.rows,
        active: activeRes.rows,
        summary,
        activeCount: activeRes.rowCount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching nano alerts:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch nano alerts', message: error.message }, { status: 500 });
  }
}