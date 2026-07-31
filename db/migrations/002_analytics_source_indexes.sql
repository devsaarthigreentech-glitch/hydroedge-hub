-- ============================================================================
-- 002_analytics_source_indexes.sql
-- ----------------------------------------------------------------------------
-- Indexes the daily rollup needs on the RAW tables.
--
-- The summary table moves analytics cost off the click path, but the rollup job
-- itself still reads io_records / gps_records filtered by device + IO + time
-- window, once per device per day. Without these it degrades to a full table
-- scan per device-day, and a nightly job over ~80 devices will not finish.
--
-- ⚠ RUN THESE ONE AT A TIME, NOT IN A TRANSACTION.
--    CREATE INDEX CONCURRENTLY cannot run inside a transaction block. If you
--    paste this whole file into psql it will fail — psql wraps multi-statement
--    input only when you use -1/--single-transaction, so run it WITHOUT that
--    flag, or execute each statement separately.
--
--    CONCURRENTLY keeps writes flowing while the index builds. On a large
--    io_records this can take a long while; it is safe to leave running.
--    If a build is interrupted it leaves an INVALID index behind — check with
--    the query at the bottom and DROP before retrying.
--
-- Check what already exists before running:
--    SELECT indexname, indexdef FROM pg_indexes
--     WHERE tablename IN ('io_records','gps_records');
-- ============================================================================

-- Covers every io_records access pattern in the rollup:
--   odometer (io 16/216), fuel level (107), engine state (1), CAN rate (18),
--   ignition (239) — all "one device, one io_id, a time window".
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_io_records_device_io_ts
  ON io_records (device_id, io_id, timestamp);

-- The GPS track scan: one device, a time window, in timestamp order.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gps_records_device_ts
  ON gps_records (device_id, timestamp);

-- ── Verify ──────────────────────────────────────────────────────────────────
-- Find failed CONCURRENTLY builds (these must be dropped and retried):
--   SELECT c.relname
--     FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
--    WHERE NOT i.indisvalid;
--
-- Confirm the rollup uses them:
--   EXPLAIN ANALYZE SELECT MAX(io_value::numeric) - MIN(io_value::numeric)
--     FROM io_records
--    WHERE device_id = '<uuid>' AND io_id = 16
--      AND timestamp >= '2026-07-30T00:00:00+05:30'
--      AND timestamp <  '2026-07-31T00:00:00+05:30';
--   -- want: Index Scan / Bitmap Index Scan, not Seq Scan
