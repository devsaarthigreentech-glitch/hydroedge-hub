// // ============================================================================
// // TELEMETRY PERMISSIONS — Controls which IO params each customer type sees
// // ============================================================================
// // Layer 1: Device type → all known params, each tagged with a tier
// // Layer 2: Customer type → which tier(s) they can see
// //
// // Tiers:
// //   "basic"    — essential monitoring (speed, location, battery, ignition)
// //   "standard" — basic + operational params (temps, fuel, CAN basics)
// //   "full"     — everything the device sends (raw IO, diagnostics, debug)
// //
// // Admin panel always shows everything regardless.
// // ============================================================================

// export type ParamTier = 'basic' | 'standard' | 'full';

// export interface ParamDefinition {
//   name: string;
//   unit?: string;
//   tier: ParamTier;
//   category: string;   // for grouping in the UI
// }

// // ============================================================================
// // DEVICE PARAM DEFINITIONS
// // ============================================================================
// // Each device type has its own IO ID mapping.
// // The "tier" on each param controls who can see it.
// // ============================================================================

// const FMC650_PARAMS: Record<number, ParamDefinition> = {
//   // ── Basic tier: every customer sees these ──
//   // Power
//   66:  { name: 'External voltage',    unit: 'V',   tier: 'basic',    category: 'Power' },
//   67:  { name: 'Battery voltage',     unit: 'V',   tier: 'basic',    category: 'Power' },
//   68:  { name: 'Battery current',     unit: 'mA',  tier: 'basic',    category: 'Power' },

//   // Movement
//   239: { name: 'Ignition',                         tier: 'basic',    category: 'Movement' },
//   240: { name: 'Movement',                         tier: 'basic',    category: 'Movement' },
//   199: { name: 'Trip odometer',       unit: 'km',  tier: 'basic',    category: 'Movement' },

//   // GNSS
//   21:  { name: 'GSM signal',                       tier: 'basic',    category: 'GNSS' },
//   69:  { name: 'GNSS status',                      tier: 'basic',    category: 'GNSS' },
//   181: { name: 'GNSS PDOP',                        tier: 'basic',    category: 'GNSS' },
//   182: { name: 'GNSS HDOP',                        tier: 'basic',    category: 'GNSS' },

//   // ── Standard tier: partners + dealers see these too ──
//   // Digital IO
//   1:   { name: 'Digital input 1',                  tier: 'standard', category: 'Digital IO' },
//   2:   { name: 'Digital input 2',                  tier: 'standard', category: 'Digital IO' },
//   3:   { name: 'Digital input 3',                  tier: 'standard', category: 'Digital IO' },
//   179: { name: 'Digital output 1',                 tier: 'standard', category: 'Digital IO' },
//   180: { name: 'Digital output 2',                 tier: 'standard', category: 'Digital IO' },
//   50:  { name: 'Digital output 3',                 tier: 'standard', category: 'Digital IO' },
//   51:  { name: 'Digital output 4',                 tier: 'standard', category: 'Digital IO' },

//   // Analog
//   9:   { name: 'Analog input 1',      unit: 'mV',  tier: 'standard', category: 'Analog' },
//   10:  { name: 'Analog input 2',      unit: 'mV',  tier: 'standard', category: 'Analog' },
//   11:  { name: 'Analog input 3',      unit: 'mV',  tier: 'standard', category: 'Analog' },
//   245: { name: 'Analog input 4',      unit: 'mV',  tier: 'standard', category: 'Analog' },

//   // Temperature
//   72:  { name: 'Dallas temp 1',       unit: '°C',  tier: 'standard', category: 'Temperature' },
//   73:  { name: 'Dallas temp 2',       unit: '°C',  tier: 'standard', category: 'Temperature' },
//   74:  { name: 'Dallas temp 3',       unit: '°C',  tier: 'standard', category: 'Temperature' },
//   75:  { name: 'Dallas temp 4',       unit: '°C',  tier: 'standard', category: 'Temperature' },

//   // ── Full tier: dealers + admin only ──
//   // Dallas IDs
//   62:  { name: 'Dallas ID 1',                      tier: 'full',     category: 'Sensors' },
//   63:  { name: 'Dallas ID 2',                      tier: 'full',     category: 'Sensors' },
//   64:  { name: 'Dallas ID 3',                      tier: 'full',     category: 'Sensors' },
//   65:  { name: 'Dallas ID 4',                      tier: 'full',     category: 'Sensors' },

