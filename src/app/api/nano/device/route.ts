// ============================================================================
// API ROUTE: /api/nano/device   (PATCH)
// ----------------------------------------------------------------------------
// Update editable metadata on the shared devices row for a Nano device.
// Whitelisted columns only. Body: { device_id, device_name?, customer_id?,
// asset_name?, asset_type?, sim_number?, status?, tags? }
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

const ALLOWED = ['device_name', 'customer_id', 'asset_name', 'asset_type', 'sim_number', 'status', 'tags'];
const STATUSES = ['active', 'inactive', 'suspended', 'maintenance', 'stolen'];

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { device_id, ...fields } = body || {};
    if (!device_id) {
      return NextResponse.json({ success: false, error: 'device_id is required' }, { status: 400 });
    }

    const sets: string[] = [];
    const vals: any[] = [];
    let i = 1;

    for (const key of ALLOWED) {
      if (!(key in fields)) continue;
      if (key === 'status' && fields[key] && !STATUSES.includes(fields[key])) {
        return NextResponse.json({ success: false, error: `Invalid status: ${fields[key]}` }, { status: 400 });
      }
      if (key === 'tags') {
        const tags = Array.isArray(fields[key])
          ? fields[key]
          : String(fields[key] || '').split(',').map((s: string) => s.trim()).filter(Boolean);
        sets.push(`tags = $${i++}`);
        vals.push(tags);
      } else {
        sets.push(`${key} = $${i++}`);
        vals.push(fields[key] === '' ? null : fields[key]);
      }
    }

    if (sets.length === 0) {
      return NextResponse.json({ success: false, error: 'No editable fields provided' }, { status: 400 });
    }

    sets.push('updated_at = now()');
    vals.push(device_id);

    const res = await query(
      `UPDATE devices SET ${sets.join(', ')}
        WHERE id = $${i} AND deleted_at IS NULL
      RETURNING id, device_name, asset_name, asset_type, customer_id, sim_number, status, tags`,
      vals
    );
    if (res.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Device not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (error: any) {
    console.error('Error updating nano device:', error);
    return NextResponse.json({ success: false, error: 'Failed to update device', message: error.message }, { status: 500 });
  }
}