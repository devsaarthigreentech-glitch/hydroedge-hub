// ============================================================================
// API ROUTE: /api/nano/servicelog
// ----------------------------------------------------------------------------
// POST   { device_id, kind, notes, finding? }  add a field service entry
// DELETE ?id=<id>                               remove one (a mistaken entry)
// The author is the signed-in user. Entries are listed by /api/nano/health.
// kind: fix | part | config | inspection | note. finding = a health finding
// key; logging a fix against it marks it resolved (lib/nano-health).
// Table: migration 032.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

const KINDS = ['fix', 'part', 'config', 'inspection', 'note'];

async function author(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    return session?.user?.name || session?.user?.email || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { device_id, kind, notes, finding } = (await request.json()) || {};
    const text = typeof notes === 'string' ? notes.trim() : '';
    if (!device_id || !KINDS.includes(kind) || !text) {
      return NextResponse.json({ success: false, error: 'device_id, kind and notes are required' }, { status: 400 });
    }
    if (text.length > 2000) {
      return NextResponse.json({ success: false, error: 'Notes are limited to 2000 characters' }, { status: 400 });
    }
    const res = await query(
      `INSERT INTO nano_service_log (device_id, author, kind, finding, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING id::text AS id, created_at`,
      [device_id, await author(), kind, typeof finding === 'string' && finding ? finding.slice(0, 100) : null, text]
    );
    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id || !/^\d+$/.test(id)) return NextResponse.json({ success: false, error: 'numeric id required' }, { status: 400 });
  try {
    const res = await query(`DELETE FROM nano_service_log WHERE id = $1`, [id]);
    return NextResponse.json({ success: true, deleted: res.rowCount });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
