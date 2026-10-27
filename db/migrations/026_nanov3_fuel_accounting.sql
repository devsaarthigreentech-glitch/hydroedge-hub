-- ============================================================================
-- 026_nanov3_fuel_accounting.sql
-- ----------------------------------------------------------------------------
-- NanoV3 firmware 042bd10 turns the CAN fuel readings into litres and keeps
-- running totals that survive a reboot.
--
--   P-4215  Custom CAN Map: Fuel Rate    string, published as P-4106 (L/h)
--   P-4220  Reset Fuel Counters          bool; zeroes P-4141/P-4142, then
--                                        the firmware sets it back to false
--   P-4140  CAN Fuel In Tank (L)         RO; needs a fresh level and P-5604
--   P-4141  Fuel Spent From Level (L)    RO, cumulative; needs P-5604
--   P-4142  Fuel Burned From Rate (L)    RO, cumulative; needs a fuel rate
--
-- P-5604 Fuel Tank Capacity (022, category Fuel Sender) is now also the tank
-- size for CAN fuel; its description is updated to say so. P-4218's
-- description now names P-4215 among the maps it helps find.
--
-- P-4215 and P-4220 take P-4200's band and category, next to the other CAN
-- settings. The readings get nullable nano_device_state columns: each is sent
-- only when meaningful, and absent stays NULL, never 0.
--
-- Restart the ingest after applying: it checks its column list at start-up
-- and refuses to run without these columns.
-- ============================================================================

ALTER TABLE nano_device_state
  ADD COLUMN IF NOT EXISTS can_fuel_l    NUMERIC(8,1),
  ADD COLUMN IF NOT EXISTS fuel_spent_l  NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS fuel_burned_l NUMERIC(12,2);

COMMENT ON COLUMN nano_device_state.can_fuel_l    IS 'P-4140 NanoV3: litres in the tank, CAN fuel level (P-4117) x P-5604; NULL without a fresh level or with P-5604 = 0';
COMMENT ON COLUMN nano_device_state.fuel_spent_l  IS 'P-4141 NanoV3: running total of fuel spent from the CAN level dropping x P-5604, refuels not counted; survives reboot, reset with P-4220';
COMMENT ON COLUMN nano_device_state.fuel_burned_l IS 'P-4142 NanoV3: running total of fuel burned, integrated from the CAN fuel rate (P-4106); survives reboot, reset with P-4220';

INSERT INTO nano_registry
  (pid, pid_num, band, category, name, description, data_type, units,
   valid_range, enum_values, default_value, access, settable_via,
   sms_eligible, auth_req, presence, source, proposed, notes)
VALUES
  ('P-4215', 4215, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4200'), 27), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4200'), 'CAN'), 'Custom CAN Map: Fuel Rate', 'Custom CAN map for fuel rate (L/h), same format as P-4210. Published as P-4106.', 'string', NULL,
   NULL, NULL, '', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist'),
  ('P-4220', 4220, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4200'), 27), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4200'), 'CAN'), 'Reset Fuel Counters', 'Set true to zero the fuel counters P-4141 and P-4142 (returns to false by itself).', 'bool', NULL,
   NULL, NULL, 'false', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'runtime only'),
  ('P-4140', 4140, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4093'), 26), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4093'), 'Measured Values'), 'CAN Fuel In Tank', 'Litres in the tank from the CAN fuel level (P-4117) x tank capacity P-5604. Needs P-5604 set.', 'float', 'L',
   NULL, NULL, NULL, 'RO', '{}'::text[],
   false, false, 'conditional', 'NanoV3 config_table.c', false, 'runtime only'),
  ('P-4141', 4141, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4093'), 26), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4093'), 'Measured Values'), 'Fuel Spent From Level', 'Running total of fuel spent, from the CAN fuel level dropping x P-5604; refuels detected and not counted. Survives reboot; reset with P-4220.', 'float', 'L',
   NULL, NULL, NULL, 'RO', '{}'::text[],
   false, false, 'conditional', 'NanoV3 config_table.c', false, 'persist'),
  ('P-4142', 4142, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4093'), 26), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4093'), 'Measured Values'), 'Fuel Burned From Rate', 'Running total of fuel burned, integrated from the CAN fuel rate (P-4106). Survives reboot; reset with P-4220.', 'float', 'L',
   NULL, NULL, NULL, 'RO', '{}'::text[],
   false, false, 'conditional', 'NanoV3 config_table.c', false, 'persist')
ON CONFLICT (pid) DO NOTHING;

UPDATE nano_registry SET description = v.descr, updated_at = now()
  FROM (VALUES
    ('P-5604', 'Tank size, for fuel volume from the tank sender (P-4129) and from CAN (P-4140, P-4141). 0 = volume not reported.'),
    ('P-4218', 'Seconds between USB sniff-log reports of every CAN id seen (Custom mode only). 0 = off. Bench use, to find the P-4210..P-4215 maps.')
  ) AS v(pid, descr)
 WHERE nano_registry.pid = v.pid
   AND nano_registry.source = 'NanoV3 config_table.c'
   AND nano_registry.description IS DISTINCT FROM v.descr;

DO $$
DECLARE missing integer;
BEGIN
  SELECT count(*) INTO missing FROM (VALUES
    ('P-4215'), ('P-4220'), ('P-4140'), ('P-4141'), ('P-4142'), ('P-5604')) v(pid)
   WHERE NOT EXISTS (SELECT 1 FROM nano_registry r WHERE r.pid = v.pid);
  IF missing > 0 THEN
    RAISE EXCEPTION 'nano_registry still missing % fuel-accounting parameter(s)', missing;
  END IF;
  RAISE NOTICE 'nano_registry: P-4215, P-4220, P-4140..P-4142 present; P-5604 is the tank size for CAN fuel too.';
END $$;
