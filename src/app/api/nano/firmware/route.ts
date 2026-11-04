// ============================================================================
// API ROUTE: /api/nano/firmware   (admins only)
// ----------------------------------------------------------------------------
// GET                  uploaded versions, newest first
// POST multipart       file (.bin), notes?, version? (only for bins whose header
//                      has no N.N.N version). Checked by lib/nano-firmware; size
//                      and SHA-256 are computed here, never typed.
// DELETE ?id=<id>      remove a version and its file (refused while a job uses it)
//
// The file goes on the droplet's disk (FIRMWARE_DIR, outside the build output so
// a redeploy keeps it) as <token>.bin, and devices fetch it from /fw/<token>.bin.
// Uploading the same bytes again is a no-op; the same version with different
// bytes is refused until the old one is deleted, so a version always means one
// image. A reverse proxy needs client_max_body_size above 2.6 MB (FIRMWARE.md).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { mkdir, rename, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/require-admin';
import { checkFirmwareImage, firmwareDir, firmwareUrl, FW_APP_SLOT_BYTES, FW_URL_MAX } from '@/lib/nano-firmware';

const shape = (r: any) => {
  const { token, file_path, ...rest } = r;
  return { ...rest, url: firmwareUrl(token) };
};

export async function GET() {
  const auth = await requireAdmin();
  if ('denied' in auth) return auth.denied;
  try {
    const res = await query(
      `SELECT id::text AS id, version, sha256, size_bytes::float8 AS size_bytes, token, file_path, source_name, notes,
              uploaded_by, uploaded_at, fetch_count, last_fetch_at, last_fetch_ip
         FROM nano_firmware ORDER BY uploaded_at DESC`
    );
    return NextResponse.json({ success: true, data: res.rows.map(shape) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ('denied' in auth) return auth.denied;
  try {
    // Multipart adds a little over the file itself.
    if (Number(request.headers.get('content-length') || 0) > FW_APP_SLOT_BYTES + 64 * 1024) {
      return NextResponse.json({ success: false, error: 'File is larger than the app slot' }, { status: 413 });
    }
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Choose a .bin file' }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const check = checkFirmwareImage(buf, String(form.get('version') || ''));
    if (!check.ok) {
      return NextResponse.json({ success: false, error: check.error, needsVersion: !!check.needsVersion }, { status: 400 });
    }

    const existing = await query(`SELECT id::text AS id, sha256 FROM nano_firmware WHERE version = $1`, [check.version]);
    if (existing.rowCount) {
      if (existing.rows[0].sha256 === check.sha256) {
        return NextResponse.json({ success: true, duplicate: true, version: check.version });
      }
      return NextResponse.json(
        { success: false, error: `Version ${check.version} is already uploaded with different bytes. Delete it first, or build with a new version.` },
        { status: 409 }
      );
    }

    const token = randomBytes(16).toString('base64url');
    const url = firmwareUrl(token);
    if (url.length > FW_URL_MAX) {
      return NextResponse.json({ success: false, error: `Download URL is ${url.length} characters; the device holds ${FW_URL_MAX}. Shorten FIRMWARE_PUBLIC_BASE.` }, { status: 500 });
    }

    const dir = firmwareDir();
    await mkdir(dir, { recursive: true });
    const filePath = path.join(dir, `${token}.bin`);
    await writeFile(`${filePath}.tmp`, buf);
    await rename(`${filePath}.tmp`, filePath);
    try {
      await query(
        `INSERT INTO nano_firmware (version, sha256, size_bytes, file_path, token, source_name, notes, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [check.version, check.sha256, check.size, filePath, token, file.name.slice(0, 200),
         String(form.get('notes') || '').trim().slice(0, 1000) || null, auth.name]
      );
    } catch (e) {
      await unlink(filePath).catch(() => {});
      throw e;
    }
    return NextResponse.json({ success: true, version: check.version, sha256: check.sha256, size: check.size });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if ('denied' in auth) return auth.denied;
  const id = request.nextUrl.searchParams.get('id');
  if (!id || !/^\d+$/.test(id)) return NextResponse.json({ success: false, error: 'numeric id required' }, { status: 400 });
  try {
    const busy = await query(`SELECT 1 FROM nano_fw_jobs WHERE firmware_id = $1 AND status IN ('sending', 'running') LIMIT 1`, [id]);
    if (busy.rowCount) {
      return NextResponse.json({ success: false, error: 'A device is updating to this version right now' }, { status: 409 });
    }
    const res = await query(`DELETE FROM nano_firmware WHERE id = $1 RETURNING file_path`, [id]);
    if (res.rowCount === 0) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    await unlink(res.rows[0].file_path).catch(() => {});
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
