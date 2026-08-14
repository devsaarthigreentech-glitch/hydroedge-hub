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
-- The UI still speaks amps everywhere it reports a state — the read-only
-- display and the alarm text show the converted current. Only the input asks
-- for the raw Ain.1 figure, because that is what an engineer reads off the
-- telemetry tab when commissioning.
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

COMMENT ON COLUMN devices.set_ain1_raw IS
  'Commissioned setpoint as the RAW Ain.1 value in millivolts, matching io_records.io_value for io_id 9. Deviation alarms compare raw against raw so they stay correct regardless of the amps divisor (47 on FMC650, 83 on FMB). Displayed to users as amps. NULL = not commissioned; deviation alarms suppressed.';