//   // Network / Debug
//   22:  { name: 'Data mode',                        tier: 'full',     category: 'Network' },
//   1148:{ name: 'Connectivity quality',             tier: 'full',     category: 'Network' },
//   108: { name: 'LED indication',                   tier: 'full',     category: 'Device' },
//   241: { name: 'Operator code',                    tier: 'full',     category: 'Network' },

//   // Counters / Diagnostics
//   10493:{ name: 'DTC DM1',                         tier: 'full',     category: 'Diagnostics' },
//   10495:{ name: 'DTC DM2',                         tier: 'full',     category: 'Diagnostics' },
//   10912:{ name: 'Impulse counter 3',               tier: 'full',     category: 'Diagnostics' },
//   10913:{ name: 'Impulse counter 3 freq', unit:'Hz',tier: 'full',    category: 'Diagnostics' },
//   10914:{ name: 'Impulse counter 3 RPM', unit:'rpm',tier: 'full',    category: 'Diagnostics' },
// };

// const FMB150_PARAMS: Record<number, ParamDefinition> = {
//   // ── Basic tier ──
//   66:  { name: 'External voltage',    unit: 'V',   tier: 'basic',    category: 'Power' },
//   67:  { name: 'Battery voltage',     unit: 'V',   tier: 'basic',    category: 'Power' },
//   68:  { name: 'Battery current',     unit: 'A',   tier: 'basic',    category: 'Power' },

//   239: { name: 'Ignition',                         tier: 'basic',    category: 'Movement' },
//   240: { name: 'Movement',                         tier: 'basic',    category: 'Movement' },
//   199: { name: 'Trip odometer',       unit: 'km',  tier: 'basic',    category: 'Movement' },

//   21:  { name: 'GSM signal',                       tier: 'basic',    category: 'GNSS' },
//   69:  { name: 'GNSS status',                      tier: 'basic',    category: 'GNSS' },
//   181: { name: 'GNSS PDOP',                        tier: 'basic',    category: 'GNSS' },
//   182: { name: 'GNSS HDOP',                        tier: 'basic',    category: 'GNSS' },

//   // ── Standard tier ──
//   1:   { name: 'Digital input 1',                  tier: 'standard', category: 'Digital IO' },
//   2:   { name: 'Digital input 2',                  tier: 'standard', category: 'Digital IO' },
//   3:   { name: 'Digital input 3',                  tier: 'standard', category: 'Digital IO' },
//   179: { name: 'Digital output 1',                 tier: 'standard', category: 'Digital IO' },
//   180: { name: 'Digital output 2',                 tier: 'standard', category: 'Digital IO' },

//   9:   { name: 'Analog input 1',      unit: 'mV',  tier: 'standard', category: 'Analog' },

//   // Temperature
//   72:  { name: 'Dallas temp 1',       unit: '°C',  tier: 'standard', category: 'Temperature' },
//   73:  { name: 'Dallas temp 2',       unit: '°C',  tier: 'standard', category: 'Temperature' },
//   74:  { name: 'Dallas temp 3',       unit: '°C',  tier: 'standard', category: 'Temperature' },
//   75:  { name: 'Dallas temp 4',       unit: '°C',  tier: 'standard', category: 'Temperature' },

//   // Fuel (FMB150 exclusive)
//   12:  { name: 'Fuel used GPS',       unit: 'L',   tier: 'standard', category: 'Fuel' },
//   13:  { name: 'Fuel rate GPS',       unit: 'L/h', tier: 'standard', category: 'Fuel' },

//   // LLS Fuel sensors
//   201: { name: 'LLS fuel level 1',    unit: '%',   tier: 'standard', category: 'Fuel' },
//   202: { name: 'LLS fuel level 2',    unit: '%',   tier: 'standard', category: 'Fuel' },
//   203: { name: 'LLS fuel level 3',    unit: '%',   tier: 'standard', category: 'Fuel' },

//   // ── Full tier ──
//   76:  { name: 'Dallas ID 1',                      tier: 'full',     category: 'Sensors' },
//   77:  { name: 'Dallas ID 2',                      tier: 'full',     category: 'Sensors' },
//   79:  { name: 'Dallas ID 3',                      tier: 'full',     category: 'Sensors' },
//   71:  { name: 'Dallas ID 4',                      tier: 'full',     category: 'Sensors' },

//   80:  { name: 'Data mode',                        tier: 'full',     category: 'Network' },
//   108: { name: 'LED indication',                   tier: 'full',     category: 'Device' },
//   241: { name: 'Operator code',                    tier: 'full',     category: 'Network' },
// };

