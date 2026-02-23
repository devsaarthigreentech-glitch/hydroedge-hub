// // ============================================================================
// // API ROUTE: /api/telemetry/[deviceId]
// // ============================================================================

// import { NextRequest, NextResponse } from 'next/server';
// import { query } from '@/lib/db';

// export async function GET(
//   request: NextRequest,
//   context: { params: Promise<{ deviceId: string }> }
// ) {
//   try {
//     // Await params (Next.js 15 requirement)
//     const { deviceId } = await context.params;

//     // Get device info
//     const deviceResult = await query(
//       `SELECT id, imei, device_name, device_type, manufacturer 
//        FROM devices 
//        WHERE id = $1 AND deleted_at IS NULL`,
//       [deviceId]
//     );

//     if (deviceResult.rows.length === 0) {
//       return NextResponse.json(
//         { success: false, error: 'Device not found' },
//         { status: 404 }
//       );
//     }

//     const device = deviceResult.rows[0];

//     // Get latest GPS record
//     const gpsResult = await query(
//       `SELECT 
//         latitude,
//         longitude,
//         altitude,
//         speed,
//         heading as direction,
//         satellites,
//         hdop,
//         timestamp,
//         address
//       FROM gps_records
//       WHERE device_id = $1
//       ORDER BY timestamp DESC
//       LIMIT 1`,
//       [deviceId]
//     );

//     // Get latest IO records (last 20)
//     const ioResult = await query(
//       `SELECT 
//         io_id,
//         io_value,
//         timestamp
//       FROM io_records
//       WHERE device_id = $1
//       ORDER BY timestamp DESC
//       LIMIT 50`,
//       [deviceId]
//     );

//     const gpsData = gpsResult.rows[0];
//     const ioData = ioResult.rows;

//     // Format as Flespi-style telemetry parameters
//     const telemetryParams = [];

//     // System parameters
//     telemetryParams.push(
//       { id: 0, name: "ident", value: device.imei, type: "system", timestamp: gpsData?.timestamp || new Date().toISOString() },
//       { id: 1, name: "device.name", value: device.device_name || "Unknown", type: "system", timestamp: gpsData?.timestamp || new Date().toISOString() },
//       { id: 2, name: "device.type", value: `${device.manufacturer} ${device.device_type}`, type: "system", timestamp: gpsData?.timestamp || new Date().toISOString() }
//     );

//     // GPS sensor parameters
//     if (gpsData) {
//       let paramId = 3;
      
//       if (gpsData.latitude != null) {
//         telemetryParams.push({ id: paramId++, name: "position.latitude", value: gpsData.latitude.toString(), type: "sensor", timestamp: gpsData.timestamp });
//       }
//       if (gpsData.longitude != null) {
//         telemetryParams.push({ id: paramId++, name: "position.longitude", value: gpsData.longitude.toString(), type: "sensor", timestamp: gpsData.timestamp });
//       }
//       if (gpsData.altitude != null) {
//         telemetryParams.push({ id: paramId++, name: "position.altitude", value: gpsData.altitude.toString(), type: "sensor", timestamp: gpsData.timestamp });
//       }
//       if (gpsData.speed != null) {
//         telemetryParams.push({ id: paramId++, name: "position.speed", value: gpsData.speed.toString(), type: "sensor", timestamp: gpsData.timestamp });
//       }
//       if (gpsData.direction != null) {
//         telemetryParams.push({ id: paramId++, name: "position.direction", value: gpsData.direction.toString(), type: "sensor", timestamp: gpsData.timestamp });
//       }
//       if (gpsData.satellites != null) {
//         telemetryParams.push({ id: paramId++, name: "gnss.satellites.count", value: gpsData.satellites.toString(), type: "sensor", timestamp: gpsData.timestamp });
//       }
//       if (gpsData.hdop != null) {
//         telemetryParams.push({ id: paramId++, name: "position.hdop", value: gpsData.hdop.toString(), type: "sensor", timestamp: gpsData.timestamp });
//       }
//       if (gpsData.address) {
//         telemetryParams.push({ id: paramId++, name: "position.address", value: gpsData.address, type: "sensor", timestamp: gpsData.timestamp });
//       }
//     }

//     // IO parameters
//     ioData.forEach((io) => {
//       telemetryParams.push({
//         id: telemetryParams.length,
//         name: `io.${io.io_id}`,
//         value: io.io_value.toString(),
//         type: "sensor",
//         timestamp: io.timestamp,
//       });
//     });

//     return NextResponse.json({
//       success: true,
//       data: telemetryParams,
//       device_id: deviceId,
//       lastUpdate : gpsData?.timestamp
//     });
//   } catch (error: any) {
//     console.error('Error fetching telemetry:', error);
//     return NextResponse.json(
//       {
//         success: false,
//         error: 'Failed to fetch telemetry',
//         message: error.message,
//       },
//       { status: 500 }
//     );
//   }
// }

