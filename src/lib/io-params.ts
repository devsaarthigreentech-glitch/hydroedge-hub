// ============================================================================
// IO parameters offered in the Logs & Messages tab
// ----------------------------------------------------------------------------
// Shared by the tab (table + filters) and /api/io-logs/[deviceId]/export so the
// CSV columns, units and scaling always match what the table shows.
// ============================================================================

export interface IOParam {
  io_id: number;
  name: string;
  unit: string;
  multiplier?: number;
}

export const COMMON_PARAMS: IOParam[] = [
  { io_id: 216, name: "vehicle.mileage", unit: "m" },
  { io_id: 16, name: "total.odometer", unit: "m" },
  { io_id: 18, name: "can.fuel.rate", unit: "l/hr", multiplier: 0.1 },
  { io_id: 9, name: "ain.1", unit: "V", multiplier: 0.001 },
  { io_id: 10, name: "ain.2", unit: "V", multiplier: 0.001 },
  { io_id: 11, name: "ain.3", unit: "V", multiplier: 0.001 },
  { io_id: 245, name: "ain.4", unit: "V", multiplier: 0.001 },
  { io_id: 179, name: "dout.1", unit: "" },
  { io_id: 180, name: "dout.2", unit: "" },
  { io_id: 1, name: "din.1", unit: "" },
  { io_id: 2, name: "din.2", unit: "" },
  { io_id: 3, name: "din.3", unit: "" },
  { io_id: 4, name: "din.4", unit: "" },
  { io_id: 67, name: "battery.voltage", unit: "V", multiplier: 0.001 },
  { io_id: 66, name: "external.voltage", unit: "V", multiplier: 0.001 },
  { io_id: 68, name: "battery.current", unit: "mA" },
  { io_id: 12, name: "fuel.used.gps", unit: "l", multiplier: 0.001 },
  { io_id: 13, name: "fuel.rate.gps", unit: "l/100km", multiplier: 0.01 },
  { io_id: 34, name: "can.fuel.level.liters", unit: "l", multiplier: 0.1 },
  { io_id: 35, name: "can.engine.rpm", unit: "rpm" },
  { io_id: 36, name: "can.tracker.counted.mileage", unit: "m" },
  { io_id: 24, name: "vehicle.speed", unit: "km/h" },
  { io_id: 239, name: "ignition.status", unit: "" },
  { io_id: 240, name: "movement.status", unit: "" },
  { io_id: 199, name: "trip.odometer", unit: "m" },
  { io_id: 21, name: "gsm.signal.level", unit: "%" },
];

// Widest window the logs tab may query or export.
export const MAX_RANGE_DAYS = 31;

export function getParam(ioId: number): IOParam | undefined {
  return COMMON_PARAMS.find((p) => p.io_id === ioId);
}

export function paramLabel(ioId: number): string {
  const p = getParam(ioId);
  const name = p?.name || `io.${ioId}`;
  return p?.unit ? `${name} (${p.unit})` : name;
}

/** Raw DB value → display value (multiplier applied, float noise trimmed). */
export function formatIOValue(ioId: number, raw: string): string {
  const p = getParam(ioId);
  if (!p?.multiplier) return raw;
  const num = parseFloat(raw);
  if (isNaN(num)) return raw;
  return parseFloat((num * p.multiplier).toFixed(3)).toString();
}
