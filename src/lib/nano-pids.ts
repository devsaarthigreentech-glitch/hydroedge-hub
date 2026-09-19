// ============================================================================
// lib/nano-pids.ts — measured-PID metadata shared by the Nano API + tabs
// ----------------------------------------------------------------------------
// Two firmware generations publish to the same sgt/nano/<imei>/tel topic and
// the same device row, so the UI has to read a frame and work out which one
// sent it:
//
//   gen2  nano-iot-firmware-v2  — control/safety stack on the ESP32: permit
//         state (P-4102), electrode/ambient temps (P-4094/4095), PS over-temp
//         (P-4099). Level PIDs mean "level LOW" (true = water short).
//   v3    NanoV3 — gateway beside the vendor analog box: pump/solenoid/engine
//         status (P-4110..4113), remote-stop output (P-4114), RCS set-point
//         (P-802), PT100 temp (P-4118/4119), thermal lockout (P-4120), heating
//         jacket (P-4121/4122), adaptive RCS (P-5250/5251). Level PIDs mean
//         "water PRESENT" (true = OK) — the opposite polarity to gen2.
//
// Detection is by key presence, not by schema version (`v` is 2 on both).
// ============================================================================

export type NanoVariant = 'gen2' | 'v3' | 'unknown';

/** Which firmware built this frame's `d` object. */
export function detectVariant(d: Record<string, unknown> | null | undefined): NanoVariant {
  if (!d) return 'unknown';
  if ('P-4114' in d || 'P-4110' in d || 'P-4113' in d) return 'v3';
  if ('P-4102' in d || 'P-4099' in d || 'P-4094' in d) return 'gen2';
  return 'unknown';
}

/**
 * How to colour a boolean: which value is the noteworthy one.
 *   alarm  — true is bad (remote stop asserted, lockout, fault)
 *   ok     — true is good (water present, sensor present)
 *   active — true just means "on" (pump running, jacket on, engine running)
 */
export type BoolKind = 'alarm' | 'ok' | 'active';

export interface PidMeta {
  name: string;
  unit?: string;
  bool?: BoolKind;
  /** CAN / optional-sensor value: absent from the frame when not reporting. */
  conditional?: boolean;
}

/** Metadata for every measured PID either generation publishes. */
export const PID_META: Record<string, PidMeta> = {
  // ---- common to both --------------------------------------------------
  'P-4075': { name: 'Cell Current', unit: 'A' },
  'P-4093': { name: 'Supply Voltage', unit: 'V' },
  'P-4100': { name: 'Active Bearer' },
  'P-4101': { name: 'RSSI', unit: 'dBm' },
  'P-4104': { name: 'Engine RPM', unit: 'rpm', conditional: true },
  'P-4105': { name: 'Engine Load', unit: '%', conditional: true },
  'P-4106': { name: 'Fuel Rate', unit: 'L/h', conditional: true },
  'P-4107': { name: 'Total Fuel', unit: 'L', conditional: true },
  'P-4108': { name: 'Engine Hours', unit: 'h', conditional: true },

  // ---- gen2 only ---------------------------------------------------------
  'P-4094': { name: 'Electrode Temp', unit: '°C' },
  'P-4095': { name: 'Ambient Temp', unit: '°C' },
  'P-4099': { name: 'PS Over-Temp', bool: 'alarm' },
  'P-4102': { name: 'Permit State' },
  'P-4103': { name: 'Load', unit: 'kW', conditional: true },

  // ---- level sensors: polarity differs per generation (see levelMeta) ----
  'P-4096': { name: 'Main Level Low', bool: 'alarm' },
  'P-4097': { name: 'Bubbler Level Low', bool: 'alarm' },
  'P-4098': { name: 'Electrolyte Level Low', bool: 'alarm' },

  // ---- v3 only -----------------------------------------------------------
  'P-802':  { name: 'RCS Set-point', unit: 'A' },
  'P-4110': { name: 'Pump 1 Running', bool: 'active' },
  'P-4111': { name: 'Pump 2 Running', bool: 'active' },
  'P-4112': { name: 'Solenoid Valve Open', bool: 'active' },
  'P-4113': { name: 'Engine Running', bool: 'active' },
  'P-4114': { name: 'Remote Stop Asserted', bool: 'alarm' },
  'P-4115': { name: 'Vehicle Speed', unit: 'km/h', conditional: true },
  'P-4116': { name: 'Coolant Temp', unit: '°C', conditional: true },
  'P-4117': { name: 'Fuel Level', unit: '%', conditional: true },
  'P-4118': { name: 'Electrolyser Temp', unit: '°C', conditional: true },
  'P-4119': { name: 'Temp Sensor Present', bool: 'ok' },
  'P-4120': { name: 'Thermal Lockout', bool: 'alarm' },
  'P-4121': { name: 'Heating Jacket On', bool: 'active' },
  'P-4122': { name: 'Heating Jacket Fault', bool: 'alarm', conditional: true },
  'P-5250': { name: 'Auto-RCS Zone', conditional: true },
  'P-5251': { name: 'Auto-RCS Reason', conditional: true },
};

const V3_LEVEL_NAMES: Record<string, string> = {
  'P-4096': 'Main Tank Water Present',
  'P-4097': 'Bubbler Water Present',
  'P-4098': 'Electrolyser Water Present',
};

/** PID metadata resolved for a specific firmware variant (fixes level polarity). */
export function pidMeta(pid: string, variant: NanoVariant): PidMeta | undefined {
  const m = PID_META[pid];
  if (!m) return undefined;
  if (variant === 'v3' && pid in V3_LEVEL_NAMES) {
    return { ...m, name: V3_LEVEL_NAMES[pid], bool: 'ok' };
  }
  return m;
}

/** Human label for a boolean value given its kind (used by both tabs). */
export function boolLabel(v: boolean, kind: BoolKind | undefined): { text: string; color?: string } {
  if (kind === 'ok')     return v ? { text: 'YES', color: '#16a34a' } : { text: 'NO', color: '#ef4444' };
  if (kind === 'active') return v ? { text: 'ON', color: '#2563eb' } : { text: 'OFF' };
  // alarm (default): true is the noteworthy state
  return v ? { text: 'TRUE', color: '#ef4444' } : { text: 'FALSE' };
}
