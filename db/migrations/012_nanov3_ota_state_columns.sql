-- ============================================================================
-- 012_nanov3_ota_state_columns.sql
-- ----------------------------------------------------------------------------
-- NanoV3 cloud OTA (firmware commit 2dea47c) reports its job in telemetry:
--   P-4123  OTA State            always   (Idle / Downloading / Verifying / ...)
--   P-4124  OTA Progress Percent conditional, only while a job runs
--   P-4125  OTA Last Result      conditional, only when non-empty
-- Same shape as 009: nullable, no defaults, absent stays NULL. Restart the
-- ingest after applying (it validates its column list at start-up).
-- ============================================================================

ALTER TABLE nano_device_state
  ADD COLUMN IF NOT EXISTS ota_state        TEXT,
  ADD COLUMN IF NOT EXISTS ota_progress_pct INTEGER,
  ADD COLUMN IF NOT EXISTS ota_last_result  TEXT;

COMMENT ON COLUMN nano_device_state.ota_state        IS 'P-4123 NanoV3: OTA job state';
COMMENT ON COLUMN nano_device_state.ota_progress_pct IS 'P-4124 NanoV3: OTA download percent; NULL when no job';
COMMENT ON COLUMN nano_device_state.ota_last_result  IS 'P-4125 NanoV3: outcome of the last OTA job; NULL when none';
