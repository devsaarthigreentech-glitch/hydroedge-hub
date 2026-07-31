// import { NextRequest, NextResponse } from 'next/server';
// import { getServerSession } from 'next-auth';
// import { query } from '@/lib/db';

// export async function GET(request: NextRequest) {
//   try {
//     // Check session for role-based filtering
//     let customerIdFromSession: string | null = null;
//     try {
//       const { authOptions } = await import("@/lib/auth");
//       const session = await getServerSession(authOptions);
//       const user = session?.user as any;
//       // If user has a customerId, they're a customer user — restrict devices
//       if (user?.customerId) {
//         customerIdFromSession = user.customerId;
//       }
//     } catch (e) {
//       // Session check failed, continue without filtering
//     }

//     const searchParams = request.nextUrl.searchParams;
//     const customerId = customerIdFromSession || searchParams.get('customer_id');

//     // Read cached last-position columns directly from devices.
//     // These are kept up-to-date by the Python GPS server's save_gps_record() —
//     // no need to LATERAL-join gps_records every time.
//     let sql = `
//       SELECT 
//         d.id, d.imei, d.device_name, d.device_type,
//         d.manufacturer, d.protocol, d.status, d.connection_status,
//         d.customer_id, d.asset_name, d.asset_type,
//         d.sim_number, d.firmware_version, d.tags,
//         d.notes, d.tested, d.name_locked,
//         d.created_at, d.updated_at,
//         d.last_latitude, d.last_longitude, d.last_location_time
//       FROM devices d
//       WHERE d.deleted_at IS NULL
//     `;

//     const params: any[] = [];

//     if (customerId && customerId !== 'all') {
//       sql += ` AND d.customer_id = $1`;
//       params.push(customerId);
//     }

//     sql += ` ORDER BY d.device_name`;

//     const result = await query(sql, params);

//     return NextResponse.json({
//       success: true,
//       data: result.rows,
//       count: result.rowCount,
//     });
//   } catch (error: any) {
//     console.error('Error fetching devices:', error);
//     return NextResponse.json(
//       { success: false, error: 'Failed to fetch devices', message: error.message },
//       { status: 500 }
//     );
//   }
// }
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Check session for role-based filtering
    let customerIdFromSession: string | null = null;
    try {
      const { authOptions } = await import("@/lib/auth");
      const session = await getServerSession(authOptions);
      const user = session?.user as any;
      // If user has a customerId, they're a customer user — restrict devices
      if (user?.customerId) {
        customerIdFromSession = user.customerId;
      }
    } catch (e) {
      // Session check failed, continue without filtering
    }

    const searchParams = request.nextUrl.searchParams;
    const customerId = customerIdFromSession || searchParams.get('customer_id');

    // Read cached last-position columns directly from devices.
    // These are kept up-to-date by the Python GPS server's save_gps_record() —
    // no need to LATERAL-join gps_records every time.
    let sql = `
      SELECT 
        d.id, d.imei, d.device_name, d.device_type,
        d.manufacturer, d.protocol, d.status, d.connection_status,
        d.customer_id, d.asset_name, d.asset_type,
        d.sim_number, d.firmware_version, d.tags,
        d.notes, d.tested, d.name_locked,
        d.created_at, d.updated_at,
        d.last_latitude, d.last_longitude, d.last_location_time,
        d.last_contact_at
      FROM devices d
      WHERE d.deleted_at IS NULL
    `;

    const params: any[] = [];

    if (customerId && customerId !== 'all') {
      sql += ` AND d.customer_id = $1`;
      params.push(customerId);
    }

    sql += ` ORDER BY d.device_name`;

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error: any) {
    console.error('Error fetching devices:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch devices', message: error.message },
      { status: 500 }
    );
  }
}