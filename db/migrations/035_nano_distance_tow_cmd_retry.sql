-- ============================================================================
-- 035_nano_distance_tow_cmd_retry.sql
-- ----------------------------------------------------------------------------
-- Three things that arrive with NanoV3 firmware 3.0.4.
--
-- 1. Distance counted on the unit (NANOV3_TRUE_DISTANCE_PLAN.md). Each
--    telemetry frame carries a "dist" object beside "gps":
--      {"m":842,"odo":15234.118,"gap":0,"off":0,"still":6,"jump":0,"bad":31,
--       "n":58,"nofix":2,"ef":0}
--    metres counted since the previous frame, the metres left out by reason,
--    and the odometer in km. Kept whole in nano_frames.dist; the daily roll-up
--    and the UI are still to do. A full frame sends only m, odo and n.
--
-- 2. Tow alarm. P-4161 is true while the vehicle has moved with the engine
--    off: more than P-5809 metres from where it stopped, or moving for a
--    minute with the engine signal off. In every frame while P-5800 is on.
--
-- 3. Commands are no longer lost when the unit is offline. A set / stop /
--    start that was published but never answered is sent again each time the
--    unit comes back, until it answers or the command is 7 days old
--    (lib/nano-cmd-retry). attempts and last_sent_at record that.
--
-- Restart the ingest after applying: it checks nano_device_state.moved_engine_off
-- and nano_frames.dist at start-up and refuses to run without them.
-- Re-runnable.
-- ============================================================================

ALTER TABLE nano_frames
  ADD COLUMN IF NOT EXISTS dist JSONB;

COMMENT ON COLUMN nano_frames.dist IS
  'NanoV3 3.0.4 on: distance counted on the unit since the previous frame (m = counted metres; gap/off/still/jump/bad = metres left out by reason; n = samples; nofix = seconds without a position; ef = moved with the engine signal off; odo = odometer km). NULL on older firmware or with P-5800 off';

ALTER TABLE nano_device_state
  ADD COLUMN IF NOT EXISTS moved_engine_off BOOLEAN;

COMMENT ON COLUMN nano_device_state.moved_engine_off IS
  'P-4161 NanoV3: the vehicle has moved with the engine off (towed, carried, or the engine signal is dead); clears when the engine is on. NULL on firmware before 3.0.4 or with P-5800 off';

ALTER TABLE nano_commands
  ADD COLUMN IF NOT EXISTS attempts     INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN nano_commands.attempts IS
  'How many times this command has been published. More than 1 means the unit did not answer and it was sent again when the unit came back online';
COMMENT ON COLUMN nano_commands.last_sent_at IS
  'When the command was last published; NULL = only at sent_at';

-- The resend looks for open commands only.
CREATE INDEX IF NOT EXISTS nano_commands_open
  ON nano_commands (device_id, pid) WHERE status = 'sent';

INSERT INTO nano_registry
  (pid, pid_num, band, category, name, description, data_type, units,
   valid_range, enum_values, default_value, access, settable_via,
   sms_eligible, auth_req, presence, source, proposed, notes, generations)
