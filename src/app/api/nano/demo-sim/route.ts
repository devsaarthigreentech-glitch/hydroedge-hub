// ============================================================================
// /api/nano/demo-sim — the switch for the DEMO Nano Replay simulator
// ----------------------------------------------------------------------------
// GET  ?device_id=uuid                 current switch, worker liveness, scenarios
// POST { device_id, enabled?, scenario? }  turn the simulation on/off, pick a scenario
//
// Admins only, and demo devices only: a Nano whose IMEI starts with 99900, which
// no real unit has (the same guard nano_demo_replay.py applies). The app never
// runs the simulator itself; it writes nano_demo_sim and the worker on the
// server (nano_demo_replay.py --control) follows it. See migration 036.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/require-admin';

const DEMO_IMEI_PREFIX = '99900';
/** The worker stamps worker_seen_at every poll (~3 s); older than this = not running. */
const WORKER_FRESH_S = 20;

const FIXED = [
  { id: 'normal', label: 'Normal running', detail: 'Producing, cell current within ±10% of the set point' },
  { id: 'alerts', label: 'Alert cycle', detail: 'Raises and clears catalog alerts in turn' },
  { id: 'engine_off', label: 'Engine off', detail: 'Engine stopped, plant not producing' },
  { id: 'offline', label: 'Signal lost', detail: 'No frames: the device goes offline' },
] as const;

const SCENARIO_RE = /^alert:[A-Za-z0-9_-]{1,16}$/;

async function demoDevice(deviceId: string) {
  const r = await query(
    `SELECT id::text AS id, imei::text AS imei, protocol FROM devices WHERE id = $1`,
    [deviceId]
  );
  const d = r.rows[0];
  if (!d) return { error: 'Device not found', status: 404 };
  if (d.protocol !== 'nano' || !String(d.imei).startsWith(DEMO_IMEI_PREFIX)) {
    return { error: 'Simulation is only for demo units (IMEI 99900...)', status: 403 };
  }
  return { device: d };
}

async function catalogAlerts() {
  try {
    const r = await query(
      `SELECT alert_id, severity, category, condition, stops_engine
         FROM nano_alert_catalog
        ORDER BY severity_rank DESC NULLS LAST, alert_id`
    );
    return r.rows.map((a: any) => ({
      id: `alert:${a.alert_id}`,
      label: `${a.alert_id} · ${a.severity}`,
      detail: `${a.condition || a.category || ''}${a.stops_engine ? ' (stops the plant)' : ''}`,
    }));
  } catch {
    return [];
  }
}

async function state(deviceId: string) {
  const r = await query(
    `SELECT enabled, scenario, updated_at, updated_by, worker_seen_at, worker_note,
            EXTRACT(EPOCH FROM (NOW() - worker_seen_at))::float8 AS worker_age_s
       FROM nano_demo_sim WHERE device_id = $1`,
    [deviceId]
  );
  const row = r.rows[0];
  return {
    enabled: row?.enabled ?? false,
    scenario: row?.scenario ?? 'normal',
    updated_at: row?.updated_at ?? null,
    updated_by: row?.updated_by ?? null,
    worker_seen_at: row?.worker_seen_at ?? null,
    worker_note: row?.worker_note ?? null,
    worker_running: row?.worker_age_s != null && row.worker_age_s < WORKER_FRESH_S,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if ('denied' in auth) return auth.denied;
  const deviceId = request.nextUrl.searchParams.get('device_id');
  if (!deviceId) return NextResponse.json({ success: false, error: 'device_id is required' }, { status: 400 });
  try {
    const dev = await demoDevice(deviceId);
    if ('error' in dev) return NextResponse.json({ success: false, error: dev.error }, { status: dev.status });
    return NextResponse.json({
      success: true,
      data: await state(deviceId),
      scenarios: [...FIXED, ...(await catalogAlerts())],
    });
  } catch (e: any) {
    console.error('[demo-sim] GET', e?.message || e);
    return NextResponse.json({ success: false, error: 'Failed to load simulation state' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ('denied' in auth) return auth.denied;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const { device_id: deviceId, enabled, scenario } = body || {};
  if (!deviceId) return NextResponse.json({ success: false, error: 'device_id is required' }, { status: 400 });
  if (enabled !== undefined && typeof enabled !== 'boolean') {
    return NextResponse.json({ success: false, error: 'enabled must be true or false' }, { status: 400 });
  }
  if (scenario !== undefined &&
      !(FIXED.some((s) => s.id === scenario) || (typeof scenario === 'string' && SCENARIO_RE.test(scenario)))) {
    return NextResponse.json({ success: false, error: 'Unknown scenario' }, { status: 400 });
  }
  try {
    const dev = await demoDevice(deviceId);
    if ('error' in dev) return NextResponse.json({ success: false, error: dev.error }, { status: dev.status });
    if (typeof scenario === 'string' && scenario.startsWith('alert:')) {
      const known = await query(`SELECT 1 FROM nano_alert_catalog WHERE alert_id = $1`, [scenario.slice(6)]);
      if (!known.rows.length) return NextResponse.json({ success: false, error: 'Alert not in the catalog' }, { status: 400 });
    }
    await query(
      `INSERT INTO nano_demo_sim (device_id, enabled, scenario, updated_at, updated_by)
       VALUES ($1, COALESCE($2, FALSE), COALESCE($3, 'normal'), NOW(), $4)
       ON CONFLICT (device_id) DO UPDATE
          SET enabled    = COALESCE($2, nano_demo_sim.enabled),
              scenario   = COALESCE($3, nano_demo_sim.scenario),
              updated_at = NOW(),
              updated_by = $4`,
      [deviceId, enabled ?? null, scenario ?? null, auth.name]
    );
    return NextResponse.json({ success: true, data: await state(deviceId) });
  } catch (e: any) {
    console.error('[demo-sim] POST', e?.message || e);
    return NextResponse.json({ success: false, error: 'Failed to save simulation state' }, { status: 500 });
  }
}
