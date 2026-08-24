// ============================================================================
// API ROUTE: /api/nano/alerts?device_id=<uuid>&limit=100&active=1
// ----------------------------------------------------------------------------
// Discrete /alert events for one Nano device, newest first, resolved through
// nano_alert_catalog for severity / category / human message. On-call.
//   active=1 -> skip the event history, return only the currently-raised set
// Also returns a compact summary (counts by severity) for a header strip.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// nano_device_state.active_faults holds the codes the device currently has
// raised. Tolerate either a Postgres text[] (already an array from pg) or a
// jsonb array (which can arrive as an array or as a JSON string).
function parseFaultCodes(raw: any): string[] {
  if (!raw) return [];
  let v = raw;
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(v)) return [];
  return v.map((c) => String(c)).filter(Boolean);
}

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

    // ── Currently-active ────────────────────────────────────────────────────
    // Source of truth is nano_device_state.active_faults — the fault bitmap the
    // device itself reports on every frame (same list the LIVE tab renders).
    //
    // This used to be derived from the event log by taking the latest event per
    // (alert_id, src) and dropping anything whose phase was 'cleared'. The frames
    // actually carry ev = 'set' | 'clear' | 'ack', so no row ever matched
    // 'cleared': every alert the device had ever raised stayed pinned as active
    // (9 shown against 2 real ones), and a trailing 'ack' after a 'clear' would
    // have resurrected it anyway.
    const stateRes = await query(
      `SELECT active_faults FROM nano_device_state WHERE device_id = $1`,
      [deviceId]
    );
    const hasState = (stateRes.rowCount ?? 0) > 0;
    const activeCodes = parseFaultCodes(hasState ? stateRes.rows[0].active_faults : null);

    let activeRows: any[] = [];
    if (hasState) {
      if (activeCodes.length > 0) {
        // Resolve each raised code through the catalog and stamp it with the
        // timestamp of the event that raised it (if the device sent a discrete one).
        const aRes = await query(
          `SELECT f.alert_id,
                  r.src, r.ev,
                  COALESCE(r.ts_utc, r.received_at) AS ts_utc,
                  c.severity, c.severity_rank, c.category, c.condition
             FROM unnest($2::text[]) AS f(alert_id)
             LEFT JOIN nano_alert_catalog c ON c.alert_id = f.alert_id
             LEFT JOIN LATERAL (
               SELECT a.src, a.ev, a.ts_utc, a.received_at
                 FROM nano_alerts a
                WHERE a.device_id = $1
                  AND a.alert_id = f.alert_id
                  AND a.ev IN ('set', 'raised')
                ORDER BY a.id DESC
                LIMIT 1
             ) r ON TRUE
            ORDER BY c.severity_rank DESC NULLS LAST, ts_utc DESC NULLS LAST`,
          [deviceId, activeCodes]
        );
        activeRows = aRes.rows;
      }
    } else {
      // No state row yet (device has sent alerts but no status frame): fall back
      // to the event log — active = latest 'set' is newer than the latest 'clear'.
      const aRes = await query(
        `WITH phases AS (
           SELECT alert_id,
                  MAX(id) FILTER (WHERE ev IN ('set', 'raised'))    AS set_id,
                  MAX(id) FILTER (WHERE ev IN ('clear', 'cleared')) AS clear_id
             FROM nano_alerts
            WHERE device_id = $1
            GROUP BY alert_id
         ),
         raised AS (
           SELECT p.alert_id, p.set_id
             FROM phases p
            WHERE p.set_id IS NOT NULL
              AND (p.clear_id IS NULL OR p.set_id > p.clear_id)
         )
         SELECT r.alert_id, a.src, a.ev,
                COALESCE(a.ts_utc, a.received_at) AS ts_utc,
                c.severity, c.severity_rank, c.category, c.condition
           FROM raised r
           JOIN nano_alerts a ON a.id = r.set_id
           LEFT JOIN nano_alert_catalog c ON c.alert_id = r.alert_id
          ORDER BY c.severity_rank DESC NULLS LAST, ts_utc DESC NULLS LAST`,
        [deviceId]
      );
      activeRows = aRes.rows;
    }

    const summary: Record<string, number> = { Critical: 0, Fault: 0, Warning: 0, Info: 0 };
    for (const r of activeRows as any[]) {
      const s = r.severity || 'Info';
      if (summary[s] !== undefined) summary[s]++;
    }

    return NextResponse.json({
      success: true,
      data: {
        events: activeOnly ? [] : res.rows,
        active: activeRows,
        summary,
        activeCount: activeRows.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching nano alerts:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch nano alerts', message: error.message }, { status: 500 });
  }
}