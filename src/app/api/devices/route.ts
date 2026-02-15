// ============================================================================
// API ROUTE: /api/devices
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get('customer_id');

    // Query that matches your database structure
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
        latest_gps.latitude as last_latitude,
        latest_gps.longitude as last_longitude,
        latest_gps.timestamp as last_location_time
      FROM devices d
      LEFT JOIN LATERAL (
        SELECT latitude, longitude, timestamp
        FROM gps_records
        WHERE device_id = d.id
        ORDER BY timestamp DESC
        LIMIT 1
      ) latest_gps ON true
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
      {
        success: false,
        error: 'Failed to fetch devices',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

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

    if (!imei || !customer_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: imei and customer_id' },
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
      device_name || null,
      device_type || 'FMC650',
      manufacturer || 'Teltonika',
      customer_id,
      asset_name || null,
      asset_type || null,
      sim_number || null,
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