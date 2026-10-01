-- ============================================================================
-- 014_nanov3_plant_producing.sql
-- ----------------------------------------------------------------------------
-- NanoV3 firmware 7801b5c derives whether the analog box is actually producing
-- from measured cell current (and engine run), and reports pump 1 / pump 2 /
-- solenoid idle while it is not -- their status lines sag at shutdown to a
-- level no voltage threshold can tell apart from "running".
--
--   P-4126  Plant Producing             RO telemetry, in every frame
--   P-5011  Plant Off Current Threshold A, default 0.2
--   P-5012  Plant Off Confirm Time      s, default 5
--
-- The same commit changed three defaults, measured on the bench:
--   P-5002  High -> Low     (pump/valve lines are asserted at the LOW level)
--   P-5006  1000 -> 1200 mV (analog threshold, between running and resting)
--   P-5007  200  -> 20 mV   (hysteresis)
-- Those rows were inserted by 011 with the old defaults; the Config tab shows
-- default_value, so it is brought in line here. Only rows this project
-- inserted (source = 'NanoV3 config_table.c') are touched.
--
-- Restart the ingest after applying: it validates its column list at start-up
-- and refuses to run without plant_producing.
-- ============================================================================

ALTER TABLE nano_device_state
  ADD COLUMN IF NOT EXISTS plant_producing BOOLEAN;

COMMENT ON COLUMN nano_device_state.plant_producing IS
  'P-4126 NanoV3: analog box producing (cell current above P-5011, engine running). While false the firmware reports pump1/pump2/solenoid idle.';

INSERT INTO nano_registry
  (pid, pid_num, band, category, name, description, data_type, units,
   valid_range, enum_values, default_value, access, settable_via,
   sms_eligible, auth_req, presence, source, proposed, notes)
VALUES
  ('P-5011', 5011, 30, 'Analog-Box I/O Interface', 'Plant Off Current Threshold', 'Cell current at or below this means the box is not producing; pump/solenoid then report idle.', 'float', 'A',
   '0..5', NULL, '0.2', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist'),
  ('P-5012', 5012, 30, 'Analog-Box I/O Interface', 'Plant Off Confirm Time', 'How long the current condition must hold before the producing/not-producing state flips.', 'uint16', 's',
   '1..120', NULL, '5', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist'),
  ('P-4126', 4126, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4093'), 26), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4093'), 'Measured Values'), 'Plant Producing', 'true = the box is producing. False when measured cell current stays at or below P-5011 for P-5012 s, or the engine is stopped; pump/solenoid are reported idle while false.', 'bool', NULL,
   NULL, NULL, 'false', 'RO', '{}'::text[],
   false, false, 'always', 'NanoV3 config_table.c', false, 'runtime only')
ON CONFLICT (pid) DO NOTHING;

UPDATE nano_registry SET default_value = v.def, updated_at = now()
  FROM (VALUES ('P-5002', 'Low'), ('P-5006', '1200'), ('P-5007', '20')) AS v(pid, def)
 WHERE nano_registry.pid = v.pid
   AND nano_registry.source = 'NanoV3 config_table.c'
   AND nano_registry.default_value IS DISTINCT FROM v.def;

DO $$
DECLARE missing integer;
BEGIN
  SELECT count(*) INTO missing FROM (VALUES ('P-5011'), ('P-5012'), ('P-4126')) v(pid)
   WHERE NOT EXISTS (SELECT 1 FROM nano_registry r WHERE r.pid = v.pid);
  IF missing > 0 THEN
    RAISE EXCEPTION 'nano_registry still missing % plant-state parameter(s)', missing;
  END IF;
END $$;
