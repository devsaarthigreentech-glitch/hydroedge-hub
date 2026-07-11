// ============================================================================
// API ROUTE: /api/nano/paramvalues?device_id=<uuid>&pids=P-602,P-803
// ----------------------------------------------------------------------------
// Current (writeback-confirmed) + default value for a few specific PIDs.
// Light: bounded by the pid list. `current` is non-null only if GV has seen a
// config writeback for that param (there is no read-back command), otherwise
// the UI should treat `default` as unconfirmed.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const deviceId = request.nextUrl.searchParams.get('device_id');
    const pidsParam = request.nextUrl.searchParams.get('pids') || '';
    const pids = pidsParam.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 40);
    if (!deviceId) return NextResponse.json({ success: false, error: 'device_id required' }, { status: 400 });
    if (pids.length === 0) return NextResponse.json({ success: true, data: {} });

    const res = await query(
      `SELECT r.pid, r.default_value, r.units, r.valid_range,
              pv.value_text AS current, pv.res AS current_res, pv.ts_utc AS current_ts
         FROM nano_registry r
         LEFT JOIN nano_param_values pv ON pv.pid = r.pid AND pv.device_id = $1
        WHERE r.pid = ANY($2)`,
      [deviceId, pids]
    );

    const out: Record<string, any> = {};
    for (const r of res.rows as any[]) {
      out[r.pid] = {
        current: r.current,          // writeback-confirmed value, or null
        default: r.default_value,    // registry default (unconfirmed)
        unit: r.units,
        range: r.valid_range,
        confirmed_at: r.current_ts,
      };
    }
    return NextResponse.json({ success: true, data: out });
  } catch (error: any) {
    console.error('Error fetching nano param values:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}