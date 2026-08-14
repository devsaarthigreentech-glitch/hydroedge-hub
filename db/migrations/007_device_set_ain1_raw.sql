-- ============================================================================
-- 007_device_set_ain1_raw.sql
-- ----------------------------------------------------------------------------
-- Adds devices.set_ain1_raw — the commissioned setpoint for the electrolyser,
-- stored as the RAW Ain.1 value (millivolts) exactly as io_records holds it.
--
-- Why raw millivolts and not amps
-- -------------------------------
-- Amps are derived: current_A = ain1_raw / divisor, where the divisor is 47 on
-- FMC650 and 83 on FMB150/FMB120. The FMB120 divisor is still marked
-- unconfirmed in HealthPanel.tsx ("defaulted to 83 ... CONFIRM against real
-- device current"). If a setpoint were stored in amps and that divisor were
-- later corrected, every commissioned device would silently start alarming
-- against the wrong threshold and would have to be re-entered by hand.
--
-- Storing the raw value makes the comparison divisor-independent: the alarm
-- compares raw against raw. Correcting a divisor then only changes the amps
-- shown on screen, never whether a unit is judged in or out of range.
--
-- Units: this column is MILLIVOLTS, matching io_records.io_value for io_id 9.
-- The UI never asks for millivolts. It reports state in AMPS (read-only display
-- and alarm text) and takes input in VOLTS — "0.830", the headline figure on the
-- telemetry tile — converting ×1000 on save. So three units are in play and each
-- has one job: volts in, millivolts stored and compared, amps shown.
--
-- Nullable ADD COLUMN with no default — instant, no table rewrite. NULL means
-- "not commissioned", which suppresses the deviation alarms rather than
-- defaulting them to a guessed value.
--
-- The CHECK is added NOT VALID so it applies to new writes without scanning
-- the table. Every row is NULL at this point anyway; run
-- `ALTER TABLE devices VALIDATE CONSTRAINT devices_set_ain1_raw_range;`
-- later if you want the full guarantee.
-- ============================================================================

ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS set_ain1_raw NUMERIC(10,2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'devices'::regclass
       AND conname  = 'devices_set_ain1_raw_range'
  ) THEN
    ALTER TABLE devices
      ADD CONSTRAINT devices_set_ain1_raw_range
      CHECK (set_ain1_raw IS NULL OR (set_ain1_raw > 0 AND set_ain1_raw <= 60000))
      NOT VALID;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Backfill from device_alert_settings.set_current
-- ----------------------------------------------------------------------------
-- That column was the previous home for this setting: amps, read only by the
-- alert-email scan and never by the health panel — which is why the panel showed
-- "Not configured" even on devices that already had a value. Consolidating onto
-- devices means both surfaces read one field and cannot drift.
--
-- The old value is in AMPS and only ever applied to FMC650 units (the alert scan
-- filters on device_type = 'FMC650'), so converting back to raw is amps × 47.
-- Devices of any other type are skipped rather than converted with a divisor
-- that was never theirs.
--
-- Guarded on the column existing, so this is safe on a database where
-- device_alert_settings was never created. Only fills rows still NULL, so
-- re-running never overwrites a value entered since.
--
-- device_alert_settings.set_current is left in place, unread. Drop it once you
-- have confirmed the backfill looks right.
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  moved integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name  = 'device_alert_settings'
       AND column_name = 'set_current'
  ) THEN
    UPDATE devices d
       SET set_ain1_raw = das.set_current * 47
      FROM device_alert_settings das
     WHERE das.device_id     = d.id
       AND das.set_current IS NOT NULL
       AND das.set_current   > 0
       AND d.set_ain1_raw   IS NULL
       AND d.device_type     = 'FMC650';

    GET DIAGNOSTICS moved = ROW_COUNT;
    RAISE NOTICE 'Backfilled set_ain1_raw on % device(s) from device_alert_settings.set_current (amps x 47).', moved;
  ELSE
    RAISE NOTICE 'device_alert_settings.set_current not present - nothing to backfill.';
  END IF;
END $$;

COMMENT ON COLUMN devices.set_ain1_raw IS
  'Commissioned setpoint as the RAW Ain.1 value in millivolts, matching io_records.io_value for io_id 9. Deviation alarms compare raw against raw so they stay correct regardless of the amps divisor (47 on FMC650, 83 on FMB). Displayed to users as amps. NULL = not commissioned; deviation alarms suppressed.';
