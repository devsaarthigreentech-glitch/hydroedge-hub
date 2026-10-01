-- ============================================================================
-- 013_nano_registry_cloud_settable_all.sql
-- ----------------------------------------------------------------------------
-- Admin-level access for now: every writable Nano parameter (RW, and WO such
-- as the P-514 Wi-Fi passphrase) becomes settable from the web.
--
-- Until now settable_via came from the Gen 2 registry, which left some
-- writable parameters without 'Cloud' (so the Config tab showed them
-- read-only), and the API refused WO parameters outright. Per-role
-- restrictions are to be handled by user tiers in the app, not by hiding
-- parameters in the registry, so the registry now simply says what the
-- firmware accepts: any RW or WO parameter, over the cloud.
--
-- RO rows are untouched: they are measurements, and the firmware rejects a
-- write to them regardless.
--
-- Idempotent: rows that already include 'Cloud' are skipped, so re-running
-- changes nothing. To undo for one parameter:
--   UPDATE nano_registry SET settable_via = array_remove(settable_via, 'Cloud')
--    WHERE pid = 'P-xxx';
-- ============================================================================

DO $$
DECLARE opened integer;
BEGIN
  UPDATE nano_registry
     SET settable_via = array_append(settable_via, 'Cloud'),
         updated_at   = now()
   WHERE access IN ('RW', 'WO')
     AND NOT ('Cloud' = ANY (settable_via));
  GET DIAGNOSTICS opened = ROW_COUNT;
  RAISE NOTICE 'nano_registry: % writable parameter(s) made cloud-settable.', opened;
END $$;
