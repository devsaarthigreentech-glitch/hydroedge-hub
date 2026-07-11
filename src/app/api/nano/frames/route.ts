// ============================================================================
// API ROUTE: /api/nano/frames?device_id=<uuid>&limit=50
// ----------------------------------------------------------------------------
// Latest N raw frames for one Nano device, newest first. On-call only (the UI
// fetches on a button press — no polling). Cheap: ORDER BY id DESC + LIMIT hits
// the primary key, reads only N rows regardless of table size.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const deviceId = request.nextUrl.searchParams.get('device_id');
    let limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
    if (!deviceId) {
      return NextResponse.json({ success: false, error: 'device_id is required' }, { status: 400 });
    }
    if (!Number.isFinite(limit) || limit < 1) limit = 50;
    if (limit > 200) limit = 200; // hard cap

    const res = await query(
      `SELECT id, seq, up, ts, ts_utc, received_at, net, boot_id, source,
              d, faults, gps
         FROM nano_frames
        WHERE device_id = $1
        ORDER BY id DESC
        LIMIT $2`,
      [deviceId, limit]
    );

    return NextResponse.json({ success: true, count: res.rowCount, data: res.rows });
  } catch (error: any) {
    console.error('Error fetching nano frames:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch nano frames', message: error.message },
      { status: 500 }
    );
  }
}