-- ============================================================================
-- backfill-fuel-distance.sql — distance + fuel rollup for ONE device-chunk
-- ----------------------------------------------------------------------------
-- Writes only the columns serveFromSummary() actually reads
-- (src/app/api/analytics/route.ts): distance_km, fuel_litres_level,
-- fuel_litres_can, can_fuel_readings, is_partial, computed_at — plus
-- engine_on_hours as provenance for the CAN figure.
--
-- Why not just call refresh_device_daily_summary()? That function also computes
-- GPS haversine distance, ignition-paired trips and the idle pipeline. On a
-- device reporting every ~8s with no (device_id, io_id, timestamp) index, one
-- device-day of that takes 6.5 MINUTES. None of those columns are read by the
-- analytics route — trips and idle have their own routes that always scan raw —
-- so computing them here is pure cost. This does ~11s/day instead.
--
-- ⚠ Consequence: trip_count / idle_minutes / gps_distance_km / max_speed_kmh
--   stay at their column defaults (0) for days written by this script. Nothing
--   reads them today. If those columns are ever wired to the summary, devices
--   backfilled this way will read as "no trips, no idling" — re-run the full
--   refresh_device_daily_summary() for them first. The ON CONFLICT list below
--   deliberately does NOT touch those columns, so a later full refresh wins.
--
-- ── Fuel: two methods, both stored ──────────────────────────────────────────
--   fuel_litres_level  IO 107, a cumulative meter — (MAX-MIN)*0.1 over the day.
--   fuel_litres_can    IO 18, an instantaneous L/h rate — integrated as
--                      engine_on_hours * avg L/h while the engine is ON.
-- The read-time preference (CAN when can_fuel_readings > 0, else level) lives in
-- the API, not here, so both figures stay available.
--
-- ── The per-timestamp pivot is NOT an optimisation, it is a correctness fix ──
-- The device retransmits AVL records on a flaky link and the ingest accepts each
-- copy, so io_records holds several byte-identical rows per (io_id, timestamp)
-- under different gps_record_id. Confirmed on SGT-GD-0226-0015: up to 13 copies
-- of one instant, and the multiplicity distribution is identical across io_id 1
-- and 18 — whole packets are duplicated, not individual IOs.
--
-- The live route joins io_records to itself on timestamp, which emits the CROSS
-- PRODUCT of those duplicates: 13,525 "readings" for 3,303 real samples on
-- 2026-08-22, and because duplication is not uniform across the day it dragged
-- avg L/h from 9.25 to 10.40 — fuel over-reported by ~12%.
--
-- Collapsing to one row per timestamp first is exact, not approximate: verified
-- that duplicate rows NEVER disagree on io_value (COUNT(DISTINCT io_value) = 1
-- for every duplicated instant), so MAX() picks the single true value.
--
-- Distance and engine_on_hours are immune either way — MAX-MIN ignores repeats,
-- and duplicate rows produce 0-second gaps that `secs > 0` already discards.
--
-- ⚠ This means the rollup DISAGREES with /api/analytics?live=1 by ~12% on fuel
--   for any device with duplicated packets. The rollup is the correct one. The
--   live route needs the same pivot before verify-daily-summary.js is meaningful.
--
-- ── Variables (all required) ────────────────────────────────────────────────
--   dev         device UUID
--   c_from      first IST day to write, YYYY-MM-DD
--   c_to        last IST day to write,  YYYY-MM-DD (inclusive)
--   mileage_io  16, or 216 for FMC650
--   use_can     1 to compute the CAN rate method, 0 to skip it
--
-- Invoked by scripts/backfill-fuel-distance.sh, which resolves mileage_io and
-- use_can from the device row. To run one chunk by hand:
--   psql -v dev=... -v c_from=2026-07-26 -v c_to=2026-08-24 \
--        -v mileage_io=16 -v use_can=1 -f scripts/backfill-fuel-distance.sql
-- ============================================================================

WITH pkt AS (
  -- One row per packet instant. See the duplicate-retransmission note above.
  SELECT (r.timestamp AT TIME ZONE 'Asia/Kolkata')::date AS day,
         r.timestamp,
         MAX(r.io_value::numeric) FILTER (WHERE r.io_id = 1)  AS engine,
         MAX(r.io_value::numeric) FILTER (WHERE r.io_id = 18) AS rate_raw
  FROM io_records r
  WHERE r.device_id = :'dev'::uuid
    AND r.io_id IN (1, 18)
    AND r.timestamp >= (:'c_from'::date::timestamp     AT TIME ZONE 'Asia/Kolkata')
    AND r.timestamp <  ((:'c_to'::date + 1)::timestamp AT TIME ZONE 'Asia/Kolkata')
  GROUP BY 1, 2
),

