-- ============================================================================
-- 022_nanov3_engine_voltage_fuel_backup.sql
-- ----------------------------------------------------------------------------
-- The rest of the NanoV3 parameters added since 018 (021 registered P-5021).
-- After this the registry holds every parameter in config_table.c.
--
--   Engine detection from battery voltage (Engine Detection & Start Interlock)
--     P-5020          source: Signal (default) | Voltage | Either
--     P-5022..P-5025  on/off voltages for 12V and 24V systems
--     P-5029, P-5030  on/off voltages for 48V systems
--     P-5026, P-5027  on/off confirm times
--     P-5028          hold the stop line while the engine is judged off
--   Fuel level from the tank-sender voltage on GPIO3 (new category Fuel Sender)
--     P-5600..P-5605  settings;  P-4127..P-4130 readings
--   Backup battery: reports a cut vehicle supply (new category Backup Battery)
--     P-5700..P-5710  settings;  P-4131..P-4137 readings
--
-- Settings rows are RW and cloud-settable. Readings are RO and published only
-- while their feature is enabled (and, for values, only while trustworthy), so
-- each gets a nullable nano_device_state column: absent stays NULL, never 0.
--
-- Restart the ingest after applying: it validates its column list at start-up
-- and refuses to run without these columns.
-- ============================================================================

ALTER TABLE nano_device_state
  ADD COLUMN IF NOT EXISTS fuel_sender_pct     NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS fuel_sender_v       NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS fuel_sender_l       NUMERIC(8,1),
  ADD COLUMN IF NOT EXISTS fuel_sender_fault   BOOLEAN,
  ADD COLUMN IF NOT EXISTS power_source        TEXT,
  ADD COLUMN IF NOT EXISTS backup_batt_v       NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS backup_batt_pct     NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS backup_charge_state TEXT,
  ADD COLUMN IF NOT EXISTS power_loss_events   INTEGER,
  ADD COLUMN IF NOT EXISTS last_power_loss     TEXT,
  ADD COLUMN IF NOT EXISTS backup_selftest     TEXT;

COMMENT ON COLUMN nano_device_state.fuel_sender_pct     IS 'P-4127 NanoV3: fuel level from the tank sender, %; NULL while fuel sense is off or the reading is not trusted';
COMMENT ON COLUMN nano_device_state.fuel_sender_v       IS 'P-4128 NanoV3: tank-sender voltage after the divider ratio; NULL while fuel sense is off';
COMMENT ON COLUMN nano_device_state.fuel_sender_l       IS 'P-4129 NanoV3: fuel volume, L (needs P-5604 tank capacity); NULL otherwise';
COMMENT ON COLUMN nano_device_state.fuel_sender_fault   IS 'P-4130 NanoV3: sender reading out of range (open/short); sent only when true';
COMMENT ON COLUMN nano_device_state.power_source        IS 'P-4131 NanoV3: Vehicle | Backup; NULL while the backup battery is off';
COMMENT ON COLUMN nano_device_state.backup_batt_v       IS 'P-4132 NanoV3: backup cell voltage; NULL while no cell answers';
COMMENT ON COLUMN nano_device_state.backup_batt_pct     IS 'P-4133 NanoV3: backup cell charge, %; NULL while no cell answers';
COMMENT ON COLUMN nano_device_state.backup_charge_state IS 'P-4134 NanoV3: backup charger state; NULL while the backup battery is off';
COMMENT ON COLUMN nano_device_state.power_loss_events   IS 'P-4135 NanoV3: vehicle power losses seen; sent once there has been one';
COMMENT ON COLUMN nano_device_state.last_power_loss     IS 'P-4136 NanoV3: how the last power loss looked (step = cable/fuse/isolator, decay = flat battery)';
COMMENT ON COLUMN nano_device_state.backup_selftest     IS 'P-4137 NanoV3: result of the last backup-battery self-test';

