-- ============================================================================
-- 003_ignition_io_fallback.sql
-- ----------------------------------------------------------------------------
-- Adds device_daily_summary.ignition_io_id for installs that already ran 001.
--
-- Background: trips and idle events are both derived from ignition transitions,
-- which 001 read exclusively from IO 239. Not every unit reports 239 —
-- SGT-GD-0226-0015 reports DIN1 (IO 1) instead, and rolled up 2,518 km of real
-- movement with zero trips and zero idle events as a result. The updated
-- function falls back to IO 1 when 239 is absent for that device-day, and
-- records which source it used here.
--
-- ── APPLY IN THIS ORDER ─────────────────────────────────────────────────────
--   1. node scripts/apply-migration.js db/migrations/003_ignition_io_fallback.sql
--   2. node scripts/apply-migration.js db/migrations/001_device_daily_summary.sql
--
-- Step 2 is not a typo. 001 is the single canonical definition of
-- refresh_device_daily_summary(); re-running it is safe (CREATE TABLE IF NOT
-- EXISTS and CREATE INDEX IF NOT EXISTS are no-ops, CREATE OR REPLACE FUNCTION
-- installs the new body). Keeping the function in one file is deliberate —
-- a second copy here would drift.
--
-- ── THEN RECOMPUTE THE AFFECTED DEVICES ─────────────────────────────────────
-- Existing rows keep their old trip/idle values until recomputed. Only devices
-- that never reported IO 239 are wrong, so target them rather than re-running
-- the whole 2.2-hour backfill:
--
--   SELECT DISTINCT d.id, d.device_name
--     FROM devices d
--     JOIN device_daily_summary s ON s.device_id = d.id
--    WHERE s.trip_count = 0 AND s.idle_events = 0 AND s.gps_distance_km > 0;
--
-- then for each id:
--   node scripts/rollup-daily-summary.js --device <uuid> --days 30
--
-- That is ~30 device-days each (about 100 seconds), not 2400.
-- ============================================================================

ALTER TABLE device_daily_summary
  ADD COLUMN IF NOT EXISTS ignition_io_id SMALLINT;

COMMENT ON COLUMN device_daily_summary.ignition_io_id IS
  'Which IO the trip/idle calculation read ignition from: 239 (Ignition) when the device reports it, else 1 (DIN1). NULL means the row predates this column.';
