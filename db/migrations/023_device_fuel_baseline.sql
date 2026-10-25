-- ============================================================================
-- 023_device_fuel_baseline.sql
-- ----------------------------------------------------------------------------
-- devices.fuel_baseline_kmpl — the "Actual vs Baseline" target on the device
-- Analytics tab. Until now it lived only in the browser's localStorage
-- (baseline_kmpl_<deviceId>), so a value set by one person on one computer was
-- invisible to everyone else and every other browser fell back to 10 km/L.
--
-- NULL = not set; the Analytics tab then uses its default of 10 km/L.
-- Values already saved in people's browsers are not on the server, so they are
-- not carried over here; the tab shows a browser's old value until someone
-- sets the baseline again, which then saves it for everyone.
-- ============================================================================

ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS fuel_baseline_kmpl NUMERIC(5,2)
    CHECK (fuel_baseline_kmpl IS NULL OR (fuel_baseline_kmpl > 0 AND fuel_baseline_kmpl <= 100));

COMMENT ON COLUMN devices.fuel_baseline_kmpl IS
  'Fuel efficiency baseline (km/L) for the Analytics tab. NULL = default 10. Set from the Analytics tab.';
