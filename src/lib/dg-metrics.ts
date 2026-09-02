// ============================================================================
// DG METRICS — what a stationary diesel generator can actually tell us
// ----------------------------------------------------------------------------
// A DG is not a vehicle. Distance, trips, idle time and fuel economy are all
// meaningless for it, and the fleet Analytics tab reported all four. What a
// genset has is a run-status contact and a current transducer:
//
//   Din.1 (IO 1)   engine running     → run time, starts, run lengths
//   Ain.1 (IO 9)   output current     → time actually under load, amps
//   IO 66 / 67     supply / battery   → tracker power health
//   IO 21          GSM signal         → connectivity
//   gps_records    position           → it should not move; flag it if it does
//
// There is deliberately NO fuel figure here. Fuel would have to come from a CAN
// adapter on the genset controller, and these units do not have one — see the
// CAN_ADAPTER_IO_MAP note in src/app/api/telemetry/[deviceId]/route.ts for what
// happens when IO 18 is read as fuel on a device that has no adapter.
//
// ── Why this is four small queries, not one big one ─────────────────────────
// It started as a single statement with eight CTEs. On a 46 GB / 314 M-row
// io_records table sharing a 1 vCPU host with the GPS ingest, that is one long
// statement — and one timeout took the whole tab down with "Error: timeout
// exceeded", including the engine run time, which is the only number anyone
// actually opened the tab for.
//
// Now each group of signals is its own statement and the caller settles them
// independently: a slow current query costs you the output tiles, not the page.
// Each is a single-IO range scan, which is exactly the shape
// idx_io_records_device_io_ts (device_id, io_id, timestamp) serves — see
// db/migrations/002. If that index has not been built, these are still slow;
// building it is the single biggest win available here.
//
// Used by /api/analytics/dg (the Analytics tab) and by the weekly customer
// report, so both quote the same numbers from the same rules.
// ============================================================================

/** Output current above this means the unit is genuinely producing. */
export const LOAD_THRESHOLD_A = 2;

/** Gap between consecutive samples longer than this is an outage, not runtime. */
export const GAP_CAP_SECONDS = 300;

/** Din.1 pulses shorter than this are contact bounce, not a start. */
export const MIN_RUN_SECONDS = 60;

/**
 * How far a DG's fixes may spread before we call it movement.
 *
 * Consumer GNSS on a stationary unit wanders by tens of metres, and a genset
 * that is genuinely relocated moves kilometres, so anything in between is
 * ambiguous. 20 km is deliberately well clear of the noise floor: it answers
 * "has this been taken somewhere else", not "has it shifted across the yard".
 */
export const DG_MOVED_KM = 20;

/** Below this many fixes the spread says more about sample size than position. */
export const MIN_FIXES_FOR_MOVE = 10;

/** Ain.1 raw (millivolts) → amps. The transducer differs per hardware. */
const CURRENT_DIVISOR: Record<string, number> = { FMC650: 47, FMB150: 83, FMB120: 83 };

