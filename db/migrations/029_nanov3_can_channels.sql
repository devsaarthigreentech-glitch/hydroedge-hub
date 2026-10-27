-- ============================================================================
-- 029_nanov3_can_channels.sql
-- ----------------------------------------------------------------------------
-- NanoV3 firmware 4661029: eight spare Custom CAN channels for signals found
-- with the capture/sniff tools, plus total fuel used and engine hours in OBD2
-- and Custom mode.
--
--   P-4230..P-4237  Custom CAN Channel 1..8 Map    string, same format as P-4210
--   P-4240..P-4247  Custom CAN Channel 1..8 Label  free text with unit, e.g.
--                                                  "Odometer (km)"
--   P-4150..P-4157  Custom CAN Channel 1..8        RO telemetry, sent only while
--                                                  the channel is mapped and fresh
--   P-4143          Engine Hours Counted           h; counted by the unit, may be
--                                                  set once to the vehicle's hours
--
-- P-4107 Total Fuel Used and P-4108 Engine Hours now also report in OBD2 /
-- Custom mode; they already have columns and units (028).
--
-- The channel readings get nullable nano_device_state columns (absent = NULL).
-- The Live tab titles each channel with the device's label for it.
--
-- Restart the ingest after applying: it checks its column list at start-up
-- and refuses to run without these columns.
-- ============================================================================

ALTER TABLE nano_device_state
  ADD COLUMN IF NOT EXISTS can_ch1  NUMERIC,
  ADD COLUMN IF NOT EXISTS can_ch2  NUMERIC,
  ADD COLUMN IF NOT EXISTS can_ch3  NUMERIC,
  ADD COLUMN IF NOT EXISTS can_ch4  NUMERIC,
  ADD COLUMN IF NOT EXISTS can_ch5  NUMERIC,
  ADD COLUMN IF NOT EXISTS can_ch6  NUMERIC,
  ADD COLUMN IF NOT EXISTS can_ch7  NUMERIC,
  ADD COLUMN IF NOT EXISTS can_ch8  NUMERIC;

COMMENT ON COLUMN nano_device_state.can_ch1 IS 'P-4150 NanoV3: Custom CAN channel 1 (window mean), labelled by P-4240; NULL while unmapped or stale';
COMMENT ON COLUMN nano_device_state.can_ch2 IS 'P-4151 NanoV3: Custom CAN channel 2 (window mean), labelled by P-4241; NULL while unmapped or stale';
COMMENT ON COLUMN nano_device_state.can_ch3 IS 'P-4152 NanoV3: Custom CAN channel 3 (window mean), labelled by P-4242; NULL while unmapped or stale';
COMMENT ON COLUMN nano_device_state.can_ch4 IS 'P-4153 NanoV3: Custom CAN channel 4 (window mean), labelled by P-4243; NULL while unmapped or stale';
COMMENT ON COLUMN nano_device_state.can_ch5 IS 'P-4154 NanoV3: Custom CAN channel 5 (window mean), labelled by P-4244; NULL while unmapped or stale';
COMMENT ON COLUMN nano_device_state.can_ch6 IS 'P-4155 NanoV3: Custom CAN channel 6 (window mean), labelled by P-4245; NULL while unmapped or stale';
COMMENT ON COLUMN nano_device_state.can_ch7 IS 'P-4156 NanoV3: Custom CAN channel 7 (window mean), labelled by P-4246; NULL while unmapped or stale';
COMMENT ON COLUMN nano_device_state.can_ch8 IS 'P-4157 NanoV3: Custom CAN channel 8 (window mean), labelled by P-4247; NULL while unmapped or stale';

INSERT INTO nano_registry
  (pid, pid_num, band, category, name, description, data_type, units,
   valid_range, enum_values, default_value, access, settable_via,
   sms_eligible, auth_req, presence, source, proposed, notes)
