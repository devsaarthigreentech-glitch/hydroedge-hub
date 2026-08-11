-- ============================================================================
-- 006_daily_digest_and_power_alert.sql
-- ----------------------------------------------------------------------------
-- Two changes that go together:
--
-- 1. devices.system_voltage — 12 or 24, the vehicle's electrical system.
--    The external-power alarm has no fixed threshold: 8 V is a flat battery on
--    a 12 V truck and a catastrophic failure on a 24 V one. Without this value
--    the alarm cannot be evaluated at all, so it stays silent rather than
--    guessing. Set it per device on the Edit tab.
--
-- 2. notification_log.dispatch_kind — 'digest' or 'immediate'.
--    Alerts now leave in one of two ways: batched into a once-a-day roundup per
--    company, or sent the moment they are detected. The daily gate works by
--    asking "has this company had a digest today", so digest sends have to be
--    distinguishable from an immediate one that happened to fire at 3am —
--    otherwise the urgent mail would suppress the day's roundup.
--
-- Existing rows are backfilled to 'digest', which is what they were.
-- ============================================================================

ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS system_voltage SMALLINT;

ALTER TABLE notification_log
  ADD COLUMN IF NOT EXISTS dispatch_kind TEXT NOT NULL DEFAULT 'digest';

COMMENT ON COLUMN devices.system_voltage IS
  'Vehicle electrical system in volts: 12 or 24. Drives the external-power-low threshold (below 8V / below 20V). NULL means unknown — the alarm is skipped.';

COMMENT ON COLUMN notification_log.dispatch_kind IS
  'How this alert was sent: digest (once-a-day company roundup) or immediate (urgent, sent on detection).';

-- Only 12 V and 24 V systems exist on this fleet. A typo here would silently
-- mis-threshold the alarm, so reject it at the database rather than defending
-- against it in every reader.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'devices_system_voltage_check'
  ) THEN
    ALTER TABLE devices
      ADD CONSTRAINT devices_system_voltage_check
      CHECK (system_voltage IS NULL OR system_voltage IN (12, 24));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notification_log_dispatch_kind_check'
  ) THEN
    ALTER TABLE notification_log
      ADD CONSTRAINT notification_log_dispatch_kind_check
      CHECK (dispatch_kind IN ('digest', 'immediate'));
  END IF;
END $$;

-- The daily gate asks for the newest digest send per company on every scan.
CREATE INDEX IF NOT EXISTS idx_notification_log_digest_recent
  ON notification_log (device_id, sent_at DESC)
  WHERE dispatch_kind = 'digest';
