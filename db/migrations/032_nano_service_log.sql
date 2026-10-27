-- ============================================================================
-- 032_nano_service_log.sql
-- ----------------------------------------------------------------------------
-- Field service log for Nano devices, shown on the HEALTH tab next to the
-- issues detected from the frame history (lib/nano-health.ts). An engineer
-- records what was found and fixed; an entry tied to a finding (finding = its
-- key, e.g. 'bubbler_mismatch') marks that finding resolved when it is logged
-- after the finding's last occurrence. If the issue comes back, the finding
-- reopens by itself.
--
-- kind: fix | part | config | inspection | note
-- Re-runnable.
-- ============================================================================

CREATE TABLE IF NOT EXISTS nano_service_log (
  id          BIGSERIAL PRIMARY KEY,
  device_id   UUID        NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  author      TEXT,
  kind        TEXT        NOT NULL CHECK (kind IN ('fix', 'part', 'config', 'inspection', 'note')),
  finding     TEXT,
  notes       TEXT        NOT NULL CHECK (length(notes) BETWEEN 1 AND 2000)
);

CREATE INDEX IF NOT EXISTS nano_service_log_device_idx ON nano_service_log (device_id, created_at DESC);

-- Created by postgres when run with sudo -u postgres; the web app connects as
-- sgt_admin.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgt_admin') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON nano_service_log TO sgt_admin;
    GRANT USAGE, SELECT ON SEQUENCE nano_service_log_id_seq TO sgt_admin;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.nano_service_log') IS NULL THEN
    RAISE EXCEPTION 'nano_service_log was not created';
  END IF;
  RAISE NOTICE 'nano_service_log ready';
END $$;