VALUES
  ('P-5800', 5800, 39, 'GPS Distance', 'GPS Distance Enable', 'Count distance from GNSS on the unit and send it as the ''dist'' object of each telemetry frame.', 'bool', NULL,
   NULL, NULL, 'true', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist', '{NanoV3}'::text[]),
  ('P-5801', 5801, 39, 'GPS Distance', 'GPS Sample Interval (engine on)', 'Seconds between GNSS samples while the engine is on (or the vehicle is seen moving). Engine off uses P-604.', 'uint16', 's',
   '1..60', NULL, '1', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist', '{NanoV3}'::text[]),
  ('P-5802', 5802, 39, 'GPS Distance', 'Distance: Standing Speed', 'GNSS speed below this at both ends of a step means standing still: the step is position wander and is not counted.', 'float', 'km/h',
   '0..20', NULL, '3', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist', '{NanoV3}'::text[]),
  ('P-5803', 5803, 39, 'GPS Distance', 'Distance: Max HDOP', 'A sample with HDOP above this is a poor fix; steps to or from it are not counted.', 'float', NULL,
   '0.5..20', NULL, '2.5', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist', '{NanoV3}'::text[]),
  ('P-5804', 5804, 39, 'GPS Distance', 'Distance: Min Satellites', 'A sample with fewer satellites than this is a poor fix; steps to or from it are not counted.', 'uint16', NULL,
   '3..20', NULL, '5', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist', '{NanoV3}'::text[]),
  ('P-5805', 5805, 39, 'GPS Distance', 'Distance: Max Plausible Speed', 'A step implying a speed above this is a position jump and is not counted.', 'float', 'km/h',
   '30..400', NULL, '150', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist', '{NanoV3}'::text[]),
  ('P-5806', 5806, 39, 'GPS Distance', 'Distance: Max Speed Difference', 'A step whose implied speed differs from the GNSS speed by more than this is a position jump and is not counted.', 'float', 'km/h',
   '5..200', NULL, '30', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist', '{NanoV3}'::text[]),
  ('P-5807', 5807, 39, 'GPS Distance', 'Distance: Max Sample Gap', 'More than this many seconds between two samples is a gap: its straight-line distance is reported apart from the counted distance.', 'uint16', 's',
   '2..600', NULL, '5', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist', '{NanoV3}'::text[]),
  ('P-5808', 5808, 39, 'GPS Distance', 'GNSS Speed Unit', 'Unit the modem reports GNSS speed in. Knots on documented A7672S firmware.', 'enum', NULL,
   NULL, '{"Knots","km/h"}'::text[], 'Knots', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist', '{NanoV3}'::text[]),
  ('P-5809', 5809, 39, 'GPS Distance', 'Tow Alarm Distance', 'Metres from where the engine was switched off beyond which the vehicle counts as being moved. 0 = distance test off.', 'uint16', 'm',
   '0..5000', NULL, '200', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist', '{NanoV3}'::text[]),
  ('P-4160', 4160, 39, 'GPS Distance', 'GPS Odometer', 'Odometer counted from GNSS (counted + gap distance). Enter the vehicle''s reading once to start from it. Saved every km and when the engine stops. Sent as dist.odo.', 'float', 'km',
   '0..10000000', NULL, '0', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist', '{NanoV3}'::text[]),
  ('P-4161', 4161, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4093'), 26), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4093'), 'Measured Values'), 'Moved With Engine Off', 'The vehicle has moved with the engine off: more than P-5809 metres from where it stopped, or moving for a minute with the engine signal off. Clears when the engine is on.', 'bool', NULL,
   NULL, NULL, 'false', 'RO', '{}'::text[],
   false, false, 'conditional', 'NanoV3 config_table.c', false, 'runtime only', '{NanoV3}'::text[])
ON CONFLICT (pid) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgt_admin') THEN
    GRANT SELECT, INSERT, UPDATE ON nano_commands TO sgt_admin;
  END IF;
END $$;

DO $$
DECLARE missing integer;
BEGIN
  SELECT count(*) INTO missing FROM (VALUES
    ('P-5800'), ('P-5801'), ('P-5802'), ('P-5803'), ('P-5804'), ('P-5805'),
    ('P-5806'), ('P-5807'), ('P-5808'), ('P-5809'), ('P-4160'), ('P-4161')) v(pid)
   WHERE NOT EXISTS (SELECT 1 FROM nano_registry r WHERE r.pid = v.pid);
  IF missing > 0 THEN
    RAISE EXCEPTION 'nano_registry still missing % GPS distance parameter(s)', missing;
  END IF;
  RAISE NOTICE 'nano_registry: P-5800..P-5809, P-4160, P-4161 present; nano_frames.dist, nano_device_state.moved_engine_off and nano_commands.attempts ready.';
END $$;