// ============================================================================
// ENHANCED TELEMETRY API with CAN Parameter Naming
// Shows proper names for IO IDs instead of just "io.112"
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// CAN Parameter mapping - Maps IO IDs to readable names
const IO_PARAMETER_MAP: Record<number, { name: string; unit?: string; category: string }> = {
  // Digital Inputs
  1: { name: "digital.input.1", category: "digital" },
  2: { name: "digital.input.2", category: "digital" },
  3: { name: "digital.input.3", category: "digital" },
  4: { name: "digital.input.4", category: "digital" },
  
  // Analog Inputs
  9: { name: "analog.input.1", unit: "mV", category: "analog" },
  
  // Power/Battery
  66: { name: "power.external.voltage", unit: "mV", category: "power" },
  67: { name: "battery.voltage", unit: "mV", category: "power" },
  68: { name: "battery.current", unit: "mA", category: "power" },
  
  // System
  21: { name: "gsm.signal.level", unit: "dBm", category: "system" },
  24: { name: "vehicle.speed", unit: "km/h", category: "gps" },
  
  // CAN Bus - Standard Parameters
  112: { name: "engine.temperature", unit: "°C", category: "can" },
  113: { name: "coolant.temperature", unit: "°C", category: "can" },
  115: { name: "throttle.position", unit: "%", category: "can" },
  
  // Add more as you discover what your custom IDs are:
  // 10493: { name: "custom.can.1", unit: "?", category: "can" },
  // 10495: { name: "custom.can.2", unit: "?", category: "can" },
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await context.params;

    // Get device info
    const deviceResult = await query(
      `SELECT id, imei, device_name, device_type, manufacturer 
       FROM devices 
       WHERE id = $1 AND deleted_at IS NULL`,
      [deviceId]
    );

    if (deviceResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      );
    }

    const device = deviceResult.rows[0];

    // Get latest GPS record
    const gpsResult = await query(
      `SELECT 
        latitude, longitude, altitude, speed,
        heading as direction, satellites, hdop,
        timestamp, address
      FROM gps_records
      WHERE device_id = $1
      ORDER BY timestamp DESC
      LIMIT 1`,
      [deviceId]
    );

    // Get ALL unique IO parameters with latest values
    const ioResult = await query(
      `SELECT DISTINCT ON (io_id)
        io_id,
        io_value,
        timestamp
      FROM io_records
      WHERE device_id = $1
      ORDER BY io_id, timestamp DESC`,
      [deviceId]
    );

    const gpsData = gpsResult.rows[0];
    const ioData = ioResult.rows;

    const telemetryParams = [];

    // System parameters
    telemetryParams.push(
      { id: 0, name: "ident", value: device.imei, type: "system", timestamp: gpsData?.timestamp || new Date().toISOString() },
      { id: 1, name: "device.name", value: device.device_name || "Unknown", type: "system", timestamp: gpsData?.timestamp || new Date().toISOString() },
      { id: 2, name: "device.type", value: `${device.manufacturer} ${device.device_type}`, type: "system", timestamp: gpsData?.timestamp || new Date().toISOString() }
    );

    // GPS parameters
    if (gpsData) {
      let paramId = 3;
      
      if (gpsData.latitude != null) {
        telemetryParams.push({ 
          id: paramId++, 
          name: "position.latitude", 
          value: gpsData.latitude.toString(), 
          type: "sensor", 
          timestamp: gpsData.timestamp 
        });
      }
      if (gpsData.longitude != null) {
        telemetryParams.push({ 
          id: paramId++, 
          name: "position.longitude", 
          value: gpsData.longitude.toString(), 
          type: "sensor", 
          timestamp: gpsData.timestamp 
        });
      }
      if (gpsData.altitude != null) {
        telemetryParams.push({ 
          id: paramId++, 
          name: "position.altitude", 
          value: gpsData.altitude.toString(), 
          type: "sensor", 
          timestamp: gpsData.timestamp 
        });
      }
      if (gpsData.speed != null) {
        telemetryParams.push({ 
          id: paramId++, 
          name: "position.speed", 
          value: gpsData.speed.toString(), 
          type: "sensor", 
          timestamp: gpsData.timestamp 
        });
      }
      if (gpsData.direction != null) {
        telemetryParams.push({ 
          id: paramId++, 
          name: "position.direction", 
          value: gpsData.direction.toString(), 
          type: "sensor", 
          timestamp: gpsData.timestamp 
        });
      }
      if (gpsData.satellites != null) {
        telemetryParams.push({ 
          id: paramId++, 
          name: "gnss.satellites.count", 
          value: gpsData.satellites.toString(), 
          type: "sensor", 
          timestamp: gpsData.timestamp 
        });
      }
      if (gpsData.hdop != null) {
        telemetryParams.push({ 
          id: paramId++, 
          name: "position.hdop", 
          value: gpsData.hdop.toString(), 
          type: "sensor", 
          timestamp: gpsData.timestamp 
        });
      }
    }

    // IO parameters with proper naming
    ioData.forEach((io) => {
      const ioId = parseInt(io.io_id);
      const mapping = IO_PARAMETER_MAP[ioId];
      
      telemetryParams.push({
        id: telemetryParams.length,
        name: mapping ? mapping.name : `io.${ioId}`,
        value: io.io_value.toString(),
        unit: mapping?.unit || "",
        type: "sensor",
        category: mapping?.category || "unknown",
        timestamp: io.timestamp,
        io_id: ioId,  // Keep original IO ID for reference
      });
    });

    return NextResponse.json({
      success: true,
      data: telemetryParams,
      device_id: deviceId,
      lastUpdate: gpsData?.timestamp || null,
      stats: {
        total_parameters: telemetryParams.length,
        io_parameters: ioData.length,
        gps_parameters: gpsData ? 6 : 0,
        system_parameters: 3,
      }
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