export function currentDivisorFor(deviceType: string): number {
  return CURRENT_DIVISOR[(deviceType || "").trim()] ?? 83;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DgDay {
  /** YYYY-MM-DD, IST calendar day. */
  day: string;
  engineOnHours: number;
  loadHours: number;
  starts: number;
  /** Average output while producing. NULL = never produced that day. */
  avgAmps: number | null;
}

/** Din.1 group — run time, starts, run lengths. */
export interface DgEngine {
  engineOnHours: number;
  starts: number;
  longestRunHours: number;
  daily: Map<string, { hours: number; starts: number }>;
}

/** Ain.1 group — time under load and output current. */
export interface DgOutput {
  loadHours: number;
  avgAmps: number | null;
  peakAmps: number | null;
  daily: Map<string, { loadHours: number; avgAmps: number | null }>;
}

/** Supply, battery, signal and packet coverage. */
export interface DgHealth {
  hoursWithData: number;
  supplyMinV: number | null;
  supplyAvgV: number | null;
  batteryMinV: number | null;
  gsmAvgPct: number | null;
}

export interface DgMovement {
  /** Spread of the window's fixes in km. NULL = too few fixes to say. */
  spreadKm: number | null;
  fixes: number;
  moved: boolean;
}

// ─── SQL ─────────────────────────────────────────────────────────────────────
//
// Every statement below takes $1 device, $2 window start, $3 window end, and
// touches exactly ONE io_id (except the coverage count) so the composite index
// can serve it as a plain range scan.

/** $4 gap cap seconds, $5 min run seconds. */
const ENGINE_SQL = `
WITH din AS (
  SELECT timestamp,
         io_value::int AS v,
         (timestamp AT TIME ZONE 'Asia/Kolkata')::date AS day
    FROM io_records
   WHERE device_id = $1 AND io_id = 1
     AND timestamp >= $2 AND timestamp < $3
),
on_gaps AS (
  SELECT day,
         EXTRACT(EPOCH FROM (LEAD(timestamp) OVER (ORDER BY timestamp) - timestamp)) AS secs
    FROM din
   WHERE v = 1
),
engine_daily AS (
  SELECT day, SUM(secs) / 3600.0 AS hours
    FROM on_gaps
   WHERE secs > 0 AND secs <= $4
   GROUP BY day
),
edges AS (
  SELECT timestamp, day, v, LAG(v) OVER (ORDER BY timestamp) AS prev
    FROM din
),
starts AS (
  SELECT day FROM edges WHERE v = 1 AND prev = 0
),
starts_daily AS (
  SELECT day, COUNT(*) AS n FROM starts GROUP BY day
),
-- Only transitions matter for run lengths; consecutive duplicates are noise.
trans AS (
  SELECT timestamp, v FROM edges WHERE prev IS NULL OR v <> prev
),
runs AS (
  SELECT v,
         EXTRACT(EPOCH FROM (
           COALESCE(LEAD(timestamp) OVER (ORDER BY timestamp), (SELECT MAX(timestamp) FROM din))
           - timestamp
         )) AS secs
    FROM trans
)
SELECT
  (SELECT COALESCE(SUM(hours), 0) FROM engine_daily)                   AS engine_on_hours,
  (SELECT COUNT(*) FROM starts)                                        AS starts,
  (SELECT COALESCE(MAX(secs), 0) FROM runs WHERE v = 1 AND secs >= $5) AS longest_run_secs,
  (SELECT COALESCE(json_agg(json_build_object('day', day, 'hours', hours) ORDER BY day), '[]'::json)
     FROM engine_daily)                                                AS engine_daily,
  (SELECT COALESCE(json_agg(json_build_object('day', day, 'n', n) ORDER BY day), '[]'::json)
     FROM starts_daily)                                                AS starts_daily
`;

/**
 * $4 current divisor, $5 gap cap seconds, $6 load threshold amps.
 *
 * This used to join Ain.1 to a same-instant Din.1 = 1 row to prove the engine
 * was running. That self-join was the most expensive thing on the page and it
 * proved nothing new: a genset cannot put out more than 2 A with the engine
 * stopped, so `amps > threshold` already implies running. Dropping it turns a
 * join of two 100k-row ranges into one range scan.
 *
 * (An abnormal "current while OFF" reading is a fault the health panel and the
 * alert scan already raise; it is not this tab's job to catch it, and folding
 * it in here is what made the tab time out.)
 */
const OUTPUT_SQL = `
WITH amp_samples AS (
  SELECT timestamp,
         (timestamp AT TIME ZONE 'Asia/Kolkata')::date AS day,
         io_value::numeric / $4 AS amps
    FROM io_records
   WHERE device_id = $1 AND io_id = 9
     AND timestamp >= $2 AND timestamp < $3
),
load_gaps AS (
  SELECT day,
         EXTRACT(EPOCH FROM (LEAD(timestamp) OVER (ORDER BY timestamp) - timestamp)) AS secs
    FROM amp_samples
   WHERE amps > $6
),
load_daily AS (
  SELECT day, SUM(secs) / 3600.0 AS hours
    FROM load_gaps
   WHERE secs > 0 AND secs <= $5
   GROUP BY day
),
amps_daily AS (
  SELECT day, AVG(amps) FILTER (WHERE amps > $6) AS avg_amps
    FROM amp_samples
   GROUP BY day
)
SELECT
  (SELECT COALESCE(SUM(hours), 0) FROM load_daily)              AS load_hours,
  (SELECT AVG(amps) FROM amp_samples WHERE amps > $6)           AS avg_amps,
  (SELECT MAX(amps) FROM amp_samples)                           AS peak_amps,
  (SELECT COALESCE(json_agg(json_build_object('day', day, 'hours', hours) ORDER BY day), '[]'::json)
     FROM load_daily)                                           AS load_daily,
  (SELECT COALESCE(json_agg(json_build_object('day', day, 'avg', avg_amps) ORDER BY day), '[]'::json)
     FROM amps_daily)                                           AS amps_daily
`;

/**
 * Supply, battery, signal, and how much of the window actually has packets.
 *
 * The coverage count is the one statement here that is not restricted to a
 * single io_id, so it is the one that leans on (device_id, timestamp). It is
 * also the least important number on the page — if this group times out the
 * tab simply omits the power tiles.
 */
const HEALTH_SQL = `
SELECT
  (SELECT COUNT(DISTINCT date_trunc('hour', timestamp))
     FROM io_records
    WHERE device_id = $1 AND timestamp >= $2 AND timestamp < $3)      AS hours_with_data,
  (SELECT MIN(io_value::numeric) / 1000.0 FROM io_records
    WHERE device_id = $1 AND io_id = 66
      AND timestamp >= $2 AND timestamp < $3 AND io_value::numeric > 0) AS supply_min_v,
  (SELECT AVG(io_value::numeric) / 1000.0 FROM io_records
    WHERE device_id = $1 AND io_id = 66
      AND timestamp >= $2 AND timestamp < $3 AND io_value::numeric > 0) AS supply_avg_v,
  (SELECT MIN(io_value::numeric) / 1000.0 FROM io_records
    WHERE device_id = $1 AND io_id = 67
      AND timestamp >= $2 AND timestamp < $3 AND io_value::numeric > 0) AS battery_min_v,
  (SELECT AVG(io_value::numeric) FROM io_records
    WHERE device_id = $1 AND io_id = 21
      AND timestamp >= $2 AND timestamp < $3)                          AS gsm_avg_pct
`;

// A stationary DG's fixes should all sit within GNSS jitter of one spot. The
// 2nd/98th percentiles discard the occasional wild fix a cheap receiver emits,
// so one bad packet cannot report a genset as relocated.
const GPS_SPREAD_SQL = `
SELECT COUNT(*) AS n,
       percentile_cont(0.02) WITHIN GROUP (ORDER BY latitude)  AS lat_lo,
       percentile_cont(0.98) WITHIN GROUP (ORDER BY latitude)  AS lat_hi,
       percentile_cont(0.02) WITHIN GROUP (ORDER BY longitude) AS lon_lo,
       percentile_cont(0.98) WITHIN GROUP (ORDER BY longitude) AS lon_hi
  FROM gps_records
 WHERE device_id = $1
   AND timestamp >= $2 AND timestamp < $3
   AND latitude  BETWEEN -90  AND 90
   AND longitude BETWEEN -180 AND 180
   AND latitude <> 0 AND longitude <> 0
   AND satellites >= 4
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
};

const round = (v: number | null, d = 1): number | null =>
  v === null ? null : parseFloat(v.toFixed(d));

function indexByDay<T>(arr: Array<Record<string, unknown>> | null, key: string): Map<string, T> {
  return new Map((arr || []).map((x) => [String(x.day).slice(0, 10), x[key] as T]));
}

/** Anything with a `.query(text, params)` method — a pg Pool or a Client. */
export interface Queryable {
  query(text: string, params?: unknown[]): Promise<{ rows: any[] }>;
}

// ─── The four independent groups ─────────────────────────────────────────────

export async function fetchDgEngine(
  client: Queryable, deviceId: string, startAt: Date, endAt: Date
): Promise<DgEngine> {
  const r = (await client.query(ENGINE_SQL, [
    deviceId, startAt, endAt, GAP_CAP_SECONDS, MIN_RUN_SECONDS,
  ])).rows[0];

  const hoursByDay  = indexByDay<number>(r.engine_daily, "hours");
  const startsByDay = indexByDay<number>(r.starts_daily, "n");
  const daily = new Map<string, { hours: number; starts: number }>();
  for (const day of new Set([...hoursByDay.keys(), ...startsByDay.keys()])) {
    daily.set(day, {
      hours:  round(num(hoursByDay.get(day)) ?? 0, 2) ?? 0,
      starts: num(startsByDay.get(day)) ?? 0,
    });
  }

  return {
    engineOnHours:   round(num(r.engine_on_hours) ?? 0, 2) ?? 0,
    starts:          Number(r.starts || 0),
    longestRunHours: round(Number(r.longest_run_secs || 0) / 3600, 2) ?? 0,
    daily,
  };
}

export async function fetchDgOutput(
  client: Queryable, deviceId: string, deviceType: string, startAt: Date, endAt: Date
): Promise<DgOutput> {
  const r = (await client.query(OUTPUT_SQL, [
    deviceId, startAt, endAt, currentDivisorFor(deviceType), GAP_CAP_SECONDS, LOAD_THRESHOLD_A,
  ])).rows[0];

  const loadByDay = indexByDay<number>(r.load_daily, "hours");
  const ampsByDay = indexByDay<number | null>(r.amps_daily, "avg");
  const daily = new Map<string, { loadHours: number; avgAmps: number | null }>();
  for (const day of new Set([...loadByDay.keys(), ...ampsByDay.keys()])) {
    daily.set(day, {
      loadHours: round(num(loadByDay.get(day)) ?? 0, 2) ?? 0,
      avgAmps:   round(num(ampsByDay.get(day)), 1),
    });
  }

  return {
    loadHours: round(num(r.load_hours) ?? 0, 2) ?? 0,
    avgAmps:   round(num(r.avg_amps), 1),
    peakAmps:  round(num(r.peak_amps), 1),
    daily,
  };
}

export async function fetchDgHealth(
  client: Queryable, deviceId: string, startAt: Date, endAt: Date
): Promise<DgHealth> {
  const r = (await client.query(HEALTH_SQL, [deviceId, startAt, endAt])).rows[0];
  return {
    hoursWithData: Number(r.hours_with_data || 0),
    supplyMinV:    round(num(r.supply_min_v), 1),
    supplyAvgV:    round(num(r.supply_avg_v), 1),
    batteryMinV:   round(num(r.battery_min_v), 2),
    gsmAvgPct:     round(num(r.gsm_avg_pct), 0),
  };
}

/** How far the unit's fixes spread over the window, and whether that is movement. */
export async function fetchDgMovement(
  client: Queryable, deviceId: string, startAt: Date, endAt: Date
): Promise<DgMovement> {
  const g = (await client.query(GPS_SPREAD_SQL, [deviceId, startAt, endAt])).rows[0];
  const fixes = Number(g?.n || 0);
  if (fixes < MIN_FIXES_FOR_MOVE || g?.lat_lo === null || g?.lat_lo === undefined) {
    return { spreadKm: null, fixes, moved: false };
  }
  const spreadKm = round(haversineKm(+g.lat_lo, +g.lon_lo, +g.lat_hi, +g.lon_hi), 2);
  return { spreadKm, fixes, moved: spreadKm !== null && spreadKm > DG_MOVED_KM };
}

// ─── Assembling a daily strip ────────────────────────────────────────────────

/**
 * Merge the engine and output groups into one row per day, zero-filled across
 * `days` so a day the unit never ran still appears in the chart. Either group
 * may be missing — that is the whole point of settling them independently.
 */
export function buildDgDaily(
  days: string[], engine: DgEngine | null, output: DgOutput | null
): DgDay[] {
  return days.map((day) => {
    const e = engine?.daily.get(day);
    const o = output?.daily.get(day);
    return {
      day,
      engineOnHours: e?.hours ?? 0,
      loadHours:     o?.loadHours ?? 0,
      starts:        e?.starts ?? 0,
      avgAmps:       o?.avgAmps ?? null,
    };
  });
}

/** IST calendar days covered by [startAt, endAt), inclusive of both ends. */
export function istDaysBetween(startAt: Date, endAt: Date): string[] {
  const key = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const out: string[] = [];
  const last = key(new Date(endAt.getTime() - 1)); // end is exclusive
  let cur = key(startAt);
  // Guard against a pathological range producing an unbounded loop.
  for (let i = 0; i < 400 && cur <= last; i++) {
    out.push(cur);
    const d = new Date(`${cur}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    cur = d.toISOString().slice(0, 10);
  }
  return out;
}