INSERT INTO nano_registry
  (pid, pid_num, band, category, name, description, data_type, units,
   valid_range, enum_values, default_value, access, settable_via,
   sms_eligible, auth_req, presence, source, proposed, notes)
SELECT v.pid, v.pid_num,
       CASE v.grp
         WHEN 'engine' THEN COALESCE((SELECT band FROM nano_registry WHERE category = 'Engine Detection & Start Interlock' LIMIT 1), 30)
         WHEN 'fuel'   THEN 37
         WHEN 'backup' THEN 38
         ELSE COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4093'), 26)
       END,
       CASE v.grp
         WHEN 'engine' THEN 'Engine Detection & Start Interlock'
         WHEN 'fuel'   THEN 'Fuel Sender'
         WHEN 'backup' THEN 'Backup Battery'
         ELSE COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4093'), 'Measured Values')
       END,
       v.name, v.description, v.data_type, v.units, v.valid_range, v.enum_values,
       v.default_value, v.access,
       CASE WHEN v.access = 'RW' THEN '{"Cloud","CLI"}'::text[] ELSE '{}'::text[] END,
       false, false,
       CASE WHEN v.access = 'RO' THEN 'conditional' END,
       'NanoV3 config_table.c', false,
       CASE WHEN v.access = 'RO' THEN 'runtime only' ELSE 'persist' END
  FROM (VALUES
    -- engine detection from battery voltage ---------------------------------
    ('engine', 'P-5020', 5020, 'Engine Detect Source', 'How the unit decides the engine is running: Signal = engine-run wire (default), Voltage = battery voltage (needs P-5021), Either = whichever says running.',
     'enum', NULL, NULL, '{"Signal","Voltage","Either"}'::text[], 'Signal', 'RW'),
    ('engine', 'P-5022', 5022, 'Engine On Voltage (12V system)', 'Battery at or above this for P-5026 s = engine running. Must clear the resting / surface-charge voltage.',
     'float', 'V', '11..16', NULL::text[], '13.4', 'RW'),
    ('engine', 'P-5023', 5023, 'Engine Off Voltage (12V system)', 'Battery below this for P-5027 s = engine stopped. Keep below the lowest running voltage with the electrolyser loading it.',
     'float', 'V', '11..16', NULL::text[], '13.0', 'RW'),
    ('engine', 'P-5024', 5024, 'Engine On Voltage (24V system)', 'As P-5022, for 24V systems.',
     'float', 'V', '22..32', NULL::text[], '26.8', 'RW'),
    ('engine', 'P-5025', 5025, 'Engine Off Voltage (24V system)', 'As P-5023, for 24V systems.',
     'float', 'V', '22..32', NULL::text[], '26.0', 'RW'),
    ('engine', 'P-5029', 5029, 'Engine On Voltage (48V system)', 'As P-5022, for 48V systems.',
     'float', 'V', '44..64', NULL::text[], '53.6', 'RW'),
    ('engine', 'P-5030', 5030, 'Engine Off Voltage (48V system)', 'As P-5023, for 48V systems.',
     'float', 'V', '44..64', NULL::text[], '52.0', 'RW'),
    ('engine', 'P-5026', 5026, 'Engine On Confirm Time', 'How long the voltage must stay above the on threshold before the engine counts as running.',
     'uint16', 's', '1..120', NULL::text[], '5', 'RW'),
    ('engine', 'P-5027', 5027, 'Engine Off Confirm Time', 'How long the voltage must stay below the off threshold before the engine counts as stopped. Longer than on, so load sag is not read as a stop.',
     'uint16', 's', '1..600', NULL::text[], '20', 'RW'),
    ('engine', 'P-5028', 5028, 'Hold Stop While Engine Off', 'Hold the remote-stop line while the engine is judged off. How a unit with no alternator wire stops the box.',
     'bool', NULL, NULL, NULL::text[], 'false', 'RW'),
    -- fuel sender -------------------------------------------------------------
    ('fuel', 'P-5600', 5600, 'Fuel Sense Enable', 'Read fuel level from the tank-sender voltage on GPIO3, for engines with no CAN fuel level. Off by default.',
     'bool', NULL, NULL, NULL::text[], 'false', 'RW'),
    ('fuel', 'P-5601', 5601, 'Fuel Input Divider Ratio', 'Board divider ratio, sender volts / pin volts (4.0 for 30k + 10k).',
     'float', NULL, '1..20', NULL::text[], '4.0', 'RW'),
    ('fuel', 'P-5602', 5602, 'Fuel Sender Empty Voltage', 'Sender voltage with the tank empty. A sender that reads high when empty just has empty > full.',
     'float', 'V', '0..12', NULL::text[], '0.5', 'RW'),
    ('fuel', 'P-5603', 5603, 'Fuel Sender Full Voltage', 'Sender voltage with the tank full.',
     'float', 'V', '0..12', NULL::text[], '4.5', 'RW'),
    ('fuel', 'P-5604', 5604, 'Fuel Tank Capacity', 'Tank size, for fuel volume (P-4129). 0 = volume not reported.',
     'float', 'L', '0..10000', NULL::text[], '0', 'RW'),
    ('fuel', 'P-5605', 5605, 'Fuel Level Smoothing', 'Averaging window, so sloshing does not move the level.',
     'uint16', 's', '0..600', NULL::text[], '30', 'RW'),
    -- backup battery ----------------------------------------------------------
    ('backup', 'P-5700', 5700, 'Backup Battery Enable', 'Use the optional backup cell (MAX17048 gauge + charger on a PCF8575 line) to report a cut vehicle supply. Off by default.',
     'bool', NULL, NULL, NULL::text[], 'false', 'RW'),
    ('backup', 'P-5701', 5701, 'Vehicle Power Loss Voltage', 'Raw input below this = vehicle supply lost.',
     'float', 'V', '2..9', NULL::text[], '4.0', 'RW'),
    ('backup', 'P-5702', 5702, 'Vehicle Power Loss Time', 'How long the input must stay below P-5701 before it counts as a power loss.',
     'uint16', 'ms', '200..10000', NULL::text[], '1000', 'RW'),
    ('backup', 'P-5703', 5703, 'Backup Charge Start Voltage', 'Charger enabled below this cell voltage.',
     'float', 'V', '3.5..4.15', NULL::text[], '3.90', 'RW'),
    ('backup', 'P-5704', 5704, 'Backup Charge Stop Voltage', 'Charger disabled above this, so the cell rests at 60-90 % instead of 4.2 V.',
     'float', 'V', '3.6..4.2', NULL::text[], '4.10', 'RW'),
    ('backup', 'P-5705', 5705, 'Charger Enable Expander Line', 'PCF8575 line (P0..P15) driving the charger enable.',
     'uint16', NULL, '0..15', NULL::text[], '3', 'RW'),
    ('backup', 'P-5706', 5706, 'Charger Enable Active Level', 'Expander output level that enables the charger.',
     'enum', NULL, NULL, '{"High","Low"}'::text[], 'Low', 'RW'),
    ('backup', 'P-5707', 5707, 'Report Interval On Backup', 'Heartbeat interval while running on the backup cell.',
     'uint16', 's', '30..3600', NULL::text[], '600', 'RW'),
    ('backup', 'P-5708', 5708, 'Backup Low Battery Warning', 'Cell voltage that counts as low.',
     'float', 'V', '3.3..3.9', NULL::text[], '3.55', 'RW'),
    ('backup', 'P-5709', 5709, 'Power Loss SMS Alert', 'SMS the admin numbers when vehicle power is lost. Off by default (per customer).',
     'bool', NULL, NULL, NULL::text[], 'false', 'RW'),
    ('backup', 'P-5710', 5710, 'Backup Self-Test Interval', 'Days between backup-battery self-tests (result in P-4137). 0 = off.',
     'uint16', 'days', '0..90', NULL::text[], '7', 'RW'),
    -- readings ----------------------------------------------------------------
    ('measured', 'P-4127', 4127, 'Fuel Level (Sender)', 'Fuel level from the tank sender. Sent while fuel sense is on and the reading is trusted.',
     'float', '%', '0..100', NULL::text[], '0', 'RO'),
    ('measured', 'P-4128', 4128, 'Fuel Sender Voltage', 'Sender voltage after the divider ratio. Sent while fuel sense is on.',
     'float', 'V', NULL, NULL::text[], '0', 'RO'),
    ('measured', 'P-4129', 4129, 'Fuel Volume', 'Fuel in the tank (needs P-5604). Sent while the level is trusted.',
     'float', 'L', NULL, NULL::text[], '0', 'RO'),
    ('measured', 'P-4130', 4130, 'Fuel Sender Fault', 'Sender reading out of range (open or shorted wire). Sent only when true.',
     'bool', NULL, NULL, NULL::text[], 'false', 'RO'),
    ('measured', 'P-4131', 4131, 'Power Source', 'Vehicle or Backup. Sent while the backup battery is enabled.',
     'string', NULL, NULL, NULL::text[], 'Vehicle', 'RO'),
    ('measured', 'P-4132', 4132, 'Backup Battery Voltage', 'Backup cell voltage. Sent while a cell answers.',
     'float', 'V', NULL, NULL::text[], '0', 'RO'),
    ('measured', 'P-4133', 4133, 'Backup Battery Charge Percent', 'Backup cell charge. Sent while a cell answers.',
     'float', '%', '0..100', NULL::text[], '0', 'RO'),
    ('measured', 'P-4134', 4134, 'Backup Charge State', 'Backup charger state. Sent while the backup battery is enabled.',
     'string', NULL, NULL, NULL::text[], 'None', 'RO'),
    ('measured', 'P-4135', 4135, 'Power Loss Events', 'Vehicle power losses seen. Sent once there has been one.',
     'uint32', NULL, NULL, NULL::text[], '0', 'RO'),
    ('measured', 'P-4136', 4136, 'Last Power Loss', 'How the last loss looked: step = cable, fuse or isolator; decay = flat vehicle battery.',
     'string', NULL, NULL, NULL::text[], 'none', 'RO'),
    ('measured', 'P-4137', 4137, 'Backup Self-Test', 'Result of the last backup-battery self-test (P-5710).',
     'string', NULL, NULL, NULL::text[], 'Not run', 'RO')
  ) AS v(grp, pid, pid_num, name, description, data_type, units, valid_range,
         enum_values, default_value, access)
