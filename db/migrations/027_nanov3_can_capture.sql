-- ============================================================================
-- 027_nanov3_can_capture.sql
-- ----------------------------------------------------------------------------
-- NanoV3 firmware 28bc6a1 records raw CAN for up to 60 s on command and
-- uploads it in chunks on the telemetry topic ({"t":"canlog",...}), so a
-- truck's bus can be captured without a laptop on site. GreenVision keeps the
-- chunks and rebuilds a candump .log (SavvyCAN, cantools) on download.
--
--   P-4221  CAN Capture Duration       s, 1..60, default 30
--   P-4222  CAN Capture ID Filter      hex ids, up to 16; empty = all
--   P-4223  CAN Capture Changes Only   bool
--   P-4224  CAN Capture Start          bool action; firmware sets it back to false
--   P-4225  CAN Capture State          RO telemetry: Idle / Capturing / Uploading
--                                      / Done / Failed
--
-- nano_can_captures       one row per (device, capture id = unix start time)
-- nano_can_capture_chunks the base64-decoded slices of the record stream, one
--                         row per seq; a chunk sent twice is stored once.
-- A capture is complete once all n chunks are in. The ingest keeps the newest
-- 20 captures per device and drops any older than 30 days.
--
-- Restart the ingest after applying: it checks these tables and the
-- can_capture_state column at start-up and refuses to run without them.
-- ============================================================================

ALTER TABLE nano_device_state
  ADD COLUMN IF NOT EXISTS can_capture_state TEXT;

COMMENT ON COLUMN nano_device_state.can_capture_state IS
  'P-4225 NanoV3: CAN capture progress (Idle / Capturing n/m s, frames / Uploading n% / Done: frames, KB / Failed: reason); NULL on firmware before 28bc6a1';

CREATE TABLE IF NOT EXISTS nano_can_captures (
  device_id   UUID        NOT NULL,
  cap         BIGINT      NOT NULL,          -- capture id from the device (unix start time)
  n           INTEGER     NOT NULL,          -- chunks the device will send
  received    INTEGER     NOT NULL DEFAULT 0,
  complete    BOOLEAN     NOT NULL DEFAULT false,
  kbps        INTEGER,
  t0          BIGINT,                        -- unix start; 0 = device clock unknown
  frames      INTEGER,
  dropped     INTEGER,
  bytes       INTEGER     NOT NULL DEFAULT 0,
  first_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (device_id, cap)
);

CREATE TABLE IF NOT EXISTS nano_can_capture_chunks (
  device_id   UUID    NOT NULL,
  cap         BIGINT  NOT NULL,
  seq         INTEGER NOT NULL,
  data        BYTEA   NOT NULL,
  PRIMARY KEY (device_id, cap, seq),
  FOREIGN KEY (device_id, cap) REFERENCES nano_can_captures (device_id, cap) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS nano_can_captures_first_at ON nano_can_captures (first_at);

-- Applied as postgres, the new tables belong to postgres; the ingest and the
-- web app connect as sgt_admin.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgt_admin') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON nano_can_captures, nano_can_capture_chunks TO sgt_admin;
  END IF;
END $$;

COMMENT ON TABLE nano_can_captures IS
  'NanoV3 remote CAN captures (t:canlog). Download rebuilds a candump .log from the chunks.';
COMMENT ON TABLE nano_can_capture_chunks IS
  'Decoded slices of a capture''s record stream (u32 t_ms, u32 id [bit31 = 29-bit], u8 dlc, data; little-endian). Join seq 0..n-1 in order.';

INSERT INTO nano_registry
  (pid, pid_num, band, category, name, description, data_type, units,
   valid_range, enum_values, default_value, access, settable_via,
   sms_eligible, auth_req, presence, source, proposed, notes)
VALUES
  ('P-4221', 4221, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4200'), 27), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4200'), 'CAN'), 'CAN Capture Duration', 'Length of a remote CAN capture, 1-60 s.', 'uint16', 's',
   '1..60', NULL, '30', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist'),
  ('P-4222', 4222, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4200'), 27), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4200'), 'CAN'), 'CAN Capture ID Filter', 'Optional CAN capture ID filter: hex ids separated by commas or spaces (e.g. ''124, 1B8, 3B9''), up to 16. Empty = every id.', 'string', NULL,
   NULL, NULL, '', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist'),
  ('P-4223', 4223, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4200'), 27), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4200'), 'CAN'), 'CAN Capture Changes Only', 'CAN capture keeps only frames whose payload changed since the previous frame of that id (much smaller upload).', 'bool', NULL,
   NULL, NULL, 'false', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'persist'),
  ('P-4224', 4224, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4200'), 27), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4200'), 'CAN'), 'CAN Capture Start', 'Set true to start a CAN capture with P-4221..P-4223. Listen-only (OBD2 polling pauses). Returns to false by itself; upload follows automatically.', 'bool', NULL,
   NULL, NULL, 'false', 'RW', '{"Cloud","CLI"}'::text[],
   false, false, NULL, 'NanoV3 config_table.c', false, 'runtime only'),
  ('P-4225', 4225, COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4093'), 26), COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4093'), 'Measured Values'), 'CAN Capture State', 'CAN capture progress: Idle / Capturing n/m s / Uploading n% / Done: frames, KB / Failed: reason.', 'string', NULL,
   NULL, NULL, 'Idle', 'RO', '{}'::text[],
   false, false, 'conditional', 'NanoV3 config_table.c', false, 'runtime only')
ON CONFLICT (pid) DO NOTHING;

DO $$
DECLARE missing integer;
BEGIN
  SELECT count(*) INTO missing FROM (VALUES
    ('P-4221'), ('P-4222'), ('P-4223'), ('P-4224'), ('P-4225')) v(pid)
   WHERE NOT EXISTS (SELECT 1 FROM nano_registry r WHERE r.pid = v.pid);
  IF missing > 0 THEN
    RAISE EXCEPTION 'nano_registry still missing % CAN capture parameter(s)', missing;
  END IF;
  RAISE NOTICE 'nano_registry: P-4221..P-4225 present; CAN capture tables ready.';
END $$;
