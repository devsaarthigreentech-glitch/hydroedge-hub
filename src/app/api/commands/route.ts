// ============================================================================
// API ROUTE: /api/commands
// POST - Queue a command for a device
// GET - Get command history for a device
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { device_id, command } = body;

    if (!device_id || !command) {
      return NextResponse.json(
        { success: false, error: 'Missing device_id or command' },
        { status: 400 }
      );
    }

    // Get device IMEI
    const deviceResult = await query(
      'SELECT imei FROM devices WHERE id = $1',
      [device_id]
    );

    if (deviceResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      );
    }

    const imei = deviceResult.rows[0].imei;

    // Determine command type from command text
    const command_type = command.split(' ')[0]; // e.g., "getinfo", "setdigout"

    // Insert into command_history table
    const sql = `
      INSERT INTO command_history (
        device_id,
        imei,
        command_type,
        command_text,
        status,
        source,
        sent_at
      )
      VALUES ($1, $2, $3, $4, 'pending', 'admin_panel', NOW())
      RETURNING *
    `;

    const result = await query(sql, [device_id, imei, command_type, command]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Command queued successfully',
    });
  } catch (error: any) {
    console.error('Error queuing command:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to queue command',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const deviceId = searchParams.get('device_id');

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: 'Missing device_id parameter' },
        { status: 400 }
      );
    }

    // Get command history for device
    const sql = `
      SELECT 
        id,
        device_id,
        imei,
        command_type,
        command_text as command,
        status,
        sent_at,
        executed_at,
        response,
        error_message
      FROM command_history
      WHERE device_id = $1
      ORDER BY sent_at DESC
      LIMIT 50
    `;

    const result = await query(sql, [deviceId]);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error: any) {
    console.error('Error fetching command history:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch command history',
        message: error.message,
      },
      { status: 500 }
    );
  }
}