-- Odometer: a cumulative counter, so the day's travel is MAX-MIN.
-- GREATEST(...,0) guards a counter reset mid-day.
odo AS (
  SELECT (r.timestamp AT TIME ZONE 'Asia/Kolkata')::date AS day,
         ROUND(GREATEST(MAX(r.io_value::numeric) - MIN(r.io_value::numeric), 0) / 1000.0, 2) AS distance_km
  FROM io_records r
  WHERE r.device_id = :'dev'::uuid
    AND r.io_id = :mileage_io
    AND r.io_value::numeric > 0
    AND r.timestamp >= (:'c_from'::date::timestamp     AT TIME ZONE 'Asia/Kolkata')
    AND r.timestamp <  ((:'c_to'::date + 1)::timestamp AT TIME ZONE 'Asia/Kolkata')
  GROUP BY 1
),

-- Fuel meter (IO 107): also cumulative. Absent on many devices — the LEFT JOIN
-- below then leaves fuel_litres_level at 0, which is correct, not missing data.
meter AS (
  SELECT (r.timestamp AT TIME ZONE 'Asia/Kolkata')::date AS day,
         ROUND(GREATEST(MAX(r.io_value::numeric) - MIN(r.io_value::numeric), 0) * 0.1, 2) AS litres
  FROM io_records r
  WHERE r.device_id = :'dev'::uuid
    AND r.io_id = 107
    AND r.io_value::numeric > 0
    AND r.timestamp >= (:'c_from'::date::timestamp     AT TIME ZONE 'Asia/Kolkata')
    AND r.timestamp <  ((:'c_to'::date + 1)::timestamp AT TIME ZONE 'Asia/Kolkata')
  GROUP BY 1
),

-- Engine-on hours: sum of gaps between consecutive engine-ON packets.
-- Gaps over 300s are an outage (device offline), not runtime.
eng AS (
  SELECT day, EXTRACT(EPOCH FROM (
           LEAD(timestamp) OVER (PARTITION BY day ORDER BY timestamp) - timestamp)) AS secs
  FROM pkt WHERE engine = 1
),
eng_h AS (
  SELECT day, SUM(secs) / 3600.0 AS hours
  FROM eng WHERE secs > 0 AND secs <= 300 GROUP BY day
),

-- CAN fuel rate, sampled only while the engine is ON. io_value >= 60000 is the
-- "not available" sentinel (this device reports 65535), not a real reading.
rate AS (
  SELECT day, AVG(rate_raw * 0.1) AS avg_lph, COUNT(*) AS readings
  FROM pkt
  WHERE :use_can = 1
    AND engine = 1
    AND rate_raw IS NOT NULL
    AND rate_raw < 60000
  GROUP BY day
),

-- Every day in the chunk, not just days with data. The coverage gate in
-- serveFromSummary() falls back to a live scan unless a row exists for EVERY
-- requested day, so zero-activity rows are load-bearing.
days AS (
  SELECT g::date AS day
  FROM generate_series(:'c_from'::date, :'c_to'::date, INTERVAL '1 day') g
)

INSERT INTO device_daily_summary (
  device_id, day, distance_km, fuel_litres_level, fuel_litres_can,
  can_fuel_readings, engine_on_hours, mileage_io_id, device_type, is_partial, computed_at
)
SELECT :'dev'::uuid,
       k.day,
       COALESCE(o.distance_km, 0),
       COALESCE(m.litres, 0),
       ROUND((COALESCE(h.hours, 0) * COALESCE(r.avg_lph, 0))::numeric, 2),
       COALESCE(r.readings, 0)::int,
       ROUND(COALESCE(h.hours, 0)::numeric, 3),
       :mileage_io,
       (SELECT device_type FROM devices WHERE id = :'dev'::uuid),
       -- TRUE while the IST day is still in progress: the row will change.
       ((k.day + 1)::timestamp AT TIME ZONE 'Asia/Kolkata') > NOW(),
       NOW()
FROM days k
LEFT JOIN odo   o ON o.day = k.day
LEFT JOIN meter m ON m.day = k.day
LEFT JOIN eng_h h ON h.day = k.day
LEFT JOIN rate  r ON r.day = k.day
-- Only the columns this script computes. Leaving trip/idle/GPS columns alone
-- means a later full refresh_device_daily_summary() is not undone by a re-run.
ON CONFLICT (device_id, day) DO UPDATE SET
  distance_km       = EXCLUDED.distance_km,
  fuel_litres_level = EXCLUDED.fuel_litres_level,
  fuel_litres_can   = EXCLUDED.fuel_litres_can,
  can_fuel_readings = EXCLUDED.can_fuel_readings,
  engine_on_hours   = EXCLUDED.engine_on_hours,
  mileage_io_id     = EXCLUDED.mileage_io_id,
  device_type       = EXCLUDED.device_type,
  is_partial        = EXCLUDED.is_partial,
  computed_at       = EXCLUDED.computed_at;
