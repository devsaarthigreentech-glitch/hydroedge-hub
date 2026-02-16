// ============================================================================
// API ROUTE: /api/commands/pending
// GET - Get pending commands for a specific device (called by Python server)
// PUT - Update command status after execution
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const imei = searchParams.get('imei');

    if (!imei) {
      return NextResponse.json(
        { success: false, error: 'Missing imei parameter' },
        { status: 400 }
      );
    }

    // Get device_id from IMEI
    const deviceResult = await query(
      `SELECT id FROM devices WHERE imei = $1 AND deleted_at IS NULL`,
      [imei]
    );

    if (deviceResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Device not found',
      });
    }

    const deviceId = deviceResult.rows[0].id;

    // Get pending commands
    const sql = `
      SELECT 
        id,
        device_id,
        command,
        status,
        sent_at
      FROM command_history
      WHERE device_id = $1 
        AND status = 'pending'
      ORDER BY sent_at ASC
      LIMIT 10
    `;

    const result = await query(sql, [deviceId]);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error: any) {
    console.error('Error fetching pending commands:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch pending commands',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { command_id, status, response, error_message } = body;

    if (!command_id || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing command_id or status' },
        { status: 400 }
      );
    }

    const sql = `
      UPDATE command_history
      SET 
        status = $1,
        executed_at = NOW(),
        response = $2,
        error_message = $3
      WHERE id = $4
      RETURNING *
    `;

    const result = await query(sql, [status, response, error_message, command_id]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Command status updated',
    });
  } catch (error: any) {
    console.error('Error updating command status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update command status',
        message: error.message,
      },
      { status: 500 }
    );
  }
}