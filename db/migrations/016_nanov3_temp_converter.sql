-- ============================================================================
-- 016_nanov3_temp_converter.sql
-- ----------------------------------------------------------------------------
-- Registers P-5100 (Temp Converter Type) so the Commands tab accepts
-- `set P-5100 ...` and the Config tab lists it.
--
-- NanoV3 commit 6323d16 added MAX6675 (K-type thermocouple) support next to
-- the MAX31865 (PT100); P-5100 selects which converter is fitted. The firmware
-- reads it at boot, so the box must be rebooted after a change.
--
-- ON CONFLICT (pid) DO NOTHING: safe to re-run.
-- ============================================================================

INSERT INTO nano_registry
  (pid, pid_num, band, category, name, description, data_type, units,
   valid_range, enum_values, default_value, access, settable_via,
   sms_eligible, auth_req, presence, source, proposed, notes)
VALUES
  ('P-5100', 5100, 31, 'Temperature Sensor', 'Temp Converter Type',
   'Temperature converter fitted: MAX31865 (PT100) or MAX6675 (K-type). Read at boot - reboot after changing.',
   'enum', NULL, NULL, '{"MAX31865","MAX6675"}'::text[], 'MAX31865', 'RW',
   '{"Cloud","CLI"}'::text[], false, false, NULL, 'NanoV3 config_table.c', false, 'persist')
ON CONFLICT (pid) DO NOTHING;
