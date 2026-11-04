// ============================================================================
// PUBLIC ROUTE: /fw/<token>.bin — firmware images for the modem's AT+HTTP client.
// ----------------------------------------------------------------------------
// No login, because the modem cannot log in: the unguessable token is the only
// key, and the SHA-256 reaches the device separately over MQTT. The device
// compares received bytes with P-5303, so the response must carry an exact
// Content-Length: never chunked, never compressed (no-transform also keeps
// Next's own compression off). The file name on disk is the token, so serving
// needs no database; the fetch count is best effort.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { query } from '@/lib/db';
import { firmwareDir } from '@/lib/nano-firmware';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const m = /^([A-Za-z0-9_-]{22})\.bin$/.exec(file);
  if (!m) return new NextResponse('Not found', { status: 404 });
  let buf: Buffer;
  try {
    buf = await readFile(path.join(firmwareDir(), `${m[1]}.bin`));
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
  const ip = (request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null;
  query(
    `UPDATE nano_firmware SET fetch_count = fetch_count + 1, last_fetch_at = now(), last_fetch_ip = $2 WHERE token = $1`,
    [m[1], ip]
  ).catch(() => {});
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(buf.length),
      'Cache-Control': 'no-store, no-transform',
      'Accept-Ranges': 'none',
    },
  });
}
