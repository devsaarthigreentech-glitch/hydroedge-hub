// ============================================================================
// API ROUTE: /api/nano/command   (POST)
// ----------------------------------------------------------------------------
// Body: { device_id, verb: 'set'|'stop'|'start', pid?, value?, confirm? }
// Validates against nano_registry (Cloud-settable only), guards P-802 (moves
// electrolyser current — needs confirm:true), logs to nano_commands (pending),
// publishes the /cmd frame. The config-mirror writeback (caught by
// nano_ingest.py) flips the row to ok/nack.
//
// GET /api/nano/command?device_id=<uuid>&limit=30 — recent command log.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { publishNanoCommand } from '@/lib/nano-mqtt';

const DANGEROUS = new Set(['P-802']); // moves real current at the cell

function coerce(raw: any, dataType: string | null): any {
  if (dataType === 'bool') return String(raw).toLowerCase() === 'true' || raw === true;
  if (['float', 'int16', 'uint16', 'uint32', 'uint8', 'int', 'uint'].includes(dataType || '')) {
    const f = Number(raw);
    return Number.isFinite(f) ? f : raw;
  }
  return raw; // string / enum / date / time
}

export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get('device_id');
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '30');
  if (!deviceId) return NextResponse.json({ success: false, error: 'device_id required' }, { status: 400 });
  try {
    const res = await query(
      `SELECT id, verb, pid, value_text, status, result_reason, sent_at, resolved_at
         FROM nano_commands WHERE device_id = $1 ORDER BY sent_at DESC LIMIT $2`,
      [deviceId, limit]
    );
    return NextResponse.json({ success: true, data: res.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { device_id, verb, pid, value, confirm } = body || {};

    if (!device_id || !['set', 'stop', 'start'].includes(verb)) {
      return NextResponse.json({ success: false, error: 'device_id and a valid verb are required' }, { status: 400 });
    }

    const dev = await query(`SELECT imei FROM devices WHERE id = $1 AND deleted_at IS NULL`, [device_id]);
    if (dev.rowCount === 0) return NextResponse.json({ success: false, error: 'Device not found' }, { status: 404 });
    const imei = dev.rows[0].imei;

    let payload: any;
    let rpid: string;
    let rval: any = null;

    if (verb === 'stop') {
      payload = { cmd: 'stop' }; rpid = 'P-1101'; rval = 'Stop';
    } else if (verb === 'start') {
      payload = { cmd: 'start' }; rpid = 'P-1101'; rval = 'Run';
    } else {
      if (!pid || value === undefined || value === null) {
        return NextResponse.json({ success: false, error: "'set' needs pid and value" }, { status: 400 });
      }
      // registry validation
      const reg = await query(
        `SELECT access, settable_via, data_type, enum_values, valid_range FROM nano_registry WHERE pid = $1`,
        [pid]
      );
      if (reg.rowCount === 0) {
        return NextResponse.json({ success: false, error: `Unknown P-ID ${pid}` }, { status: 400 });
      }
      const m = reg.rows[0];
      const settable: string[] = m.settable_via || [];
      if (m.access !== 'RW' || !settable.includes('Cloud')) {
        return NextResponse.json(
          { success: false, error: `${pid} is not Cloud-settable (access ${m.access}, via ${settable.join('|') || '-'})` },
          { status: 400 }
        );
      }
      rval = coerce(value, m.data_type);
      if (Array.isArray(m.enum_values) && m.enum_values.length && !m.enum_values.includes(String(rval))) {
        return NextResponse.json({ success: false, error: `${pid} expects one of ${m.enum_values.join(', ')}` }, { status: 400 });
      }
      rpid = pid;
      payload = { cmd: 'set', id: pid, val: rval };
    }

    if (DANGEROUS.has(rpid) && !confirm) {
      return NextResponse.json(
        { success: false, error: `${rpid} changes live electrolyser current — resend with confirm:true`, needsConfirm: true },
        { status: 409 }
      );
    }

    // log as pending
    const ins = await query(
      `INSERT INTO nano_commands (device_id, verb, pid, value_text, payload, issued_by, status)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,'pending') RETURNING id`,
      [device_id, verb, rpid, rval === null ? null : String(rval), JSON.stringify(payload), 'web']
    );
    const cmdId = ins.rows[0].id;

    // publish
    try {
      await publishNanoCommand(imei, payload);
      await query(`UPDATE nano_commands SET status = 'sent' WHERE id = $1`, [cmdId]);
    } catch (pubErr: any) {
      await query(`UPDATE nano_commands SET status = 'failed', result_reason = $2 WHERE id = $1`, [cmdId, pubErr.message]);
      return NextResponse.json({ success: false, error: 'Publish failed: ' + pubErr.message, command_id: cmdId }, { status: 502 });
    }

    return NextResponse.json({ success: true, command_id: cmdId, published: payload });
  } catch (error: any) {
    console.error('Error sending nano command:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}