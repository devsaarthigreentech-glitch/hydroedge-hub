// ============================================================================
// API ROUTE: /api/devices
// GET - Fetch all devices with latest GPS data
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get('customer_id');

    // SQL query to fetch devices with their latest GPS data
    let sql = `
      SELECT 
        d.id,
        d.imei,
        d.device_name,
        d.device_type,
        d.manufacturer,
        d.status,
        d.connection_status,
        d.customer_id,
        d.asset_name,
        d.asset_type,
        d.sim_number,
        d.firmware_version,
        d.tags,
        d.created_at,
        d.updated_at,
        g.latitude as last_latitude,
        g.longitude as last_longitude,
        g.timestamp as last_location_time
      FROM devices d
      LEFT JOIN LATERAL (
        SELECT latitude, longitude, timestamp
        FROM gps_records
        WHERE device_id = d.id
        ORDER BY timestamp DESC
        LIMIT 1
      ) g ON true
    `;

    const params: any[] = [];

    // Add customer filter if provided
    if (customerId && customerId !== 'all') {
      sql += ` WHERE d.customer_id = $1`;
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
      {
        success: false,
        error: 'Failed to fetch devices',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// POST - Create new device
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      imei,
      device_name,
      device_type,
      manufacturer,
      customer_id,
      asset_name,
      asset_type,
      sim_number,
    } = body;

    // Validate required fields
    if (!imei || !device_name || !device_type || !manufacturer || !customer_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
        },
        { status: 400 }
      );
    }

    const sql = `
      INSERT INTO devices (
        imei, device_name, device_type, manufacturer, 
        customer_id, asset_name, asset_type, sim_number,
        status, connection_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', 'offline')
      RETURNING *
    `;

    const result = await query(sql, [
      imei,
      device_name,
      device_type,
      manufacturer,
      customer_id,
      asset_name,
      asset_type,
      sim_number,
    ]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Device created successfully',
    });
  } catch (error: any) {
    console.error('Error creating device:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create device',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
