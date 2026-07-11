// ============================================================================
// API ROUTE: /api/nano/live?device_id=<uuid>
// ----------------------------------------------------------------------------
// Live snapshot for a GreenVision Nano (Gen 2) device. Reads the single
// nano_device_state row (upserted on every frame by nano_ingest.py), resolves
// the 17 measured PIDs against nano_registry for names/units/categories, and
// resolves active faults against nano_alert_catalog for severity + message key.
//
// Response shape:
//   { success, data: { device, state, measured[], faults[] } }
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// state-column -> registry PID map (mirrors nano_ingest.py). `conditional` = CAN/
// Modbus values that are absent (NULL) when the source isn't reporting — never 0.
const MEASURED: Array<{ col: string; pid: string; conditional: boolean }> = [
  { col: 'cell_current', pid: 'P-4075', conditional: false },
  { col: 'supply_voltage', pid: 'P-4093', conditional: false },
  { col: 'electrode_temp', pid: 'P-4094', conditional: false },
  { col: 'ambient_temp', pid: 'P-4095', conditional: false },
  { col: 'level_main', pid: 'P-4096', conditional: false },
  { col: 'level_bubbler', pid: 'P-4097', conditional: false },
  { col: 'level_electrolyte', pid: 'P-4098', conditional: false },
  { col: 'ps_overtemp', pid: 'P-4099', conditional: false },
  { col: 'active_bearer', pid: 'P-4100', conditional: false },
  { col: 'rssi', pid: 'P-4101', conditional: false },
  { col: 'permit_state', pid: 'P-4102', conditional: false },
  { col: 'load_kw', pid: 'P-4103', conditional: true },
  { col: 'engine_rpm', pid: 'P-4104', conditional: true },
  { col: 'engine_load_pct', pid: 'P-4105', conditional: true },
  { col: 'fuel_rate_lph', pid: 'P-4106', conditional: true },
  { col: 'total_fuel_l', pid: 'P-4107', conditional: true },
  { col: 'engine_hours', pid: 'P-4108', conditional: true },
];

export async function GET(request: NextRequest) {
  try {
    const deviceId = request.nextUrl.searchParams.get('device_id');
    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: 'device_id is required' },
        { status: 400 }
      );
    }

    // Device + its live-state row (LEFT JOIN: state may not exist until first frame)
    const stateRes = await query(
      `SELECT
         d.id, d.imei, d.device_name, d.device_type, d.manufacturer,
         d.connection_status, d.protocol,
         s.device_id AS state_present,
         s.online, s.status_ts, s.net,
         s.last_ts_utc, s.last_seq, s.last_up, s.last_boot_id, s.updated_at,
         s.cell_current, s.supply_voltage, s.electrode_temp, s.ambient_temp,
         s.level_main, s.level_bubbler, s.level_electrolyte, s.ps_overtemp,
         s.active_bearer, s.rssi, s.permit_state,
         s.load_kw, s.engine_rpm, s.engine_load_pct, s.fuel_rate_lph,
         s.total_fuel_l, s.engine_hours,
         s.last_lat, s.last_lon, s.gps_fix, s.gps_sat,
         s.active_faults, s.d AS raw_d
       FROM devices d
       LEFT JOIN nano_device_state s ON s.device_id = d.id
       WHERE d.id = $1 AND d.deleted_at IS NULL`,
      [deviceId]
    );

    if (stateRes.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      );
    }
    const row = stateRes.rows[0];

    // Registry lookup for the measured PIDs (name / unit / category)
    const regRes = await query(
      `SELECT pid, name, units, category, data_type
         FROM nano_registry WHERE pid = ANY($1)`,
      [MEASURED.map((m) => m.pid)]
    );
    const reg: Record<string, any> = {};
    regRes.rows.forEach((r: any) => (reg[r.pid] = r));

    const measured = MEASURED.map((m) => {
      const r = reg[m.pid] || {};
      const value = row[m.col];
      return {
        pid: m.pid,
        name: r.name || m.col,
        value,
        unit: r.units ?? null,
        category: r.category ?? 'Other',
        data_type: r.data_type ?? null,
        conditional: m.conditional,
        present: value !== null && value !== undefined,
      };
    });

    // Active faults resolved from the catalog (ordered by severity)
    const faultCodes: string[] = Array.isArray(row.active_faults) ? row.active_faults : [];
    let faults: any[] = [];
    if (faultCodes.length > 0) {
      const fRes = await query(
        `SELECT alert_id, severity, severity_rank, category, message_key, condition
           FROM nano_alert_catalog WHERE alert_id = ANY($1)
          ORDER BY severity_rank DESC`,
        [faultCodes]
      );
      const byId: Record<string, any> = {};
      fRes.rows.forEach((r: any) => (byId[r.alert_id] = r));
      faults = faultCodes.map(
        (code) =>
          byId[code] || {
            alert_id: code,
            severity: 'Unknown',
            severity_rank: 0,
            category: null,
            message_key: null,
            condition: null,
          }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        device: {
          id: row.id,
          imei: row.imei,
          device_name: row.device_name,
          device_type: row.device_type,
          manufacturer: row.manufacturer,
          connection_status: row.connection_status,
          protocol: row.protocol,
        },
        state: row.state_present
          ? {
              online: row.online,
              status_ts: row.status_ts,
              net: row.net,
              last_ts_utc: row.last_ts_utc,
              last_seq: row.last_seq,
              last_up: row.last_up,
              last_boot_id: row.last_boot_id,
              updated_at: row.updated_at,
              gps: {
                fix: row.gps_fix,
                sat: row.gps_sat,
                lat: row.last_lat,
                lon: row.last_lon,
              },
              raw_d: row.raw_d,
            }
          : null,
        measured,
        faults,
      },
    });
  } catch (error: any) {
    console.error('Error fetching nano live snapshot:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch nano live snapshot', message: error.message },
      { status: 500 }
    );
  }
}