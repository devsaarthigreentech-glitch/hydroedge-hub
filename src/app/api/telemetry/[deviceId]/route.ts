// // ============================================================================
// // ENHANCED TELEMETRY API with CAN Parameter Naming
// // Shows proper names for IO IDs instead of just "io.112"
// // ============================================================================

// import { NextRequest, NextResponse } from 'next/server';
// import { query } from '@/lib/db';

// // CAN Parameter mapping - Maps IO IDs to readable names
// const IO_PARAMETER_MAP: Record<number, { name: string; unit?: string; category: string }> = {
//   // Digital Inputs
//   1: { name: "digital.input.1", category: "digital" },
//   2: { name: "digital.input.2", category: "digital" },
//   3: { name: "digital.input.3", category: "digital" },
//   4: { name: "digital.input.4", category: "digital" },
  
//   // Analog Inputs
//   9: { name: "analog.input.1", unit: "mV", category: "analog" },
  
//   // Power/Battery
//   66: { name: "power.external.voltage", unit: "mV", category: "power" },
//   67: { name: "battery.voltage", unit: "mV", category: "power" },
//   68: { name: "battery.current", unit: "mA", category: "power" },
  
//   // System
//   21: { name: "gsm.signal.level", unit: "dBm", category: "system" },
//   24: { name: "vehicle.speed", unit: "km/h", category: "gps" },
  
//   // CAN Bus - Standard Parameters
//   112: { name: "engine.temperature", unit: "°C", category: "can" },
//   113: { name: "coolant.temperature", unit: "°C", category: "can" },
//   115: { name: "throttle.position", unit: "%", category: "can" },
  
//   // Add more as you discover what your custom IDs are:
//   // 10493: { name: "custom.can.1", unit: "?", category: "can" },
//   // 10495: { name: "custom.can.2", unit: "?", category: "can" },
// };

// export async function GET(
//   request: NextRequest,
//   context: { params: Promise<{ deviceId: string }> }
// ) {
//   try {
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
//         latitude, longitude, altitude, speed,
//         heading as direction, satellites, hdop,
//         timestamp, address
//       FROM gps_records
//       WHERE device_id = $1
//       ORDER BY timestamp DESC
//       LIMIT 1`,
//       [deviceId]
//     );

//     // Get ALL unique IO parameters with latest values
//     const ioResult = await query(
//       `SELECT DISTINCT ON (io_id)
//         io_id,
//         io_value,
//         timestamp
//       FROM io_records
//       WHERE device_id = $1
//       ORDER BY io_id, timestamp DESC`,
//       [deviceId]
//     );

//     const gpsData = gpsResult.rows[0];
//     const ioData = ioResult.rows;

//     const telemetryParams = [];

//     // System parameters
//     telemetryParams.push(
//       { id: 0, name: "ident", value: device.imei, type: "system", timestamp: gpsData?.timestamp || new Date().toISOString() },
//       { id: 1, name: "device.name", value: device.device_name || "Unknown", type: "system", timestamp: gpsData?.timestamp || new Date().toISOString() },
//       { id: 2, name: "device.type", value: `${device.manufacturer} ${device.device_type}`, type: "system", timestamp: gpsData?.timestamp || new Date().toISOString() }
//     );

//     // GPS parameters
//     if (gpsData) {
//       let paramId = 3;
      
