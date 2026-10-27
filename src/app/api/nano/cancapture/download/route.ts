// ============================================================================
// API ROUTE: /api/nano/cancapture/download?device_id=<uuid>&cap=<id>&format=log|bin
// ----------------------------------------------------------------------------
// format=log (default): candump -l text for SavvyCAN / cantools.
// format=bin: the raw record stream as the device sent it (see lib/can-capture).
// An incomplete capture yields only the unbroken run of chunks from seq 0 (a
// gap misaligns every record after it); the file name then says "partial".
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { joinChunks, toCandump } from '@/lib/can-capture';

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const deviceId = sp.get('device_id');
  const cap = sp.get('cap');
  const format = sp.get('format') === 'bin' ? 'bin' : 'log';
  if (!deviceId || !cap || !/^\d+$/.test(cap)) {
    return NextResponse.json({ success: false, error: 'device_id and a numeric cap are required' }, { status: 400 });
  }
  try {
    const meta = await query(
      `SELECT c.n, c.t0::text AS t0, d.imei
         FROM nano_can_captures c JOIN devices d ON d.id = c.device_id
        WHERE c.device_id = $1 AND c.cap = $2`,
      [deviceId, cap]
    );
    if (meta.rowCount === 0) return NextResponse.json({ success: false, error: 'Capture not found' }, { status: 404 });
    const { n, imei } = meta.rows[0];
    const t0 = Number(meta.rows[0].t0) || 0;

    const rows = await query(
      `SELECT seq, data FROM nano_can_capture_chunks WHERE device_id = $1 AND cap = $2 ORDER BY seq`,
      [deviceId, cap]
    );
    const { buf, contiguous } = joinChunks(rows.rows.map((r: any) => ({ seq: r.seq, data: r.data as Buffer })));
    const partial = contiguous < n;
    const base = `can_${imei || deviceId}_${cap}${partial ? `_partial_${contiguous}of${n}` : ''}`;

    if (format === 'bin') {
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${base}.bin"`,
        },
      });
    }
    const { text } = toCandump(buf, t0);
    return new NextResponse(text, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${base}.log"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
