-- ============================================================================
-- 033_nanov3_can_sim.sql
-- ----------------------------------------------------------------------------
-- NanoV3 firmware 3.0.2 (9b20d3c) adds a bench RPM simulator for Custom CAN:
-- while P-4227 > 0 the unit feeds the P-4226 profile through the P-4210 map in
-- place of the bus RPM, so adaptive RCS (P-5201 = Auto) can be tested with no
-- engine. P-4104 and the RCS zone follow it as they would a vehicle.
--
--   P-4226  CAN Sim RPM Profile   "RPM:SECS ..." points (ramp, loops) or "rec"
--   P-4227  CAN Sim Run (min)     0..240; 0 = off. Firmware sets it back to 0
--                                 when the time is up; not kept over a reboot
--   P-4228  CAN Sim State         RO telemetry: Running n/m min, r rpm / Done /
--                                 Stopped / Failed: reason. In every frame once
--                                 the simulator has been used since boot, so
--                                 simulated RPM can be told from an engine.
--
-- Restart the ingest after applying: it checks the can_sim_state column at
-- start-up and refuses to run without it.
-- ============================================================================

ALTER TABLE nano_device_state
  ADD COLUMN IF NOT EXISTS can_sim_state TEXT;

COMMENT ON COLUMN nano_device_state.can_sim_state IS
  'P-4228 NanoV3: bench RPM simulator state (Running n/m min, r rpm / Done / Stopped / Failed: reason); NULL until the simulator is used, and on firmware before 3.0.2';

INSERT INTO nano_registry
  (pid, pid_num, band, category, name, description, data_type, units,
   valid_range, enum_values, default_value, access, settable_via,
   sms_eligible, auth_req, presence, source, proposed, notes, generations)
VALUES
  ('P-4226', 4226, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4200'), 27), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4200'), 'CAN'), 'CAN Sim RPM Profile', 'Bench RPM simulator profile: points ''RPM:SECS'' (ramp to RPM over SECS, 0 = jump; loops), e.g. ''800:0 800:30 1800:10 1800:60 800:20'', or ''rec'' for a recorded 30 s Brezza trace.', 'string', NULL,
   NULL, NULL, 'rec', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist', '{NanoV3}'::text[]),
  ('P-4227', 4227, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4200'), 27), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4200'), 'CAN'), 'CAN Sim Run (min)', 'Minutes to run the bench RPM simulator (needs P-4204 = Custom and a P-4210 map). 0 = off. Simulated RPM replaces the bus RPM for P-4104 and adaptive RCS; returns to 0 by itself; not kept over a reboot.', 'uint16', 'min',
   '0..240', NULL, '0', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'runtime only', '{NanoV3}'::text[]),
  ('P-4228', 4228, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4093'), 26), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4093'), 'Measured Values'), 'CAN Sim State', 'Bench RPM simulator state: Running n/m min, rpm / Done / Stopped / Failed: reason. Present in telemetry whenever the simulator has been used since boot.', 'string', NULL,
   NULL, NULL, 'Idle', 'RO', '{}'::text[],
   false, false, 'conditional', 'NanoV3 config_table.c', false, 'runtime only', '{NanoV3}'::text[])
ON CONFLICT (pid) DO NOTHING;

DO $$
DECLARE missing integer;
BEGIN
  SELECT count(*) INTO missing FROM (VALUES
    ('P-4226'), ('P-4227'), ('P-4228')) v(pid)
   WHERE NOT EXISTS (SELECT 1 FROM nano_registry r WHERE r.pid = v.pid);
  IF missing > 0 THEN
    RAISE EXCEPTION 'nano_registry still missing % CAN simulator parameter(s)', missing;
  END IF;
  RAISE NOTICE 'nano_registry: P-4226..P-4228 present; can_sim_state column ready.';
END $$;