// // Add more device types as needed
// const FMB920_PARAMS: Record<number, ParamDefinition> = {
//   ...FMB150_PARAMS, // FMB920 is similar to FMB150, override differences below
// };

// const FMB125_PARAMS: Record<number, ParamDefinition> = {
//   ...FMB150_PARAMS,
// };

// // ============================================================================
// // DEVICE TYPE → PARAM MAP REGISTRY
// // ============================================================================

// const DEVICE_PARAMS: Record<string, Record<number, ParamDefinition>> = {
//   FMC650: FMC650_PARAMS,
//   FMB150: FMB150_PARAMS,
//   FMB920: FMB920_PARAMS,
//   FMB125: FMB125_PARAMS,
// };

// // ============================================================================
// // CUSTOMER TYPE → TIER MAPPING
// // ============================================================================
// // Which tiers each customer type can see.
// // "basic" is always included. Higher tiers add more params.
// // ============================================================================

// const TIER_HIERARCHY: ParamTier[] = ['basic', 'standard', 'full'];

// const CUSTOMER_TIER: Record<string, ParamTier> = {
//   customer: 'basic',      // end customers see essential params only
//   vendor:   'basic',      // vendors same as customers
//   partner:  'standard',   // partners see operational params
//   dealer:   'full',       // dealers see everything
// };

// // ============================================================================
// // HELPER FUNCTIONS
// // ============================================================================

// /**
//  * Get the max tier for a customer type.
//  * Returns 'basic' for unknown types (safest default).
//  */
// export function getCustomerTier(customerType: string): ParamTier {
//   return CUSTOMER_TIER[customerType] || 'basic';
// }

// /**
//  * Check if a tier is visible at a given access level.
//  * e.g., "standard" access can see "basic" + "standard" params.
//  */
// function isTierVisible(paramTier: ParamTier, accessTier: ParamTier): boolean {
//   const paramLevel = TIER_HIERARCHY.indexOf(paramTier);
//   const accessLevel = TIER_HIERARCHY.indexOf(accessTier);
//   return paramLevel <= accessLevel;
// }

// /**
//  * Get param definition for a specific IO ID on a device type.
//  * Returns undefined if the param isn't mapped (unknown IO).
//  */
// export function getParamDef(
//   deviceType: string,
//   ioId: number
// ): ParamDefinition | undefined {
//   const params = DEVICE_PARAMS[deviceType];
//   if (!params) return undefined;
//   return params[ioId];
// }

// /**
//  * Filter telemetry data based on customer type and device type.
//  * This is the main function you call in TelemetryTab.
//  *
//  * @param telemetry - raw telemetry array from API
//  * @param deviceType - e.g. "FMC650", "FMB150"
//  * @param customerType - e.g. "customer", "dealer", or undefined for admin
//  * @returns filtered telemetry array
//  */
// export function filterTelemetry(
// //   telemetry: Array<{ io_id: number; io_value: any; [key: string]: any }>,
// //   deviceType: string,
// //   customerType?: string
// telemetry: any[],
// deviceType: string,
// customerType?: string
// ): any[] {
// //   io_id: number;
// //   io_value: any;
// //   name: string;
// //   unit?: string;
// //   category: string;
// //   tier: ParamTier;
// //   [key: string]: any;
// // } {
//   // Admin (no customerType) sees everything
//   const accessTier: ParamTier = customerType
//     ? getCustomerTier(customerType)
//     : 'full';

//   const deviceParams = DEVICE_PARAMS[deviceType] || {};

//   return telemetry
//     .map((item) => {
//         const ioId = item.io_id ?? item.id;
//       const def = deviceParams[ioId];
//       if (!def) {
//         // Unknown IO ID — only show to "full" tier (dealers/admin)
//         return accessTier === 'full'
//           ? {
//               ...item,
//               name: `IO ${item.io_id}`,
//               category: 'Unknown',
//               tier: 'full' as ParamTier,
//             }
//           : null;
//       }
//       // Check if this param's tier is visible at the customer's access level
//       if (!isTierVisible(def.tier, accessTier)) {
//         return null;
//       }
//       return {
//         ...item,
//         name: def.name,
//         unit: def.unit,
//         category: def.category,
//         tier: def.tier,
//       };
//     })
//     .filter((item): item is NonNullable<typeof item> => item !== null);
// }

