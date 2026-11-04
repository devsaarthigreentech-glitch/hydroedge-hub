// ============================================================================
// API ROUTE: /api/nano/firmware/job   (admins only)
// ----------------------------------------------------------------------------
// GET  ?device_id=<uuid>                what the firmware card shows: version now,
//                                       uploaded versions, latest job, and why an
//                                       update would be refused right now
// POST { device_id, firmware_id }       start an update. The job then runs on the
//                                       server (lib/nano-fw-runner), page open or not.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { stat } from 'fs/promises';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/require-admin';
import { detectVariant } from '@/lib/nano-pids';
import { firmwareUrl } from '@/lib/nano-firmware';
import { jobLabel, refuseStart } from '@/lib/nano-fw-job';
import { advanceFwJobs } from '@/lib/nano-fw-runner';

async function deviceFacts(deviceId: string) {
  const r = await query(
    `SELECT d.id, s.online, s.ota_state, s.d AS raw_d, s.last_boot_id::text AS boot, f.received_at AS last_frame_at,
            v.value_text AS version, v.updated_at AS version_at
       FROM devices d
       LEFT JOIN nano_device_state s ON s.device_id = d.id
       LEFT JOIN nano_frames f ON f.id = s.last_frame_id
       LEFT JOIN nano_param_values v ON v.device_id = d.id AND v.pid = 'P-104'
      WHERE d.id = $1 AND d.deleted_at IS NULL`,
    [deviceId]
  );
  const row = r.rows[0];
  if (!row) return null;
  const refusal = refuseStart({
    online: row.online,
    lastSeenAt: row.last_frame_at ? new Date(row.last_frame_at).getTime() : null,
    otaState: row.ota_state,
    isV3: detectVariant(row.raw_d) === 'v3',
    now: Date.now(),
  });
  return { ...row, refusal };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if ('denied' in auth) return auth.denied;
  const deviceId = request.nextUrl.searchParams.get('device_id');
  if (!deviceId) return NextResponse.json({ success: false, error: 'device_id is required' }, { status: 400 });
  try {
    await advanceFwJobs(deviceId);
    const dev = await deviceFacts(deviceId);
    if (!dev) return NextResponse.json({ success: false, error: 'Device not found' }, { status: 404 });
    const [fw, job] = await Promise.all([
      query(`SELECT id::text AS id, version, size_bytes::float8 AS size_bytes, notes, uploaded_at FROM nano_firmware ORDER BY uploaded_at DESC`),
      query(
        `SELECT id::text AS id, status, step, target_version, from_version, ota_state, ota_pct, detail, created_by, created_at, started_at, finished_at
           FROM nano_fw_jobs WHERE device_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [deviceId]
      ),
    ]);
    const j = job.rows[0];
    return NextResponse.json({
      success: true,
      data: {
        version: dev.version,
        version_at: dev.version_at,
        ota_state: dev.ota_state,
        refusal: dev.refusal,
        firmwares: fw.rows,
        job: j ? { ...j, label: jobLabel(j), active: ['sending', 'running'].includes(j.status) } : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ('denied' in auth) return auth.denied;
  try {
    const { device_id, firmware_id } = (await request.json()) || {};
    if (!device_id || !/^\d+$/.test(String(firmware_id))) {
      return NextResponse.json({ success: false, error: 'device_id and firmware_id are required' }, { status: 400 });
    }
    const dev = await deviceFacts(device_id);
    if (!dev) return NextResponse.json({ success: false, error: 'Device not found' }, { status: 404 });
    if (dev.refusal) return NextResponse.json({ success: false, error: dev.refusal }, { status: 409 });

    const fw = await query(`SELECT * FROM nano_firmware WHERE id = $1`, [firmware_id]);
    if (fw.rowCount === 0) return NextResponse.json({ success: false, error: 'That version was deleted' }, { status: 404 });
    const f = fw.rows[0];
    const onDisk = await stat(f.file_path).catch(() => null);
    if (!onDisk || onDisk.size !== Number(f.size_bytes)) {
      return NextResponse.json({ success: false, error: 'The file for this version is missing from the server. Delete it and upload again.' }, { status: 500 });
    }

    try {
      const ins = await query(
        `INSERT INTO nano_fw_jobs (device_id, firmware_id, target_version, url, sha256, size_bytes, from_version, from_boot_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id::text AS id`,
        [device_id, firmware_id, f.version, firmwareUrl(f.token), f.sha256, f.size_bytes, dev.version, dev.boot, auth.name]
      );
      await advanceFwJobs(device_id).catch(() => {});      // first setting now; the runner carries on
      return NextResponse.json({ success: true, job_id: ins.rows[0].id });
    } catch (e: any) {
      if (e.code === '23505') {
        return NextResponse.json({ success: false, error: 'An update is already running on this device' }, { status: 409 });
      }
      throw e;
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