VALUES
  ('P-4230', 4230, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4200'), 27), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4200'), 'CAN'), 'Custom CAN Channel 1 Map', 'Custom CAN spare channel 1 map, same format as P-4210 (e.g. ''0x460, 0, 3, BE, 1, 0'' for an odometer). Published as P-4150, labelled by P-4240.', 'string', NULL,
   NULL, NULL, '', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist'),
  ('P-4231', 4231, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4200'), 27), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4200'), 'CAN'), 'Custom CAN Channel 2 Map', 'Custom CAN spare channel 2 map. Published as P-4151, labelled by P-4241.', 'string', NULL,
   NULL, NULL, '', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist'),
  ('P-4232', 4232, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4200'), 27), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4200'), 'CAN'), 'Custom CAN Channel 3 Map', 'Custom CAN spare channel 3 map. Published as P-4152, labelled by P-4242.', 'string', NULL,
   NULL, NULL, '', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist'),
  ('P-4233', 4233, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4200'), 27), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4200'), 'CAN'), 'Custom CAN Channel 4 Map', 'Custom CAN spare channel 4 map. Published as P-4153, labelled by P-4243.', 'string', NULL,
   NULL, NULL, '', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist'),
  ('P-4234', 4234, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4200'), 27), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4200'), 'CAN'), 'Custom CAN Channel 5 Map', 'Custom CAN spare channel 5 map. Published as P-4154, labelled by P-4244.', 'string', NULL,
   NULL, NULL, '', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist'),
  ('P-4235', 4235, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4200'), 27), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4200'), 'CAN'), 'Custom CAN Channel 6 Map', 'Custom CAN spare channel 6 map. Published as P-4155, labelled by P-4245.', 'string', NULL,
   NULL, NULL, '', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist'),
  ('P-4236', 4236, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4200'), 27), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4200'), 'CAN'), 'Custom CAN Channel 7 Map', 'Custom CAN spare channel 7 map. Published as P-4156, labelled by P-4246.', 'string', NULL,
   NULL, NULL, '', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist'),
  ('P-4237', 4237, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4200'), 27), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4200'), 'CAN'), 'Custom CAN Channel 8 Map', 'Custom CAN spare channel 8 map. Published as P-4157, labelled by P-4247.', 'string', NULL,
   NULL, NULL, '', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist'),
  ('P-4240', 4240, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4200'), 27), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4200'), 'CAN'), 'Custom CAN Channel 1 Label', 'Display label (with unit) for custom channel 1, e.g. ''Odometer (km)''.', 'string', NULL,
   NULL, NULL, '', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist'),
  ('P-4241', 4241, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4200'), 27), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4200'), 'CAN'), 'Custom CAN Channel 2 Label', 'Display label for custom channel 2.', 'string', NULL,
   NULL, NULL, '', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist'),
  ('P-4242', 4242, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4200'), 27), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4200'), 'CAN'), 'Custom CAN Channel 3 Label', 'Display label for custom channel 3.', 'string', NULL,
   NULL, NULL, '', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist'),
  ('P-4243', 4243, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4200'), 27), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4200'), 'CAN'), 'Custom CAN Channel 4 Label', 'Display label for custom channel 4.', 'string', NULL,
   NULL, NULL, '', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist'),
  ('P-4244', 4244, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4200'), 27), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4200'), 'CAN'), 'Custom CAN Channel 5 Label', 'Display label for custom channel 5.', 'string', NULL,
   NULL, NULL, '', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist'),
  ('P-4245', 4245, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4200'), 27), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4200'), 'CAN'), 'Custom CAN Channel 6 Label', 'Display label for custom channel 6.', 'string', NULL,
   NULL, NULL, '', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist'),
  ('P-4246', 4246, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4200'), 27), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4200'), 'CAN'), 'Custom CAN Channel 7 Label', 'Display label for custom channel 7.', 'string', NULL,
   NULL, NULL, '', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist'),
  ('P-4247', 4247, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4200'), 27), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4200'), 'CAN'), 'Custom CAN Channel 8 Label', 'Display label for custom channel 8.', 'string', NULL,
   NULL, NULL, '', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist'),
  ('P-4150', 4150, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4093'), 26), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4093'), 'Measured Values'), 'Custom CAN Channel 1', 'Custom CAN channel 1 value (window mean); label in P-4240.', 'float', NULL,
   NULL, NULL, NULL, 'RO', '{}'::text[],
   false, false, 'conditional', 'NanoV3 config_table.c', false, 'runtime only'),
  ('P-4151', 4151, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4093'), 26), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4093'), 'Measured Values'), 'Custom CAN Channel 2', 'Custom CAN channel 2 value; label in P-4241.', 'float', NULL,
   NULL, NULL, NULL, 'RO', '{}'::text[],
   false, false, 'conditional', 'NanoV3 config_table.c', false, 'runtime only'),
  ('P-4152', 4152, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4093'), 26), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4093'), 'Measured Values'), 'Custom CAN Channel 3', 'Custom CAN channel 3 value; label in P-4242.', 'float', NULL,
   NULL, NULL, NULL, 'RO', '{}'::text[],
   false, false, 'conditional', 'NanoV3 config_table.c', false, 'runtime only'),
  ('P-4153', 4153, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4093'), 26), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4093'), 'Measured Values'), 'Custom CAN Channel 4', 'Custom CAN channel 4 value; label in P-4243.', 'float', NULL,
   NULL, NULL, NULL, 'RO', '{}'::text[],
   false, false, 'conditional', 'NanoV3 config_table.c', false, 'runtime only'),
  ('P-4154', 4154, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4093'), 26), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4093'), 'Measured Values'), 'Custom CAN Channel 5', 'Custom CAN channel 5 value; label in P-4244.', 'float', NULL,
   NULL, NULL, NULL, 'RO', '{}'::text[],
   false, false, 'conditional', 'NanoV3 config_table.c', false, 'runtime only'),
  ('P-4155', 4155, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4093'), 26), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4093'), 'Measured Values'), 'Custom CAN Channel 6', 'Custom CAN channel 6 value; label in P-4245.', 'float', NULL,
   NULL, NULL, NULL, 'RO', '{}'::text[],
   false, false, 'conditional', 'NanoV3 config_table.c', false, 'runtime only'),
  ('P-4156', 4156, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4093'), 26), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4093'), 'Measured Values'), 'Custom CAN Channel 7', 'Custom CAN channel 7 value; label in P-4246.', 'float', NULL,
   NULL, NULL, NULL, 'RO', '{}'::text[],
   false, false, 'conditional', 'NanoV3 config_table.c', false, 'runtime only'),
  ('P-4157', 4157, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4093'), 26), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4093'), 'Measured Values'), 'Custom CAN Channel 8', 'Custom CAN channel 8 value; label in P-4247.', 'float', NULL,
   NULL, NULL, NULL, 'RO', '{}'::text[],
   false, false, 'conditional', 'NanoV3 config_table.c', false, 'runtime only'),
  ('P-4143', 4143, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4200'), 27), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4200'), 'CAN'), 'Engine Hours Counted', 'Engine hours counted on the unit (RPM above 400). Enter the vehicle''s hours once to start from them. Published as P-4108.', 'float', 'h',
   '0..1000000', NULL, '0', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist')
ON CONFLICT (pid) DO NOTHING;

DO $$
DECLARE missing integer;
BEGIN
  SELECT count(*) INTO missing FROM (VALUES
    ('P-4230'), ('P-4231'), ('P-4232'), ('P-4233'), ('P-4234'), ('P-4235'), ('P-4236'), ('P-4237'), ('P-4240'), ('P-4241'), ('P-4242'), ('P-4243'), ('P-4244'), ('P-4245'), ('P-4246'), ('P-4247'), ('P-4150'), ('P-4151'), ('P-4152'), ('P-4153'), ('P-4154'), ('P-4155'), ('P-4156'), ('P-4157'), ('P-4143')) v(pid)
   WHERE NOT EXISTS (SELECT 1 FROM nano_registry r WHERE r.pid = v.pid);
  IF missing > 0 THEN
    RAISE EXCEPTION 'nano_registry still missing % Custom CAN channel parameter(s)', missing;
  END IF;
  RAISE NOTICE 'nano_registry: P-4230..P-4237, P-4240..P-4247, P-4150..P-4157, P-4143 present.';
END $$;