// /**
//  * Get all known param definitions for a device type, filtered by tier.
//  * Useful for showing "available parameters" in admin UI.
//  */
// export function getDeviceParams(
//   deviceType: string,
//   customerType?: string
// ): Array<{ io_id: number } & ParamDefinition> {
//   const deviceParams = DEVICE_PARAMS[deviceType] || {};
//   const accessTier: ParamTier = customerType
//     ? getCustomerTier(customerType)
//     : 'full';

//   return Object.entries(deviceParams)
//     .filter(([_, def]) => isTierVisible(def.tier, accessTier))
//     .map(([id, def]) => ({
//       io_id: Number(id),
//       ...def,
//     }))
//     .sort((a, b) => a.category.localeCompare(b.category) || a.io_id - b.io_id);
// }
// ============================================================================
// TELEMETRY PERMISSIONS — Filters params by name based on customer type
// ============================================================================
// Your /api/telemetry/[deviceId] already resolves IO IDs into names like
// "battery.voltage", "can.engine.rpm", "position.speed" etc.
// This file filters those named params by customer tier.
//
// Tiers:
//   "basic"    — essentials only (location, speed, mileage, power)
//   "standard" — basic + operational (temps, fuel, digital IO, CAN)
//   "full"     — everything including system/debug/unknown
//
// Admin always sees everything.
// ============================================================================

export type ParamTier = 'basic' | 'standard' | 'full';

// ============================================================================
// CUSTOMER TYPE → TIER
// ============================================================================

const CUSTOMER_TIER: Record<string, ParamTier> = {
  customer: 'basic',
  vendor:   'basic',
  partner:  'standard',
  dealer:   'full',
};

// ============================================================================
// TIER DEFINITIONS — which param names each tier can see
// ============================================================================
// Patterns ending with "." are PREFIX matches:
//   "can." matches "can.engine.rpm", "can.fuel.rate", etc.
// Everything else is an EXACT match:
//   "battery.voltage" matches only "battery.voltage"
// ============================================================================

const BASIC_PARAMS: string[] = [
  // Location & movement
  'position.latitude',
  'position.longitude',
  'position.speed',

  // Mileage
  'vehicle.mileage',
  'segment.vehicle.mileage',

  // Power (battery + external only)
  'battery.voltage',
  'external.powersource.voltage',

  // Engine basics
  'engine.ignition.status',
  'movement.status',
];

const STANDARD_PARAMS: string[] = [
  // Everything in basic is included automatically, plus:

  // Digital & analog IO
  'din.',
  'dout.',
  'ain.',

  // Temperature sensors
  'dallas.temp.',

  // Fuel (GPS-based and LLS)
  'gps.fuel.',
  'lls.',

  // All CAN bus data
  'can.',

  // GPS quality
  'position.hdop',
  'position.pdop',

  // Battery extras
  'battery.current',
  'battery.level',

  // GSM signal
  'gsm.signal.level',

  // Vehicle / motion
  'accelerometer.',

  // System params (ident, device.name, device.type)
  'ident',
  'device.name',
  'device.type',
];

// Full tier: everything passes through (no list needed)

// ============================================================================
// MATCHING LOGIC
// ============================================================================

function matchesAny(paramName: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    if (pattern.endsWith('.')) {
      return paramName.startsWith(pattern);
    }
    return paramName === pattern;
  });
}

function isParamVisible(paramName: string, tier: ParamTier): boolean {
  if (tier === 'full') return true;
  if (matchesAny(paramName, BASIC_PARAMS)) return true;
  if (tier === 'standard' && matchesAny(paramName, STANDARD_PARAMS)) return true;
  return false;
}

// ============================================================================
// MAIN FILTER FUNCTION
// ============================================================================

export function getCustomerTier(customerType: string): ParamTier {
  return CUSTOMER_TIER[customerType] || 'basic';
}

/**
 * Filter telemetry params based on customer type.
 *
 * @param telemetry - array from /api/telemetry response
 * @param deviceType - kept for API compatibility (not used for filtering)
 * @param customerType - "customer" | "vendor" | "partner" | "dealer" | undefined (admin)
 */
export function filterTelemetry(
  telemetry: any[],
  deviceType: string,
  customerType?: string
): any[] {
    // Admin (no customerType) sees everything
  if (!customerType) return telemetry;


  const tier = getCustomerTier(customerType);
  if (tier === 'full') return telemetry;

  return telemetry.filter(param =>
    isParamVisible(param.name || '', tier)
  );
}