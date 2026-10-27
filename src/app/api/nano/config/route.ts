// ============================================================================
// API ROUTE: /api/nano/config?device_id=<uuid>
// ----------------------------------------------------------------------------
// Full parameter registry (nano_registry, 280 params) joined to the device's
// current config truth (nano_param_values, fed by config-mirror writebacks).
// Grouped by the 28 authoritative registry categories. Marks which params are
// Cloud-settable (RW + settable_via includes 'Cloud') vs read-only.
// Each param carries `generations` (['NanoV3'], ['Gen2'] or both, migration
// 030) so the Config tab can show one firmware generation at a time, and
// `firmware` says which generation the device's last frame came from.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { detectVariant } from '@/lib/nano-pids';

type Generation = 'NanoV3' | 'Gen2';

// Migration 030 fills nano_registry.generations from both firmware tables. A
// row without one (added later, or 030 not applied yet) is NanoV3 when its
// source names NanoV3, else Gen 2.
function generationsOf(gens: unknown, source: unknown): Generation[] {
  if (Array.isArray(gens) && gens.length) return gens.filter((g): g is Generation => g === 'NanoV3' || g === 'Gen2');
  return typeof source === 'string' && /nanov3/i.test(source) ? ['NanoV3'] : ['Gen2'];
}

export async function GET(request: NextRequest) {
  try {
    const deviceId = request.nextUrl.searchParams.get('device_id');
    if (!deviceId) {
      return NextResponse.json({ success: false, error: 'device_id is required' }, { status: 400 });
    }

    const dev = await query(
      `SELECT d.id, d.imei, d.device_name, d.device_type, d.connection_status, d.protocol, s.d AS raw_d
         FROM devices d LEFT JOIN nano_device_state s ON s.device_id = d.id
        WHERE d.id = $1 AND d.deleted_at IS NULL`,
      [deviceId]
    );
    if (dev.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Device not found' }, { status: 404 });
    }

    const res = await query(
      `SELECT
         r.pid, r.pid_num, r.band, r.category, r.name, r.description,
         r.data_type, r.units, r.valid_range, r.enum_values, r.default_value,
         r.access, r.settable_via, r.sms_eligible, r.auth_req, r.notes,
         pv.value_text AS current_text, pv.value_num AS current_num,
         pv.res AS current_res, pv.ts_utc AS current_ts, pv.source AS current_source,
         -- via jsonb so the tab still loads before migration 030 is applied
         to_jsonb(r) -> 'generations' AS generations, to_jsonb(r) ->> 'source' AS reg_source
       FROM nano_registry r
       LEFT JOIN nano_param_values pv
         ON pv.pid = r.pid AND pv.device_id = $1
       ORDER BY r.band, r.pid_num`,
      [deviceId]
    );

    const cats: Record<string, any[]> = {};
    const order: string[] = [];
    let editable = 0;

    for (const r of res.rows as any[]) {
      const settable: string[] = r.settable_via || [];
      const cloudSettable = ['RW', 'WO'].includes(r.access) && settable.includes('Cloud');
      if (cloudSettable) editable++;

      if (!cats[r.category]) {
        cats[r.category] = [];
        order.push(r.category);
      }
      cats[r.category].push({
        pid: r.pid,
        name: r.name,
        description: r.description,
        data_type: r.data_type,
        units: r.units,
        valid_range: r.valid_range,
        enum_values: r.enum_values,
        default_value: r.default_value,
        access: r.access,
        settable_via: settable,
        sms_eligible: r.sms_eligible,
        auth_req: r.auth_req,
        notes: r.notes,
        cloud_settable: cloudSettable,
        generations: generationsOf(r.generations, r.reg_source),
        // Older ingest stored JSON booleans as Python's "True"/"False", which
        // matches neither dropdown option; show the device's own spelling.
        current_value: r.data_type === 'bool' && typeof r.current_text === 'string'
          ? r.current_text.toLowerCase() : r.current_text,
        current_res: r.current_res,
        current_ts: r.current_ts,
        current_source: r.current_source,
      });
    }

    const categories = order.map((name) => ({
      name,
      params: cats[name],
      editable: cats[name].filter((p) => p.cloud_settable).length,
    }));

    return NextResponse.json({
      success: true,
      data: {
        device: { ...dev.rows[0], raw_d: undefined },
        firmware: detectVariant(dev.rows[0].raw_d),
        categories,
        counts: { total: res.rowCount, editable, readonly: (res.rowCount || 0) - editable },
      },
    });
  } catch (error: any) {
    console.error('Error fetching nano config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch nano config', message: error.message },
      { status: 500 }
    );
  }
}