//       if (gpsData.latitude != null) {
//         telemetryParams.push({ 
//           id: paramId++, 
//           name: "position.latitude", 
//           value: gpsData.latitude.toString(), 
//           type: "sensor", 
//           timestamp: gpsData.timestamp 
//         });
//       }
//       if (gpsData.longitude != null) {
//         telemetryParams.push({ 
//           id: paramId++, 
//           name: "position.longitude", 
//           value: gpsData.longitude.toString(), 
//           type: "sensor", 
//           timestamp: gpsData.timestamp 
//         });
//       }
//       if (gpsData.altitude != null) {
//         telemetryParams.push({ 
//           id: paramId++, 
//           name: "position.altitude", 
//           value: gpsData.altitude.toString(), 
//           type: "sensor", 
//           timestamp: gpsData.timestamp 
//         });
//       }
//       if (gpsData.speed != null) {
//         telemetryParams.push({ 
//           id: paramId++, 
//           name: "position.speed", 
//           value: gpsData.speed.toString(), 
//           type: "sensor", 
//           timestamp: gpsData.timestamp 
//         });
//       }
//       if (gpsData.direction != null) {
//         telemetryParams.push({ 
//           id: paramId++, 
//           name: "position.direction", 
//           value: gpsData.direction.toString(), 
//           type: "sensor", 
//           timestamp: gpsData.timestamp 
//         });
//       }
//       if (gpsData.satellites != null) {
//         telemetryParams.push({ 
//           id: paramId++, 
//           name: "gnss.satellites.count", 
//           value: gpsData.satellites.toString(), 
//           type: "sensor", 
//           timestamp: gpsData.timestamp 
//         });
//       }
//       if (gpsData.hdop != null) {
//         telemetryParams.push({ 
//           id: paramId++, 
//           name: "position.hdop", 
//           value: gpsData.hdop.toString(), 
//           type: "sensor", 
//           timestamp: gpsData.timestamp 
//         });
//       }
//     }

//     // IO parameters with proper naming
//     ioData.forEach((io) => {
//       const ioId = parseInt(io.io_id);
//       const mapping = IO_PARAMETER_MAP[ioId];
      
//       telemetryParams.push({
//         id: telemetryParams.length,
//         name: mapping ? mapping.name : `io.${ioId}`,
//         value: io.io_value.toString(),
//         unit: mapping?.unit || "",
//         type: "sensor",
//         category: mapping?.category || "unknown",
//         timestamp: io.timestamp,
//         io_id: ioId,  // Keep original IO ID for reference
//       });
//     });

//     return NextResponse.json({
//       success: true,
//       data: telemetryParams,
//       device_id: deviceId,
//       lastUpdate: gpsData?.timestamp || null,
//       stats: {
//         total_parameters: telemetryParams.length,
//         io_parameters: ioData.length,
//         gps_parameters: gpsData ? 6 : 0,
//         system_parameters: 3,
//       }
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
// TELEMETRY API - Focused Teltonika IO Parameter Map
// FMB150 (Codec 8) + FMC650 (Codec 8E)
// multiplier: applied as displayValue = rawValue * multiplier
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface IOParam {
  name: string;
  unit?: string;
  category: string;
  multiplier?: number;
}

// ─── Shared IO map (identical meaning on BOTH devices) ───────────────────────

