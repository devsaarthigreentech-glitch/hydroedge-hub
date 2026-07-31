-- ============================================================================
-- 001_device_daily_summary.sql
-- ----------------------------------------------------------------------------
-- Per-device, per-IST-day rollup of everything the Analytics tab shows as a
-- number. Populated by scripts/rollup-daily-summary.js (run from cron).
--
-- Design notes:
--   * Grain is (device_id, day) where `day` is the IST calendar date. Every
--     window is [day 00:00 IST, next day 00:00 IST).
--   * Metrics are stored RAW and ADDITIVE. Derived values (fuel average) are
--     computed on read from summed totals — averaging daily averages is wrong.
--   * The formulas here are ports of the live queries in src/app/api/analytics/*.
--     They must stay in sync; if you change a formula there, change it here and
--     re-run the backfill, or the two paths will disagree.
--
-- Safe to re-run: everything is IF NOT EXISTS / CREATE OR REPLACE.
-- ============================================================================

CREATE TABLE IF NOT EXISTS device_daily_summary (
  device_id             UUID        NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  day                   DATE        NOT NULL,   -- IST calendar date

  -- ── Distance ──────────────────────────────────────────────────────────────
  distance_km           NUMERIC(12,2) NOT NULL DEFAULT 0,  -- odometer IO (16 / 216)
  gps_distance_km       NUMERIC(12,2) NOT NULL DEFAULT 0,  -- haversine over gps_records

  -- ── Fuel ──────────────────────────────────────────────────────────────────
  -- Two independent methods; the API prefers CAN when it has readings, exactly
  -- as the live route does. Both are stored so that preference stays a read-time
  -- decision and we never have to re-run the rollup to change our minds.
  fuel_litres_level     NUMERIC(12,2) NOT NULL DEFAULT 0,  -- IO 107 (max-min)*0.1
  fuel_litres_can       NUMERIC(12,2) NOT NULL DEFAULT 0,  -- engine_hours * avg L/h
  can_fuel_readings     INTEGER       NOT NULL DEFAULT 0,  -- IO 18 sample count
  engine_on_hours       NUMERIC(10,3) NOT NULL DEFAULT 0,

  -- ── Trips ─────────────────────────────────────────────────────────────────
  -- Count and duration only. Per-trip DISTANCE (and therefore longest_trip_km)
  -- needs each GPS segment attributed to a trip window, which the live route
  -- does in JS; it is deliberately not rolled up here rather than stored wrong.
  trip_count            INTEGER       NOT NULL DEFAULT 0,
  trip_duration_min     INTEGER       NOT NULL DEFAULT 0,

  -- ── Idle ──────────────────────────────────────────────────────────────────
  idle_minutes          NUMERIC(10,1) NOT NULL DEFAULT 0,
  idle_events           INTEGER       NOT NULL DEFAULT 0,
  idle_fuel_rate_lph    NUMERIC(8,3),                      -- NULL = no CAN data
  idle_fuel_rate_source TEXT          NOT NULL DEFAULT 'estimate'
                        CHECK (idle_fuel_rate_source IN ('can_bus','estimate')),

  -- ── Speed ─────────────────────────────────────────────────────────────────
  max_speed_kmh         NUMERIC(6,1)  NOT NULL DEFAULT 0,
  avg_speed_kmh         NUMERIC(6,1)  NOT NULL DEFAULT 0,

  -- ── Provenance ────────────────────────────────────────────────────────────
  gps_points            INTEGER       NOT NULL DEFAULT 0,
  mileage_io_id         SMALLINT,          -- which odometer IO was used
  device_type           TEXT,              -- snapshot: formula depends on it
  is_partial            BOOLEAN       NOT NULL DEFAULT FALSE,  -- day not yet closed
  computed_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  PRIMARY KEY (device_id, day)
);

COMMENT ON TABLE device_daily_summary IS
  'Per-device daily rollup for the Analytics tab. Refreshed by scripts/rollup-daily-summary.js.';
COMMENT ON COLUMN device_daily_summary.is_partial IS
  'TRUE while the IST day is still in progress — the row will change on the next refresh.';
COMMENT ON COLUMN device_daily_summary.gps_distance_km IS
  'Haversine distance over gps_records. Independent of distance_km (odometer) — they will differ.';

-- Read pattern is "one device, a range of recent days, newest first".
CREATE INDEX IF NOT EXISTS idx_dds_device_day
  ON device_daily_summary (device_id, day DESC);

-- Lets the runner find stale rows cheaply.
CREATE INDEX IF NOT EXISTS idx_dds_partial
  ON device_daily_summary (day) WHERE is_partial;


-- ============================================================================
-- refresh_device_daily_summary(device, day)
-- ----------------------------------------------------------------------------
-- Recomputes exactly one device-day from the raw tables and upserts it.
-- Idempotent: running it twice produces the same row.
--
-- Returns TRUE if a row was written, FALSE if the device does not exist.
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_device_daily_summary(
  p_device_id UUID,
  p_day       DATE
) RETURNS BOOLEAN AS $$
DECLARE
  v_start       TIMESTAMPTZ;
  v_end         TIMESTAMPTZ;
  v_device_type TEXT;
  v_mileage_io  INT;
  v_is_fmb150   BOOLEAN;
  v_is_partial  BOOLEAN;
BEGIN
  -- IST day boundaries. Interpreting a naive timestamp AT TIME ZONE gives the
  -- timestamptz of midnight *in Kolkata*, which is what the live routes group by.
  v_start := (p_day::timestamp        AT TIME ZONE 'Asia/Kolkata');
  v_end   := ((p_day + 1)::timestamp  AT TIME ZONE 'Asia/Kolkata');

  SELECT device_type INTO v_device_type
    FROM devices WHERE id = p_device_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Mirrors src/app/api/analytics/route.ts: FMC650 reports the odometer on 216.
  v_mileage_io := CASE WHEN v_device_type = 'FMC650' THEN 216 ELSE 16 END;
  v_is_fmb150  := (v_device_type = 'FMB150');
  v_is_partial := (v_end > NOW());

  INSERT INTO device_daily_summary AS s (
    device_id, day,
    distance_km, gps_distance_km,
    fuel_litres_level, fuel_litres_can, can_fuel_readings, engine_on_hours,
    trip_count, trip_duration_min,
    idle_minutes, idle_events, idle_fuel_rate_lph, idle_fuel_rate_source,
    max_speed_kmh, avg_speed_kmh,
    gps_points, mileage_io_id, device_type, is_partial, computed_at
  )
  WITH
  -- ── Odometer distance: cumulative counter, so MAX-MIN over the day ────────
  odo AS (
    SELECT GREATEST(MAX(io_value::numeric) - MIN(io_value::numeric), 0) / 1000.0 AS km
      FROM io_records
     WHERE device_id = p_device_id
       AND io_id     = v_mileage_io
       AND timestamp >= v_start AND timestamp < v_end
       AND io_value::numeric > 0
  ),

  -- ── Fuel, level method (IO 107): also cumulative ──────────────────────────
  fuel_level AS (
    SELECT ROUND(GREATEST(MAX(io_value::numeric) - MIN(io_value::numeric), 0) * 0.1, 2) AS litres
      FROM io_records
     WHERE device_id = p_device_id
       AND io_id     = 107
       AND timestamp >= v_start AND timestamp < v_end
       AND io_value::numeric > 0
  ),

  -- ── Engine-on hours: sum of gaps between consecutive engine-ON records. ───
  -- Gaps over 300s are treated as an outage, not runtime.
  engine_on AS (
    SELECT timestamp
      FROM io_records
     WHERE device_id = p_device_id
       AND io_id     = 1
       AND io_value::numeric = 1
       AND timestamp >= v_start AND timestamp < v_end
  ),
  engine_gaps AS (
    SELECT EXTRACT(EPOCH FROM (LEAD(timestamp) OVER (ORDER BY timestamp) - timestamp)) AS secs
      FROM engine_on
  ),
  engine_hours AS (
    SELECT COALESCE(SUM(secs), 0) / 3600.0 AS hours
      FROM engine_gaps
     WHERE secs > 0 AND secs <= 300
  ),

  -- ── CAN fuel rate (IO 18) sampled only while the engine is ON ─────────────
  -- The live route omits a time filter on the joined `d` rows. Because the join
  -- forces d.timestamp = f.timestamp and f is already bounded, adding it here is
  -- provably equivalent and lets the index do the work.
  -- Gated on FMB150 to match the live route, which only issues this query for
  -- that model. Without the gate a non-FMB150 with IO 18 data would roll up a
  -- CAN figure the live path never produces, and the two would disagree.
  can_rate AS (
    SELECT AVG(f.io_value::numeric * 0.1) AS avg_lph,
           COUNT(*)                        AS readings
      FROM io_records f
      JOIN io_records d
        ON  d.device_id = f.device_id
        AND d.timestamp = f.timestamp
        AND d.io_id     = 1
        AND d.io_value::numeric = 1
        AND d.timestamp >= v_start AND d.timestamp < v_end
     WHERE v_is_fmb150
       AND f.device_id = p_device_id
       AND f.io_id     = 18
       AND f.io_value::numeric < 60000
       AND f.timestamp >= v_start AND f.timestamp < v_end
  ),

  -- ── GPS track for distance/speed. Filters match the trips route exactly. ──
  gps AS (
    SELECT timestamp,
           latitude,
           longitude,
           speed::numeric AS speed,
           LAG(latitude)  OVER w AS prev_lat,
           LAG(longitude) OVER w AS prev_lon,
           LAG(timestamp) OVER w AS prev_ts
      FROM gps_records
     WHERE device_id = p_device_id
       AND timestamp >= v_start AND timestamp < v_end
       AND latitude   BETWEEN -90  AND 90
       AND longitude  BETWEEN -180 AND 180
       AND speed::numeric BETWEEN 0 AND 300
       AND satellites >= 3
    WINDOW w AS (ORDER BY timestamp)
  ),
  gps_seg AS (
    SELECT speed,
           EXTRACT(EPOCH FROM (timestamp - prev_ts)) AS dt_sec,
           -- Haversine, asin form (equivalent to the atan2 form in trips/route.ts)
           2 * 6371 * asin(sqrt(
             power(sin(radians(latitude - prev_lat) / 2), 2) +
             cos(radians(prev_lat)) * cos(radians(latitude)) *
             power(sin(radians(longitude - prev_lon) / 2), 2)
           )) AS seg_km
      FROM gps
     WHERE prev_ts IS NOT NULL
  ),
  -- Implied speed is computed in a CASE, not inline in the filter below.
  -- SQL does not guarantee left-to-right AND evaluation, so `dt_sec > 0 AND
  -- (seg_km / dt_sec) ...` can still divide by zero. CASE does short-circuit.
  gps_plausible AS (
    SELECT seg_km,
           dt_sec,
           CASE WHEN dt_sec > 0 THEN (seg_km / dt_sec) * 3600 END AS implied_kmh
      FROM gps_seg
  ),
  gps_agg AS (
    SELECT
      -- isPlausibleSegment(): positive gap, under 10 min, implied speed <= 200 km/h
      COALESCE(SUM(seg_km) FILTER (
        WHERE dt_sec > 0 AND dt_sec <= 600 AND implied_kmh <= 200
      ), 0) AS distance_km
      FROM gps_plausible
  ),
  gps_stats AS (
    SELECT COUNT(*)                                    AS points,
           COALESCE(MAX(speed), 0)                     AS max_speed,
           COALESCE(AVG(speed) FILTER (WHERE speed > 0), 0) AS avg_speed
      FROM gps
  ),

  -- ── Trips: pair ignition ON→OFF (IO 239), keep windows >= 60s ─────────────
  ign AS (
    SELECT timestamp,
           io_value::int AS state,
           LAG(io_value::int) OVER (ORDER BY timestamp) AS prev_state
      FROM io_records
     WHERE device_id = p_device_id
       AND io_id     = 239
       AND timestamp >= v_start AND timestamp < v_end
  ),
  -- Only transitions matter; consecutive duplicates are noise.
  ign_edges AS (
    SELECT timestamp, state
      FROM ign
     WHERE prev_state IS NULL OR state <> prev_state
  ),
  -- LEAD must see BOTH states: WHERE is applied before window functions, so
  -- filtering to state=1 first would make ended_at the next ignition-ON rather
  -- than the OFF that closes the trip. Compute the pairing, then filter.
  --
  -- COALESCE handles a trip still open at the end of the window (vehicle running
  -- across midnight): the live route closes it at the last ignition event rather
  -- than discarding it, so we do the same or the two paths disagree every night.
  trip_bounds AS (
    SELECT timestamp AS started_at,
           state,
           COALESCE(
             LEAD(timestamp) OVER (ORDER BY timestamp),
             (SELECT MAX(timestamp) FROM ign)
           ) AS ended_at
      FROM ign_edges
  ),
  trip_windows AS (
    SELECT started_at, ended_at FROM trip_bounds WHERE state = 1
  ),
  trips AS (
    SELECT EXTRACT(EPOCH FROM (ended_at - started_at)) AS secs
      FROM trip_windows
     WHERE ended_at IS NOT NULL
       AND EXTRACT(EPOCH FROM (ended_at - started_at)) >= 60
  ),
  trip_agg AS (
    SELECT COUNT(*)::int                                   AS n,
           COALESCE(ROUND(SUM(secs) / 60.0), 0)::int       AS duration_min
      FROM trips
  ),

  -- ── Idle: GPS points with ignition ON and speed 0, islands >= 5 min ───────
  -- The live route resolves ignition with a correlated subquery per GPS row.
  -- Here we forward-fill it with a single pass instead — same answer, far cheaper.
  -- Note the filter set differs from `gps` above: the idle route does NOT
  -- constrain satellites or speed. Kept identical on purpose.
  idle_gps AS (
    SELECT timestamp, speed::numeric AS speed
      FROM gps_records
     WHERE device_id = p_device_id
       AND timestamp >= v_start AND timestamp < v_end
       AND latitude  BETWEEN -90  AND 90
       AND longitude BETWEEN -180 AND 180
  ),
  -- Ignition events, reaching back far enough to know the state at day start.
  idle_ign AS (
    SELECT timestamp, io_value::int AS state
      FROM io_records
     WHERE device_id = p_device_id
       AND io_id     = 239
       AND timestamp >= v_start - INTERVAL '2 days' AND timestamp < v_end
  ),
  merged AS (
    SELECT timestamp, NULL::numeric AS speed, state,        0 AS is_gps FROM idle_ign
    UNION ALL
    SELECT timestamp, speed,        NULL::int  AS state,    1 AS is_gps FROM idle_gps
  ),
  -- Forward-fill the last known ignition state (gaps-and-islands).
  filled AS (
    SELECT timestamp, speed, is_gps,
           COUNT(state) OVER (ORDER BY timestamp, is_gps
                              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS grp,
           state
      FROM merged
  ),
  carried AS (
    SELECT timestamp, speed, is_gps,
           FIRST_VALUE(state) OVER (PARTITION BY grp ORDER BY timestamp, is_gps) AS ignition
      FROM filled
  ),
  idle_points AS (
    SELECT timestamp,
           LAG(timestamp) OVER (ORDER BY timestamp) AS prev_ts,
           CASE WHEN ignition = 1 AND speed = 0 THEN 1 ELSE 0 END AS is_idle
      FROM carried
     WHERE is_gps = 1
       AND timestamp >= v_start   -- drop the pre-day ignition lookback rows
  ),
  idle_gaps AS (
    SELECT timestamp, prev_ts, is_idle,
           EXTRACT(EPOCH FROM (timestamp - prev_ts)) / 60.0 AS gap_min
      FROM idle_points
     WHERE prev_ts IS NOT NULL
  ),
  idle_islands AS (
    SELECT *,
           SUM(CASE WHEN is_idle = 0 THEN 1 ELSE 0 END)
             OVER (ORDER BY timestamp) AS grp
      FROM idle_gaps
  ),
  idle_events AS (
    SELECT MIN(prev_ts)   AS idle_start,
           MAX(timestamp) AS idle_end,
           SUM(gap_min)   AS minutes
      FROM idle_islands
     WHERE is_idle = 1
     GROUP BY grp
    HAVING SUM(gap_min) >= 5
  ),
  idle_agg AS (
    SELECT COUNT(*)::int                        AS events,
           COALESCE(SUM(minutes), 0)            AS minutes
      FROM idle_events
  ),
  -- Actual L/h burned while idling, from CAN — only meaningful on FMB150.
  idle_rate AS (
    SELECT AVG(f.io_value::numeric * 0.1) AS avg_lph,
           COUNT(*)                        AS readings
      FROM io_records f
      JOIN idle_events e
        ON f.timestamp BETWEEN e.idle_start AND e.idle_end
     WHERE v_is_fmb150
       AND f.device_id = p_device_id
       AND f.io_id     = 18
       AND f.io_value::numeric < 60000
       AND f.timestamp >= v_start AND f.timestamp < v_end
  )

  SELECT
    p_device_id,
    p_day,
    ROUND(COALESCE(odo.km, 0), 2),
    ROUND(gps_agg.distance_km::numeric, 2),
    COALESCE(fuel_level.litres, 0),
    -- CAN fuel for the day = engine-on hours x average L/h while running
    ROUND((engine_hours.hours * COALESCE(can_rate.avg_lph, 0))::numeric, 2),
    COALESCE(can_rate.readings, 0)::int,
    ROUND(engine_hours.hours::numeric, 3),
    trip_agg.n,
    trip_agg.duration_min,
    ROUND(idle_agg.minutes::numeric, 1),
    idle_agg.events,
    CASE WHEN COALESCE(idle_rate.readings, 0) > 0
         THEN ROUND(idle_rate.avg_lph::numeric, 3) END,
    CASE WHEN COALESCE(idle_rate.readings, 0) > 0 THEN 'can_bus' ELSE 'estimate' END,
    ROUND(gps_stats.max_speed, 1),
    ROUND(gps_stats.avg_speed, 1),
    gps_stats.points::int,
    v_mileage_io,
    v_device_type,
    v_is_partial,
    NOW()
  FROM odo, fuel_level, engine_hours, can_rate,
       gps_agg, gps_stats, trip_agg, idle_agg, idle_rate

  ON CONFLICT (device_id, day) DO UPDATE SET
    distance_km           = EXCLUDED.distance_km,
    gps_distance_km       = EXCLUDED.gps_distance_km,
    fuel_litres_level     = EXCLUDED.fuel_litres_level,
    fuel_litres_can       = EXCLUDED.fuel_litres_can,
    can_fuel_readings     = EXCLUDED.can_fuel_readings,
    engine_on_hours       = EXCLUDED.engine_on_hours,
    trip_count            = EXCLUDED.trip_count,
    trip_duration_min     = EXCLUDED.trip_duration_min,
    idle_minutes          = EXCLUDED.idle_minutes,
    idle_events           = EXCLUDED.idle_events,
    idle_fuel_rate_lph    = EXCLUDED.idle_fuel_rate_lph,
    idle_fuel_rate_source = EXCLUDED.idle_fuel_rate_source,
    max_speed_kmh         = EXCLUDED.max_speed_kmh,
    avg_speed_kmh         = EXCLUDED.avg_speed_kmh,
    gps_points            = EXCLUDED.gps_points,
    mileage_io_id         = EXCLUDED.mileage_io_id,
    device_type           = EXCLUDED.device_type,
    is_partial            = EXCLUDED.is_partial,
    computed_at           = EXCLUDED.computed_at;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_device_daily_summary(UUID, DATE) IS
  'Recompute one device-day from raw io_records/gps_records and upsert it. Idempotent.';
