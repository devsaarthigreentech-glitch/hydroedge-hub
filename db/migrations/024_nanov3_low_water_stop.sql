-- ============================================================================
-- 024_nanov3_low_water_stop.sql
-- ----------------------------------------------------------------------------
-- NanoV3 firmware 577bcbc can hold the remote-stop line while the main water
-- tank is dry, and ee911e6 holds it while the battery system set in P-5021
-- disagrees with the battery reading. Both holds are reported in every frame,
-- so an operator can see WHY remote stop (P-4114) is asserted.
--
--   P-5040  Low Water Stop Enable       bool, default false
--   P-5041  Low Water Stop Delay        s, 1..3600, default 30
--   P-5042  Low Water Restart Delay     s, 1..3600, default 60
--   P-4139  Low Water Stop Active       RO telemetry
--   P-4138  Battery System Mismatch     RO telemetry
--
-- The settings go in Water Management (Config tab: Fluids & Environment).
-- The readings get nullable nano_device_state columns: firmware older than
-- these commits does not send them, and absent stays NULL, never false.
--
-- Also nano_commands.reply_text: the value the device reported when it closed
-- a command (the val of its t:cfg reply), so the command log can show what a
-- get returned instead of just "ok".
--
-- Restart the ingest after applying: it checks these columns at start-up and
-- refuses to run without them.
-- ============================================================================

ALTER TABLE nano_device_state
  ADD COLUMN IF NOT EXISTS low_water_stop          BOOLEAN,
  ADD COLUMN IF NOT EXISTS battery_system_mismatch BOOLEAN;

COMMENT ON COLUMN nano_device_state.low_water_stop          IS 'P-4139 NanoV3: low-water stop holds the remote-stop line (main tank dry past P-5041); NULL on firmware before 577bcbc';
COMMENT ON COLUMN nano_device_state.battery_system_mismatch IS 'P-4138 NanoV3: P-5021 battery system disagrees with the battery reading for 10 s, remote stop held; NULL on firmware before ee911e6';

ALTER TABLE nano_commands
  ADD COLUMN IF NOT EXISTS reply_text TEXT;

COMMENT ON COLUMN nano_commands.reply_text IS
  'Value in the device''s t:cfg reply that closed this command (what a get returned); NULL for a nack or before the reply arrives';

INSERT INTO nano_registry
  (pid, pid_num, band, category, name, description, data_type, units,
   valid_range, enum_values, default_value, access, settable_via,
   sms_eligible, auth_req, presence, source, proposed, notes)
VALUES
  ('P-5040', 5040, COALESCE((SELECT band FROM nano_registry WHERE category = 'Water Management' LIMIT 1), 30), 'Water Management', 'Low Water Stop Enable', 'Hold remote stop while the main water tank reads dry (P-4096). Off by default.', 'bool', NULL,
   NULL, NULL, 'false', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist'),
  ('P-5041', 5041, COALESCE((SELECT band FROM nano_registry WHERE category = 'Water Management' LIMIT 1), 30), 'Water Management', 'Low Water Stop Delay', 'Seconds the main tank must read dry before remote stop is held.', 'uint16', 's',
   '1..3600', NULL, '30', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist'),
  ('P-5042', 5042, COALESCE((SELECT band FROM nano_registry WHERE category = 'Water Management' LIMIT 1), 30), 'Water Management', 'Low Water Restart Delay', 'Seconds the main tank must read water again before the plant is released.', 'uint16', 's',
   '1..3600', NULL, '60', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist'),
  ('P-4139', 4139, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4093'), 26), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4093'), 'Measured Values'), 'Low Water Stop Active', 'Low-water stop is holding the remote-stop line: main tank dry past P-5041; releases P-5042 s after refill.', 'bool', NULL,
   NULL, NULL, 'false', 'RO', '{}'::text[],
   false, false, 'always', 'NanoV3 config_table.c', false, 'runtime only'),
  ('P-4138', 4138, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4093'), 26), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4093'), 'Measured Values'), 'Battery System Mismatch', 'P-5021 battery system disagrees with the battery reading (e.g. 24V set on a 12V vehicle) for 10 s; the remote-stop line is held until they match.', 'bool', NULL,
   NULL, NULL, 'false', 'RO', '{}'::text[],
   false, false, 'always', 'NanoV3 config_table.c', false, 'runtime only')
ON CONFLICT (pid) DO NOTHING;

DO $$
DECLARE missing integer;
BEGIN
  SELECT count(*) INTO missing FROM (VALUES ('P-5040'), ('P-5041'), ('P-5042'), ('P-4139'), ('P-4138')) v(pid)
   WHERE NOT EXISTS (SELECT 1 FROM nano_registry r WHERE r.pid = v.pid);
  IF missing > 0 THEN
    RAISE EXCEPTION 'nano_registry still missing % low-water / battery-mismatch parameter(s)', missing;
  END IF;
  RAISE NOTICE 'nano_registry: P-5040..P-5042, P-4138, P-4139 present.';
END $$;