const SHARED_IO_MAP: Record<number, IOParam> = {
  // Digital I/O
  1:   { name: "din.1",                        category: "digital" },
  2:   { name: "din.2",                        category: "digital" },
  3:   { name: "din.3",                        category: "digital" },
  179: { name: "dout.1",                       category: "digital" },
  180: { name: "dout.2",                       category: "digital" },

  // Analog Inputs (raw mV → V)
  9:   { name: "ain.1",                        unit: "V",     category: "analog",  multiplier: 0.001 },

  // Power
  66:  { name: "external.powersource.voltage", unit: "V",     category: "power",   multiplier: 0.001 },
  67:  { name: "battery.voltage",              unit: "V",     category: "power",   multiplier: 0.001 },
  68:  { name: "battery.current",              unit: "mA",    category: "power" },

  // GSM / Network
  21:  { name: "gsm.signal.level",             unit: "%",     category: "system" },
  200: { name: "sleep.mode.enum",              category: "system" },
  205: { name: "gsm.cell.id",                  category: "system" },
  206: { name: "gsm.area.code",                category: "system" },
  241: { name: "gsm.operator.code",            category: "system" },

  // GNSS quality
  181: { name: "position.pdop",                category: "gps",    multiplier: 0.1 },
  182: { name: "position.hdop",                category: "gps",    multiplier: 0.1 },

  // Motion / ignition
  239: { name: "engine.ignition.status",       category: "system" },
  240: { name: "movement.status",              category: "system" },
  24:  { name: "can.vehicle.speed",            unit: "km/h",  category: "can" },

  // Odometer
  199: { name: "segment.vehicle.mileage",      unit: "m",     category: "vehicle" },

  // GPS-based fuel
  12:  { name: "gps.fuel.used",                unit: "l",     category: "fuel",   multiplier: 0.001 },
  13:  { name: "gps.fuel.rate",                unit: "l/100km", category: "fuel", multiplier: 0.01 },

  // Dallas Temperature sensors (÷10)
  72:  { name: "dallas.temp.1",                unit: "°C",    category: "temperature", multiplier: 0.1 },
  73:  { name: "dallas.temp.2",                unit: "°C",    category: "temperature", multiplier: 0.1 },
  74:  { name: "dallas.temp.3",                unit: "°C",    category: "temperature", multiplier: 0.1 },
  75:  { name: "dallas.temp.4",                unit: "°C",    category: "temperature", multiplier: 0.1 },

  // iButton / RFID
  78:  { name: "ibutton.id",                   category: "id" },
  207: { name: "rfid",                         category: "id" },

  // LLS Fuel Sensors
  201: { name: "lls.1.fuel.level",             unit: "l",     category: "fuel" },
  202: { name: "lls.1.temperature",            unit: "°C",    category: "temperature" },
  203: { name: "lls.2.fuel.level",             unit: "l",     category: "fuel" },
  204: { name: "lls.2.temperature",            unit: "°C",    category: "temperature" },
};

// ─── FMB150-only IDs ──────────────────────────────────────────────────────────

const FMB150_ONLY: Record<number, IOParam> = {
  80:  { name: "data.mode.enum",               category: "system" },
  69:  { name: "gnss.state.enum",              category: "gps" },
  16:  { name: "vehicle.mileage",              unit: "m",     category: "vehicle" },
  17:  { name: "accelerometer.x",              unit: "mG",    category: "motion" },
  18:  { name: "accelerometer.y",              unit: "mG",    category: "motion" },
  19:  { name: "accelerometer.z",              unit: "mG",    category: "motion" },
  // Battery Level % — FMB150 ID 113 means battery%, FMC650 ID 113 = FMS service distance
  113: { name: "battery.level",                unit: "%",     category: "power" },
  10:  { name: "sd.card.status",               category: "system" },
  11:  { name: "sim.iccid1",                   category: "system" },
  6:   { name: "ain.2",                        unit: "V",     category: "analog", multiplier: 0.001 },
  237: { name: "network.type",                 category: "system" },
  // OBD/CAN (FMB150 LV-CAN IDs from OBD elements section)
  112: { name: "can.engine.temperature",       unit: "°C",    category: "can" },
  115: { name: "can.throttle.pedal.level",     unit: "%",     category: "can" },
  116: { name: "can.coolant.temperature",      unit: "°C",    category: "can" },
  114: { name: "can.engine.rpm",               unit: "rpm",   category: "can" },
};

// ─── FMC650-only IDs ──────────────────────────────────────────────────────────
// AVL IDs confirmed from your screenshots + JSON payload

