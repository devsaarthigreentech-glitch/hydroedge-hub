-- ============================================================================
-- 020_device_alerts_enabled.sql
-- ----------------------------------------------------------------------------
-- devices.alerts_enabled — per-device alert switch, set from the device Edit
-- tab. Turn it off for a decommissioned, spare or not-yet-installed unit: the
-- alert scan then skips the device entirely, so it appears in no customer
-- summary, support digest or urgent email, and in no Alert Activity card.
--
-- Replaces device_alert_settings.alerts_enabled as the switch the scan reads.
-- That table has no UI and is missing on some installs (see 007). Any mute
-- already set there is carried over below; the table itself is left alone.
-- ============================================================================

ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN devices.alerts_enabled IS
  'FALSE = the alert scan skips this device (decommissioned / not installed). Set on the device Edit tab.';

DO $$
DECLARE
  moved INTEGER := 0;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'device_alert_settings' AND column_name = 'alerts_enabled'
  ) THEN
    UPDATE devices d
       SET alerts_enabled = FALSE
      FROM device_alert_settings das
     WHERE das.device_id = d.id
       AND das.alerts_enabled = FALSE
       AND d.alerts_enabled = TRUE;
    GET DIAGNOSTICS moved = ROW_COUNT;
    RAISE NOTICE 'Carried over % muted device(s) from device_alert_settings.', moved;
  ELSE
    RAISE NOTICE 'device_alert_settings.alerts_enabled not present - nothing to carry over.';
  END IF;
END $$;
