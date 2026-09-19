// ============================================================================
// API ROUTE: /api/nano/live?device_id=<uuid>
// ----------------------------------------------------------------------------
// Live snapshot for a GreenVision Nano device — Gen 2 or NanoV3, which share
// the topic, the IMEI and this table. Reads the single nano_device_state row
// (upserted on every frame by nano_ingest.py), works out which firmware sent
// the last frame from the PIDs it carried, resolves the measured PIDs against
// nano_registry for names/units/categories (falling back to lib/nano-pids for
// PIDs the registry doesn't know yet), and resolves active faults against
// nano_alert_catalog for severity + message key.
//
// Only the PIDs the reporting generation actually publishes are returned, so
// a NanoV3 unit doesn't show a row of permanently-empty Gen 2 values and vice
// versa. Level-sensor names follow the generation (Gen 2: "level low" = true
// is a water short; NanoV3: "water present" = true is OK).
//
// Response shape:
//   { success, data: { device, state{ ..., firmware }, measured[], faults[] } }
//
// ?compact=1 -> device + state only (skips the registry / catalog lookups).
//               Used by the Nano detail header for its "last seen" clock.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { detectVariant, pidMeta, NanoVariant } from '@/lib/nano-pids';

// state-column -> registry PID map (mirrors nano_ingest.py). `conditional` = CAN/
// Modbus/optional-sensor values that are absent (NULL) when the source isn't
// reporting — never 0. `gen` = which firmware publishes it ('both' | 'gen2' | 'v3').
type Gen = 'both' | 'gen2' | 'v3';
const MEASURED: Array<{ col: string; pid: string; conditional: boolean; gen: Gen }> = [
  { col: 'cell_current', pid: 'P-4075', conditional: false, gen: 'both' },
  { col: 'supply_voltage', pid: 'P-4093', conditional: false, gen: 'both' },
  { col: 'rcs_setpoint', pid: 'P-802', conditional: false, gen: 'v3' },
  { col: 'electrode_temp', pid: 'P-4094', conditional: false, gen: 'gen2' },
  { col: 'ambient_temp', pid: 'P-4095', conditional: false, gen: 'gen2' },
  { col: 'electrolyser_temp', pid: 'P-4118', conditional: true, gen: 'v3' },
  { col: 'temp_present', pid: 'P-4119', conditional: false, gen: 'v3' },
  { col: 'level_main', pid: 'P-4096', conditional: false, gen: 'both' },
  { col: 'level_bubbler', pid: 'P-4097', conditional: false, gen: 'both' },
  { col: 'level_electrolyte', pid: 'P-4098', conditional: false, gen: 'both' },
  { col: 'pump1', pid: 'P-4110', conditional: false, gen: 'v3' },
  { col: 'pump2', pid: 'P-4111', conditional: false, gen: 'v3' },
  { col: 'solenoid', pid: 'P-4112', conditional: false, gen: 'v3' },
  { col: 'engine_run', pid: 'P-4113', conditional: false, gen: 'v3' },
  { col: 'remote_stop', pid: 'P-4114', conditional: false, gen: 'v3' },
  { col: 'thermal_lockout', pid: 'P-4120', conditional: false, gen: 'v3' },
  { col: 'jacket_on', pid: 'P-4121', conditional: false, gen: 'v3' },
  { col: 'jacket_fault', pid: 'P-4122', conditional: true, gen: 'v3' },
  { col: 'rcs_zone', pid: 'P-5250', conditional: true, gen: 'v3' },
  { col: 'rcs_reason', pid: 'P-5251', conditional: true, gen: 'v3' },
  { col: 'ps_overtemp', pid: 'P-4099', conditional: false, gen: 'gen2' },
  { col: 'active_bearer', pid: 'P-4100', conditional: false, gen: 'both' },
  { col: 'rssi', pid: 'P-4101', conditional: false, gen: 'both' },
  { col: 'permit_state', pid: 'P-4102', conditional: false, gen: 'gen2' },
  { col: 'load_kw', pid: 'P-4103', conditional: true, gen: 'gen2' },
  { col: 'engine_rpm', pid: 'P-4104', conditional: true, gen: 'both' },
  { col: 'engine_load_pct', pid: 'P-4105', conditional: true, gen: 'both' },
  { col: 'fuel_rate_lph', pid: 'P-4106', conditional: true, gen: 'both' },
  { col: 'total_fuel_l', pid: 'P-4107', conditional: true, gen: 'both' },
  { col: 'engine_hours', pid: 'P-4108', conditional: true, gen: 'both' },
  { col: 'vehicle_speed_kph', pid: 'P-4115', conditional: true, gen: 'v3' },
  { col: 'coolant_temp', pid: 'P-4116', conditional: true, gen: 'v3' },
  { col: 'fuel_level_pct', pid: 'P-4117', conditional: true, gen: 'v3' },
];

// Which generation's PIDs to show for a detected variant. Unknown (no frame
// yet, or neither marker present) shows everything so nothing is hidden.
function showsGen(variant: NanoVariant, gen: Gen): boolean {
  if (gen === 'both' || variant === 'unknown') return true;
  return gen === variant;
}

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
         s.rcs_setpoint, s.pump1, s.pump2, s.solenoid, s.engine_run, s.remote_stop,
         s.vehicle_speed_kph, s.coolant_temp, s.fuel_level_pct,
         s.electrolyser_temp, s.temp_present, s.thermal_lockout,
         s.jacket_on, s.jacket_fault, s.rcs_zone, s.rcs_reason,
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

    const device = {
      id: row.id,
      imei: row.imei,
      device_name: row.device_name,
      device_type: row.device_type,
      manufacturer: row.manufacturer,
      connection_status: row.connection_status,
      protocol: row.protocol,
    };

    const firmware: NanoVariant = detectVariant(row.raw_d);

    const state = row.state_present
      ? {
          firmware,
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
      : null;

    // Header-only callers just need the freshness clock — skip the extra queries.
    if (request.nextUrl.searchParams.get('compact') === '1') {
      return NextResponse.json({
        success: true,
        data: { device, state, measured: [], faults: [] },
      });
    }

    // Registry lookup for the measured PIDs (name / unit / category)
    const regRes = await query(
      `SELECT pid, name, units, category, data_type
         FROM nano_registry WHERE pid = ANY($1)`,
      [MEASURED.map((m) => m.pid)]
    );
    const reg: Record<string, any> = {};
    regRes.rows.forEach((r: any) => (reg[r.pid] = r));

    const measured = MEASURED.filter((m) => showsGen(firmware, m.gen)).map((m) => {
      const r = reg[m.pid] || {};
      const local = pidMeta(m.pid, firmware);
      const value = row[m.col];
      // NanoV3 level PIDs carry the opposite polarity to the Gen 2 registry
      // name ("... Level Low"), so the local name wins for those; otherwise the
      // registry is authoritative and lib/nano-pids only fills gaps.
      const levelV3 = firmware === 'v3' && ['P-4096', 'P-4097', 'P-4098'].includes(m.pid);
      return {
        pid: m.pid,
        name: (levelV3 ? local?.name : r.name) || local?.name || m.col,
        value,
        unit: r.units ?? local?.unit ?? null,
        category: r.category ?? 'Other',
        data_type: r.data_type ?? null,
        conditional: m.conditional,
        bool_kind: local?.bool ?? null,
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
      data: { device, state, measured, faults },
    });
  } catch (error: any) {
    console.error('Error fetching nano live snapshot:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch nano live snapshot', message: error.message },
      { status: 500 }
    );
  }
}