const FMC650_ONLY: Record<number, IOParam> = {
  22:  { name: "data.mode.enum",               category: "system" },
  71:  { name: "gnss.state.enum",              category: "gps" },
  216: { name: "vehicle.mileage",              unit: "m",     category: "vehicle" },

  // Accelerometer (FMC650 uses different IDs)
  236: { name: "accelerometer.x",              unit: "mG",    category: "motion" },
  237: { name: "accelerometer.y",              unit: "mG",    category: "motion" },
  238: { name: "accelerometer.z",              unit: "mG",    category: "motion" },

  // Analog Inputs 2-4
  10:  { name: "ain.2",                        unit: "V",     category: "analog", multiplier: 0.001 },
  11:  { name: "ain.3",                        unit: "V",     category: "analog", multiplier: 0.001 },
  245: { name: "ain.4",                        unit: "V",     category: "analog", multiplier: 0.001 },

  // Digital extras
  4:   { name: "din.4",                        category: "digital" },
  50:  { name: "dout.3",                       category: "digital" },
  51:  { name: "dout.4",                       category: "digital" },

  // PCB temp
  70:  { name: "pcb.temperature",              unit: "°C",    category: "temperature", multiplier: 0.1 },

  // SIM / identity
  144: { name: "sd.card.status",               category: "system" },
  219: { name: "sim.ccid.part1",               category: "system" },
  220: { name: "sim.ccid.part2",               category: "system" },
  221: { name: "sim.ccid.part3",               category: "system" },
  218: { name: "sim.imsi",                     category: "system" },
  449: { name: "ignition.on.duration",         unit: "s",     category: "vehicle" },

  // ── CAN Adapter elements ── (confirmed from your JSON + screenshots)
  // Screenshot 1: Engine RPM = AVL 35 (also 1130/36/85/88/949 are alternate sources)
  35:  { name: "can.engine.rpm",               unit: "rpm",   category: "can" },
  88:  { name: "can.engine.rpm.fms",           unit: "rpm",   category: "can" },  // FMS source
  1130: { name: "can.engine.rpm.lv",           unit: "rpm",   category: "can" },  // LV-CAN source

  // Screenshot 2: Fuel consumed = AVL 107
  107: { name: "can.tracker.counted.fuel.consumed", unit: "l", category: "can", multiplier: 0.1 },

  // Screenshot 3: Engine worktime counted = AVL 103
  103: { name: "can.counted.engine.motorhours", unit: "h",   category: "can", multiplier: 0.01 },

  // From your JSON payload (matched to CAN adapter AVL IDs)
  36:  { name: "can.tracker.counted.mileage",  unit: "m",    category: "can" },
  30:  { name: "can.vehicle.speed",            unit: "km/h", category: "can" },
  31:  { name: "can.throttle.pedal.level",     unit: "%",    category: "can" },
  25:  { name: "can.engine.temperature",       unit: "°C",   category: "can", multiplier: 0.1 },
  23:  { name: "can.engine.load",              unit: "%",    category: "can" },
  37:  { name: "can.fuel.level.percent",       unit: "%",    category: "can" },
  34:  { name: "can.fuel.level.liters",        unit: "l",    category: "can", multiplier: 0.1 },
  18:  { name: "can.fuel.rate",                unit: "l/h",  category: "can", multiplier: 0.1 },
  33:  { name: "can.fuel.consumed",            unit: "l",    category: "can", multiplier: 0.1 },

  // Door status (seen in your screenshots as individual fields)
  // AVL 143 = bitmask door status, but FMC650 also sends individual bits via CAN
  143: { name: "door.open.status.bitmask",     category: "can" },

  // FMS elements (truck CAN)
  127: { name: "can.coolant.temperature",      unit: "°C",   category: "can" },
  128: { name: "can.ambient.temperature",      unit: "°C",   category: "can" },
  87:  { name: "can.fuel.level.fms",           unit: "%",    category: "can" },
  85:  { name: "can.engine.load.fms",          unit: "%",    category: "can" },
  84:  { name: "can.accelerator.position",     unit: "%",    category: "can" },
  86:  { name: "can.engine.fuel.total",        unit: "l",    category: "can" },
  104: { name: "can.engine.hours",             unit: "h",    category: "can" },
  14:  { name: "can.engine.worktime",          unit: "min",  category: "can" },
  15:  { name: "can.engine.worktime.counted",  unit: "min",  category: "can" },
  17:  { name: "can.fuel.consumed.counted",    unit: "l",    category: "can", multiplier: 0.1 },
  19:  { name: "can.adblue.level.percent",     unit: "%",    category: "can" },
  20:  { name: "can.adblue.level.liters",      unit: "l",    category: "can", multiplier: 0.1 },
  176: { name: "can.dtc.errors",               category: "can" },
  949: { name: "can.engine.rpm.alt",           unit: "rpm",  category: "can" },

  // Eco / driving
  10009: { name: "eco.score",                  category: "driving", multiplier: 0.01 },
};

