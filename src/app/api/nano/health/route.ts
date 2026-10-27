// ============================================================================
// API ROUTE: /api/nano/health?device_id=<uuid>&days=7
// ----------------------------------------------------------------------------
// Health report for one Nano device over the last `days` (1..30): the frame
// history, commands, device alerts and service log run through
// lib/nano-health (findings + verdict). Also returns the service log and the
// config changes in the window, for the HEALTH tab's timeline. On-call only.
//
// Frames carry only the PIDs the rules read (HEALTH_PIDS), not the whole d.
// A frame without a device clock (ts = 0) is placed at its boot's start plus
// its uptime; the boot's start is estimated from the frame that arrived
// soonest after it was sent.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { analyseNanoHealth, HealthFrame } from '@/lib/nano-health';

const HEALTH_PIDS = [
  'P-4075', 'P-802', 'P-4096', 'P-4097', 'P-4098', 'P-4110', 'P-4111', 'P-4112', 'P-4113', 'P-4114',
  'P-4118', 'P-4119', 'P-4120', 'P-4122', 'P-4125', 'P-4126', 'P-4138', 'P-4139',
];
const MAX_FRAMES = 150000;

const ms = (v: any) => (v ? new Date(v).getTime() : NaN);

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const deviceId = sp.get('device_id');
  let days = parseInt(sp.get('days') || '7');
  if (!deviceId) return NextResponse.json({ success: false, error: 'device_id is required' }, { status: 400 });
  if (!Number.isFinite(days) || days < 1) days = 7;
  if (days > 30) days = 30;
  const since = `${days} days`;

  try {
    const fr = await query(
      `SELECT COALESCE(boot_id::text, '?') AS boot, up, seq, ts_utc, received_at,
              (SELECT jsonb_object_agg(k, d -> k) FROM unnest($3::text[]) k WHERE d ? k) AS d
         FROM nano_frames
        WHERE device_id = $1 AND received_at >= now() - $2::interval
        ORDER BY id DESC
        LIMIT ${MAX_FRAMES}`,
      [deviceId, since, HEALTH_PIDS]
    );

    // Boot start estimates for frames without a device clock.
    const bootStart = new Map<string, number>();
    for (const r of fr.rows as any[]) {
      const s = ms(r.received_at) - (Number(r.up) || 0) * 1000;
      if (!bootStart.has(r.boot) || s < bootStart.get(r.boot)!) bootStart.set(r.boot, s);
    }
    const frames: HealthFrame[] = (fr.rows as any[]).map((r) => {
      const up = Number(r.up) || 0;
      const t = Number.isFinite(ms(r.ts_utc)) ? ms(r.ts_utc) : bootStart.get(r.boot)! + up * 1000;
      return { boot: r.boot, up, seq: Number(r.seq) || 0, t, d: r.d || {} };
    });

    let serviceLogReady = true;
    const [cmds, alerts, service, p609] = await Promise.all([
      query(
        `SELECT verb, pid, value_text, status, result_reason, sent_at
           FROM nano_commands WHERE device_id = $1 AND sent_at >= now() - $2::interval
          ORDER BY sent_at DESC LIMIT 1000`,
        [deviceId, since]
      ),
      query(
        `SELECT a.alert_id, a.ev, COALESCE(a.ts_utc, a.received_at) AS t,
                c.severity, c.category, c.condition
           FROM nano_alerts a LEFT JOIN nano_alert_catalog c ON c.alert_id = a.alert_id
          WHERE a.device_id = $1 AND COALESCE(a.ts_utc, a.received_at) >= now() - $2::interval
          ORDER BY a.id DESC LIMIT 2000`,
        [deviceId, since]
      ),
      query(
        `SELECT id::text AS id, created_at, author, kind, finding, notes
           FROM nano_service_log WHERE device_id = $1 ORDER BY created_at DESC LIMIT 200`,
        [deviceId]
      ).catch(() => { serviceLogReady = false; return { rows: [] as any[] }; }),   // before migration 032
      query(`SELECT value_text FROM nano_param_values WHERE device_id = $1 AND pid = 'P-609'`, [deviceId]),
    ]);

    const commands = (cmds.rows as any[]).map((c) => ({ ...c, t: ms(c.sent_at) }));
    const serviceRows = (service.rows as any[]).map((s) => ({ ...s, t: ms(s.created_at) }));
    const p609Text = p609.rows[0]?.value_text;
    const report = analyseNanoHealth({
      frames,
      commands,
      alerts: (alerts.rows as any[]).map((a) => ({ ...a, t: ms(a.t) })),
      service: serviceRows,
      onChange: p609Text == null ? undefined : String(p609Text).toLowerCase() === 'true',
    });

    return NextResponse.json({
      success: true,
      data: {
        days,
        truncated: fr.rowCount === MAX_FRAMES,
        report,
        service: serviceRows,
        serviceLogReady,
        configChanges: commands.filter((c) => c.verb === 'set' && c.status === 'ok')
          .map((c) => ({ t: c.t, pid: c.pid, value: c.value_text })),
      },
    });
  } catch (error: any) {
    console.error('Error building nano health report:', error);
    return NextResponse.json({ success: false, error: 'Failed to build health report', message: error.message }, { status: 500 });
  }
}
