// ============================================================================
// API ROUTE: /api/nano/cancapture?device_id=<uuid>
// ----------------------------------------------------------------------------
// Remote CAN captures for one NanoV3 device (newest first) and the device's
// live capture state (P-4225). Captures are started from the UI with ordinary
// set commands (P-4221..P-4224 via /api/nano/command); the device uploads
// t:canlog chunks that the ingest stores (migration 027). Download:
// /api/nano/cancapture/download.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get('device_id');
  if (!deviceId) return NextResponse.json({ success: false, error: 'device_id required' }, { status: 400 });
  try {
    const caps = await query(
      `SELECT cap::text AS cap, n, received, complete, kbps, t0::text AS t0, frames, dropped, bytes,
              first_at, last_at
         FROM nano_can_captures WHERE device_id = $1
        ORDER BY first_at DESC LIMIT 50`,
      [deviceId]
    );
    const st = await query(
      `SELECT can_capture_state, last_ts_utc, updated_at FROM nano_device_state WHERE device_id = $1`,
      [deviceId]
    );
    const s = st.rows[0] || {};
    return NextResponse.json({
      success: true,
      data: {
        state: s.can_capture_state ?? null,
        state_at: s.last_ts_utc ?? s.updated_at ?? null,
        captures: caps.rows,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
