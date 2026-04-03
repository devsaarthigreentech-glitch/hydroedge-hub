// // ============================================================================
// // API ROUTE: /api/io-logs/[deviceId]
// // GET - Fetch IO records filtered by io_id(s) and time range
// // ============================================================================

// import { NextRequest, NextResponse } from 'next/server';
// import { query } from '@/lib/db';

// export async function GET(
//   request: NextRequest,
//   context: { params: Promise<{ deviceId: string }> }
// ) {
//   try {
//     const { deviceId } = await context.params;
//     const searchParams = request.nextUrl.searchParams;

//     const ioIdsParam = searchParams.get('io_ids');   // comma-separated: "1,216,24"
//     const startTime = searchParams.get('start');      // ISO string (UTC)
//     const endTime = searchParams.get('end');          // ISO string (UTC)

//     if (!ioIdsParam) {
//       return NextResponse.json(
//         { success: false, error: 'io_ids parameter is required' },
//         { status: 400 }
//       );
//     }

//     if (!startTime || !endTime) {
//       return NextResponse.json(
//         { success: false, error: 'start and end parameters are required' },
//         { status: 400 }
//       );
//     }

//     const ioIds = ioIdsParam.split(',').map(Number).filter(n => !isNaN(n));

//     if (ioIds.length === 0) {
//       return NextResponse.json(
//         { success: false, error: 'No valid io_ids provided' },
//         { status: 400 }
//       );
//     }

//     if (ioIds.length > 10) {
//       return NextResponse.json(
//         { success: false, error: 'Maximum 10 IO parameters at once' },
//         { status: 400 }
//       );
//     }

//     // Validate time range isn't too wide (max 7 days)
//     const start = new Date(startTime);
//     const end = new Date(endTime);
//     const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

//     if (diffDays > 7) {
//       return NextResponse.json(
//         { success: false, error: 'Time range cannot exceed 7 days' },
//         { status: 400 }
//       );
//     }

//     const sql = `
//       SELECT io_id, io_value, timestamp
//       FROM io_records
//       WHERE device_id = $1
//         AND io_id = ANY($2::int[])
//         AND timestamp >= $3
//         AND timestamp <= $4
//         AND timestamp > '2025-01-01'
//       ORDER BY timestamp DESC
//       LIMIT 1000
//     `;

//     const result = await query(sql, [deviceId, ioIds, startTime, endTime]);

//     return NextResponse.json({
//       success: true,
//       data: result.rows,
//       count: result.rowCount,
//     });

//   } catch (error: any) {
//     console.error('IO Logs fetch error:', error);
//     return NextResponse.json(
//       { success: false, error: 'Failed to fetch IO logs', message: error.message },
//       { status: 500 }
//     );
//   }
// }
// ============================================================================
// API ROUTE: /api/io-logs/[deviceId]
// GET - Fetch IO records filtered by io_id(s) and time range
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await context.params;
    const searchParams = request.nextUrl.searchParams;

    const ioIdsParam = searchParams.get('io_ids');   // comma-separated: "1,216,24"
    const startTime = searchParams.get('start');      // ISO string (UTC)
    const endTime = searchParams.get('end');          // ISO string (UTC)

    if (!ioIdsParam) {
      return NextResponse.json(
        { success: false, error: 'io_ids parameter is required' },
        { status: 400 }
      );
    }

    if (!startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: 'start and end parameters are required' },
        { status: 400 }
      );
    }

    const ioIds = ioIdsParam.split(',').map(Number).filter(n => !isNaN(n));

    if (ioIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid io_ids provided' },
        { status: 400 }
      );
    }

    if (ioIds.length > 10) {
      return NextResponse.json(
        { success: false, error: 'Maximum 10 IO parameters at once' },
        { status: 400 }
      );
    }

    // Validate time range isn't too wide (max 7 days)
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays > 7) {
      return NextResponse.json(
        { success: false, error: 'Time range cannot exceed 7 days' },
        { status: 400 }
      );
    }

    const sql = `
      SELECT io_id, io_value, timestamp
      FROM io_records
      WHERE device_id = $1
        AND io_id = ANY($2::int[])
        AND timestamp >= $3
        AND timestamp <= $4
        AND timestamp > '2025-01-01'
      ORDER BY timestamp DESC
      LIMIT 1000
    `;

    const result = await query(sql, [deviceId, ioIds, startTime, endTime]);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });

  } catch (error: any) {
    console.error('IO Logs fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch IO logs', message: error.message },
      { status: 500 }
    );
  }
}