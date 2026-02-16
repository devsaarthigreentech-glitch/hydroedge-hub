// ============================================================================
// API ROUTE: /api/telemetry-history
// GET - Get telemetry history for graphing
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const deviceId = searchParams.get('device_id');
    const range = searchParams.get('range') || '24h';

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: 'Missing device_id parameter' },
        { status: 400 }
      );
    }

    // Convert range to hours
    const rangeMap: { [key: string]: number } = {
      '1h': 1,
      '6h': 6,
      '24h': 24,
      '7d': 168,
    };
    const hours = rangeMap[range] || 24;

    // Get IO records for the time range
    const sql = `
      SELECT 
        io_id,
        io_value,
        timestamp
      FROM io_records
      WHERE device_id = $1
        AND timestamp > NOW() - INTERVAL '${hours} hours'
      ORDER BY timestamp ASC
    `;

    const result = await query(sql, [deviceId]);

    // Group by IO ID and create time series
    const telemetryData: { [key: string]: any[] } = {};

    // IO ID to metric name mapping
    const ioMapping: { [key: number]: string } = {
      24: 'position.speed',
      66: 'external.powersource.voltage',
      67: 'battery.voltage',
      68: 'battery.current',
      21: 'gsm.signal.level',
    };

    result.rows.forEach((row) => {
      const metricName = ioMapping[row.io_id];
      if (metricName) {
        if (!telemetryData[metricName]) {
          telemetryData[metricName] = [];
        }
        telemetryData[metricName].push({
          timestamp: row.timestamp,
          value: parseFloat(row.io_value),
        });
      }
    });

    // Also get GPS data for position metrics
    const gpsSql = `
      SELECT 
        latitude,
        longitude,
        altitude,
        speed,
        satellites,
        hdop,
        timestamp
      FROM gps_records
      WHERE device_id = $1
        AND timestamp > NOW() - INTERVAL '${hours} hours'
      ORDER BY timestamp ASC
    `;

    const gpsResult = await query(gpsSql, [deviceId]);

    gpsResult.rows.forEach((row) => {
      // Latitude
      if (!telemetryData['position.latitude']) {
        telemetryData['position.latitude'] = [];
      }
      telemetryData['position.latitude'].push({
        timestamp: row.timestamp,
        value: parseFloat(row.latitude),
      });

      // Longitude
      if (!telemetryData['position.longitude']) {
        telemetryData['position.longitude'] = [];
      }
      telemetryData['position.longitude'].push({
        timestamp: row.timestamp,
        value: parseFloat(row.longitude),
      });

      // Altitude
      if (row.altitude != null) {
        if (!telemetryData['position.altitude']) {
          telemetryData['position.altitude'] = [];
        }
        telemetryData['position.altitude'].push({
          timestamp: row.timestamp,
          value: parseFloat(row.altitude),
        });
      }

      // Speed
      if (row.speed != null) {
        if (!telemetryData['position.speed']) {
          telemetryData['position.speed'] = [];
        }
        telemetryData['position.speed'].push({
          timestamp: row.timestamp,
          value: parseFloat(row.speed),
        });
      }

      // Satellites
      if (row.satellites != null) {
        if (!telemetryData['gnss.satellites.count']) {
          telemetryData['gnss.satellites.count'] = [];
        }
        telemetryData['gnss.satellites.count'].push({
          timestamp: row.timestamp,
          value: parseInt(row.satellites),
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: telemetryData,
      range: range,
    });
  } catch (error: any) {
    console.error('Error fetching telemetry history:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch telemetry history',
        message: error.message,
      },
      { status: 500 }
    );
  }
}