ON CONFLICT (pid) DO NOTHING;

DO $$
DECLARE missing integer;
BEGIN
  SELECT count(*) INTO missing FROM (VALUES
    ('P-5020'), ('P-5022'), ('P-5023'), ('P-5024'), ('P-5025'), ('P-5026'), ('P-5027'),
    ('P-5028'), ('P-5029'), ('P-5030'),
    ('P-5600'), ('P-5601'), ('P-5602'), ('P-5603'), ('P-5604'), ('P-5605'),
    ('P-5700'), ('P-5701'), ('P-5702'), ('P-5703'), ('P-5704'), ('P-5705'), ('P-5706'),
    ('P-5707'), ('P-5708'), ('P-5709'), ('P-5710'),
    ('P-4127'), ('P-4128'), ('P-4129'), ('P-4130'), ('P-4131'), ('P-4132'), ('P-4133'),
    ('P-4134'), ('P-4135'), ('P-4136'), ('P-4137')) v(pid)
   WHERE NOT EXISTS (SELECT 1 FROM nano_registry r WHERE r.pid = v.pid);
  IF missing > 0 THEN
    RAISE EXCEPTION 'nano_registry still missing % NanoV3 parameter(s)', missing;
  END IF;
  RAISE NOTICE 'nano_registry: 38 NanoV3 parameters (engine voltage, fuel sender, backup battery) present.';
END $$;
