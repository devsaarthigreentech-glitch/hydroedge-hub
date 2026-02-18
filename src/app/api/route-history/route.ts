// app/api/route-history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const deviceId = searchParams.get('device_id');
    const startTime = searchParams.get('start_time');
    const endTime = searchParams.get('end_time');

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: 'Missing device_id parameter' },
        { status: 400 }
      );
    }

    if (!startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: 'Missing start_time or end_time parameter' },
        { status: 400 }
      );
    }

    // Query to get GPS records within time range
    const sql = `
      SELECT 
        latitude,
        longitude,
        timestamp,
        speed,
        heading,
        altitude
      FROM gps_records
      WHERE device_id = $1
        AND timestamp >= $2
        AND timestamp <= $3
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
      ORDER BY timestamp ASC
      LIMIT 500
    `;

    const result = await query(sql, [deviceId, startTime, endTime]);

    // Return the route history points
    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
      time_range: {
        start: startTime,
        end: endTime,
      },
    });
  } catch (error: any) {
    console.error('Error fetching route history:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch route history',
        message: error.message,
      },
      { status: 500 }
    );
  }
}