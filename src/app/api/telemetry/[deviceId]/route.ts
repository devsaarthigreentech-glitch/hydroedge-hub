// ============================================================================
// API ROUTE: /api/telemetry/[deviceId]
// GET - Fetch latest telemetry for a device
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { deviceId: string } }
) {
  try {
    const deviceId = params.deviceId;

    // Get latest GPS record
    const gpsResult = await query(
      `
      SELECT 
        latitude,
        longitude,
        altitude,
        speed,
        direction,
        satellites,
        hdop,
        timestamp
      FROM gps_records
      WHERE device_id = $1
      ORDER BY timestamp DESC
      LIMIT 1
    `,
      [deviceId]
    );

    // Get latest IO records
    const ioResult = await query(
      `
      SELECT 
        io_id,
        io_value,
        io_name,
        timestamp
      FROM io_records
      WHERE device_id = $1
      ORDER BY timestamp DESC
      LIMIT 50
    `,
      [deviceId]
    );

    // Get device info
    const deviceResult = await query(
      `
      SELECT imei, device_name, device_type, manufacturer
      FROM devices
      WHERE id = $1
    `,
      [deviceId]
    );

    if (deviceResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Device not found',
        },
        { status: 404 }
      );
    }

    const device = deviceResult.rows[0];
    const gpsData = gpsResult.rows[0];
    const ioData = ioResult.rows;

    // Format telemetry data (Flespi-style)
    const telemetryParams = [];

    // System parameters
    telemetryParams.push({
      id: telemetryParams.length,
      name: 'ident',
      value: device.imei,
      type: 'system',
      timestamp: gpsData?.timestamp || new Date().toISOString(),
    });

    telemetryParams.push({
      id: telemetryParams.length,
      name: 'device.name',
      value: device.device_name,
      type: 'system',
      timestamp: gpsData?.timestamp || new Date().toISOString(),
    });

    telemetryParams.push({
      id: telemetryParams.length,
      name: 'device.type',
      value: `${device.manufacturer} ${device.device_type}`,
      type: 'system',
      timestamp: gpsData?.timestamp || new Date().toISOString(),
    });

    // GPS sensor parameters
    if (gpsData) {
      telemetryParams.push({
        id: telemetryParams.length,
        name: 'position.latitude',
        value: gpsData.latitude?.toString() || '0',
        type: 'sensor',
        timestamp: gpsData.timestamp,
      });

      telemetryParams.push({
        id: telemetryParams.length,
        name: 'position.longitude',
        value: gpsData.longitude?.toString() || '0',
        type: 'sensor',
        timestamp: gpsData.timestamp,
      });

      if (gpsData.altitude) {
        telemetryParams.push({
          id: telemetryParams.length,
          name: 'position.altitude',
          value: gpsData.altitude.toString(),
          type: 'sensor',
          timestamp: gpsData.timestamp,
        });
      }

      if (gpsData.speed !== null) {
        telemetryParams.push({
          id: telemetryParams.length,
          name: 'position.speed',
          value: gpsData.speed.toString(),
          type: 'sensor',
          timestamp: gpsData.timestamp,
        });
      }

      if (gpsData.direction !== null) {
        telemetryParams.push({
          id: telemetryParams.length,
          name: 'position.direction',
          value: gpsData.direction.toString(),
          type: 'sensor',
          timestamp: gpsData.timestamp,
        });
      }

      if (gpsData.satellites) {
        telemetryParams.push({
          id: telemetryParams.length,
          name: 'gnss.satellites.count',
          value: gpsData.satellites.toString(),
          type: 'sensor',
          timestamp: gpsData.timestamp,
        });
      }

      if (gpsData.hdop) {
        telemetryParams.push({
          id: telemetryParams.length,
          name: 'position.hdop',
          value: gpsData.hdop.toString(),
          type: 'sensor',
          timestamp: gpsData.timestamp,
        });
      }
    }

    // IO parameters
    ioData.forEach((io) => {
      telemetryParams.push({
        id: telemetryParams.length,
        name: io.io_name || `io.${io.io_id}`,
        value: io.io_value.toString(),
        type: 'sensor',
        timestamp: io.timestamp,
      });
    });

    return NextResponse.json({
      success: true,
      data: telemetryParams,
      device_id: deviceId,
    });
  } catch (error: any) {
    console.error('Error fetching telemetry:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch telemetry',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
