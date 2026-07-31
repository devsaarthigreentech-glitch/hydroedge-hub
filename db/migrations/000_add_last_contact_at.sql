-- ============================================================================
-- 000_add_last_contact_at.sql
-- ----------------------------------------------------------------------------
-- Adds devices.last_contact_at, which the application already selects.
--
-- Commit 7173749 ("Asset INfo") added `d.last_contact_at` to the devices query
-- in src/app/api/devices/route.ts and the server-clock "last seen" logic in
-- src/components/devices/DeviceDetail.tsx, but the column was never created.
-- The result is SQLSTATE 42703 on every device fetch, surfaced in the UI as
-- "Database Connection Error / Failed to fetch devices".
--
-- Deliberately NOT backfilled. The column exists precisely because
-- last_location_time comes from the device's own RTC and cannot be trusted
-- (one unit streams live data stamped Aug 2024). Copying that value in would
-- reintroduce the bug this column was added to fix. NULL is correct: the UI
-- already falls back to last_location_time for rows predating the column.
--
-- Nullable ADD COLUMN with no default — instant, no table rewrite, no lock
-- beyond a brief ACCESS EXCLUSIVE on the catalog. Safe on a live system.
--
-- ⚠ This only fixes the read path. The Python ingest service must also be
--    updated to stamp NOW() into this column on every packet, or it stays NULL
--    forever and "last seen" keeps using the untrusted device clock.
-- ============================================================================

ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ;

COMMENT ON COLUMN devices.last_contact_at IS
  'Server clock (NOW()) at the moment the last packet was received. Trustworthy, unlike last_location_time which is the device RTC. Written by the ingest service.';
