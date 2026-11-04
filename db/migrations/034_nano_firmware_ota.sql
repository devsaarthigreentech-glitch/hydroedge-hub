-- ============================================================================
-- 034_nano_firmware_ota.sql
-- ----------------------------------------------------------------------------
-- Firmware updates from GreenVision, no firmware change needed on 3.x units.
--
-- nano_firmware  one row per uploaded .bin. The file itself is on the droplet's
--                disk (FIRMWARE_DIR), served at /fw/<token>.bin with no login
--                because the modem cannot log in. One row per version: a
--                re-upload with different bytes needs the old row deleted first.
-- nano_fw_jobs   one update of one device. Persisted so it survives a browser
--                close or an app restart; lib/nano-fw-runner advances it on the
--                server. batch_id is unused today, for a later fleet update.
--
-- A job sends P-5300..P-5303 one at a time, each waiting for the device's ack,
-- then P-5304 true, and follows P-4123 / P-4125 / P-104 to the result.
-- At most one running job per device (partial unique index).
-- Re-runnable.
-- ============================================================================

CREATE TABLE IF NOT EXISTS nano_firmware (
  id            BIGSERIAL PRIMARY KEY,
  version       TEXT        NOT NULL UNIQUE,
  sha256        TEXT        NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  size_bytes    BIGINT      NOT NULL CHECK (size_bytes > 0),
  file_path     TEXT        NOT NULL,
  token         TEXT        NOT NULL UNIQUE,
  source_name   TEXT,
  notes         TEXT,
  uploaded_by   TEXT,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  fetch_count   INTEGER     NOT NULL DEFAULT 0,
  last_fetch_at TIMESTAMPTZ,
  last_fetch_ip TEXT
);

CREATE TABLE IF NOT EXISTS nano_fw_jobs (
  id              BIGSERIAL PRIMARY KEY,
  device_id       UUID        NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  firmware_id     BIGINT      REFERENCES nano_firmware(id) ON DELETE SET NULL,
  batch_id        UUID,
  -- what was sent, copied so the record outlives a deleted firmware row
  target_version  TEXT        NOT NULL,
  url             TEXT        NOT NULL,
  sha256          TEXT        NOT NULL,
  size_bytes      BIGINT      NOT NULL,
  -- the device before the job
  from_version    TEXT,
  from_boot_id    TEXT,
  -- progress
  status          TEXT        NOT NULL DEFAULT 'sending'
                  CHECK (status IN ('sending', 'running', 'updated', 'rolled_back', 'failed', 'timed_out')),
  step            INTEGER     NOT NULL DEFAULT 0,
  command_id      TEXT,
  command_at      TIMESTAMPTZ,
  retries         INTEGER     NOT NULL DEFAULT 0,
  started_at      TIMESTAMPTZ,
  seen_active     BOOLEAN     NOT NULL DEFAULT false,
  seen_awaiting   BOOLEAN     NOT NULL DEFAULT false,
  ota_state       TEXT,
  ota_pct         INTEGER,
  detail          TEXT,
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS nano_fw_jobs_one_active
  ON nano_fw_jobs (device_id) WHERE status IN ('sending', 'running');
CREATE INDEX IF NOT EXISTS nano_fw_jobs_active
  ON nano_fw_jobs (id) WHERE status IN ('sending', 'running');
CREATE INDEX IF NOT EXISTS nano_fw_jobs_device
  ON nano_fw_jobs (device_id, created_at DESC);

-- Created by postgres when run with sudo -u postgres; the web app connects as
-- sgt_admin.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgt_admin') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON nano_firmware, nano_fw_jobs TO sgt_admin;
    GRANT USAGE, SELECT ON SEQUENCE nano_firmware_id_seq, nano_fw_jobs_id_seq TO sgt_admin;
  END IF;
END $$;

DO $$
DECLARE missing integer;
BEGIN
  IF to_regclass('public.nano_firmware') IS NULL OR to_regclass('public.nano_fw_jobs') IS NULL THEN
    RAISE EXCEPTION 'firmware tables were not created';
  END IF;
  -- The job drives these; each must exist and be settable from the cloud.
  SELECT count(*) INTO missing FROM (VALUES ('P-5300'), ('P-5301'), ('P-5302'), ('P-5303'), ('P-5304')) v(pid)
   WHERE NOT EXISTS (SELECT 1 FROM nano_registry r WHERE r.pid = v.pid AND 'Cloud' = ANY (r.settable_via));
  IF missing > 0 THEN
    RAISE EXCEPTION '% OTA parameter(s) of P-5300..P-5304 missing or not Cloud-settable in nano_registry', missing;
  END IF;
  RAISE NOTICE 'nano_firmware and nano_fw_jobs ready';
END $$;
