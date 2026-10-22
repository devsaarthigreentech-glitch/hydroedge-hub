-- ============================================================================
-- 021_nanov3_battery_system_voltage.sql
-- ----------------------------------------------------------------------------
-- NanoV3 P-5021 Battery System Voltage: a required installation answer.
--
--   Not Set (default) | 12V | 24V | 48V
--
-- It picks which engine on/off voltage pair the firmware uses for battery-
-- voltage engine detection. While it is Not Set, voltage detection stays off
-- (it is never guessed from the reading) and the unit logs SETUP INCOMPLETE at
-- every boot. Until this row exists the Commands tab refuses P-5021, so it
-- cannot be set from the web.
--
-- Goes into the existing "Engine Detection & Start Interlock" category, so the
-- Config tab shows it under Engine & Power. Enum values match the firmware
-- strings exactly ("Not Set" has a space). Applied live - no reboot needed.
--
-- Only P-5021. The rest of the new firmware parameters (engine-detect
-- thresholds P-5020/P-5022..P-5030, fuel sender P-56xx/P-4127..P-4130, backup
-- battery P-57xx/P-4131..P-4137) are not registered yet.
-- ============================================================================

INSERT INTO nano_registry
  (pid, pid_num, band, category, name, description, data_type, units,
   valid_range, enum_values, default_value, access, settable_via,
   sms_eligible, auth_req, presence, source, proposed, notes)
VALUES
  ('P-5021', 5021,
   COALESCE((SELECT band FROM nano_registry WHERE category = 'Engine Detection & Start Interlock' LIMIT 1), 30),
   'Engine Detection & Start Interlock',
   'Battery System Voltage',
   'Required installation answer: the vehicle/DG battery system (12V, 24V or 48V). Picks the engine on/off voltage pair. Not Set = voltage engine detection off.',
   'enum', NULL, NULL, '{"Not Set","12V","24V","48V"}'::text[], 'Not Set', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist')
ON CONFLICT (pid) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM nano_registry WHERE pid = 'P-5021') THEN
    RAISE EXCEPTION 'nano_registry: P-5021 missing after migration';
  END IF;
  RAISE NOTICE 'nano_registry: P-5021 Battery System Voltage present.';
END $$;