// ─── Build the device-specific map ───────────────────────────────────────────

function getIOMap(deviceType: string): Record<number, IOParam> {
  const type = deviceType?.toUpperCase() || '';
  if (type.includes('FMC650') || type.includes('FMM650') || type.includes('FMB640') || type.includes('FMC640')) {
    return { ...SHARED_IO_MAP, ...FMC650_ONLY };
  }
  // FMB150, FMC150, FMM150 and similar
  return { ...SHARED_IO_MAP, ...FMB150_ONLY };
}

// ─── Apply multiplier and format value ───────────────────────────────────────

function applyMultiplier(rawValue: string, multiplier?: number): string {
  if (!multiplier) return rawValue;
  const num = parseFloat(rawValue);
  if (isNaN(num)) return rawValue;
  // Round to 3 decimal places max to avoid floating point noise
  return parseFloat((num * multiplier).toFixed(3)).toString();
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await context.params;

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
    const ioMap = getIOMap(device.device_type);

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
    const telemetryParams: any[] = [];

    // ── System params ──────────────────────────────────────────────────────
    const sysTs = gpsData?.timestamp || new Date().toISOString();
    telemetryParams.push(
      { id: 0, name: "ident",       value: device.imei,                                    category: "system", timestamp: sysTs },
      { id: 1, name: "device.name", value: device.device_name || "Unknown",                category: "system", timestamp: sysTs },
      { id: 2, name: "device.type", value: `${device.manufacturer} ${device.device_type}`, category: "system", timestamp: sysTs }
    );

    // ── GPS params ─────────────────────────────────────────────────────────
    if (gpsData) {
      const gpsFields: [string, any, string?][] = [
        ["position.latitude",    gpsData.latitude],
        ["position.longitude",   gpsData.longitude],
        ["position.altitude",    gpsData.altitude,  "m"],
        ["position.speed",       gpsData.speed,     "km/h"],
        ["position.direction",   gpsData.direction, "°"],
        ["position.satellites",  gpsData.satellites],
        ["position.hdop",        gpsData.hdop],
      ];

      for (const [name, val, unit] of gpsFields) {
        if (val != null) {
          telemetryParams.push({
            id: telemetryParams.length,
            name,
            value: val.toString(),
            unit: unit || "",
            category: "gps",
            timestamp: gpsData.timestamp,
          });
        }
      }
    }

    // ── IO params (with multiplier applied) ────────────────────────────────
    for (const io of ioData) {
      const ioId = parseInt(io.io_id);
      const mapping = ioMap[ioId];
      const rawValue = io.io_value?.toString() ?? "0";
      const displayValue = mapping?.multiplier
        ? applyMultiplier(rawValue, mapping.multiplier)
        : rawValue;

      telemetryParams.push({
        id: telemetryParams.length,
        name:      mapping ? mapping.name : `io.${ioId}`,
        value:     displayValue,
        raw_value: mapping?.multiplier ? rawValue : undefined, // expose raw if converted
        unit:      mapping?.unit || "",
        category:  mapping?.category || "unknown",
        timestamp: io.timestamp,
        io_id:     ioId,
        type:      "sensor",
      });
    }

    return NextResponse.json({
      success: true,
      data: telemetryParams,
      device_id:  deviceId,
      device_type: device.device_type,
      lastUpdate: gpsData?.timestamp || null,
      stats: {
        total_parameters:  telemetryParams.length,
        io_parameters:     ioData.length,
        gps_parameters:    gpsData ? 7 : 0,
        system_parameters: 3,
      },
    });

  } catch (error: any) {
    console.error('Telemetry fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch telemetry', message: error.message },
      { status: 500 }
    );
  }
}