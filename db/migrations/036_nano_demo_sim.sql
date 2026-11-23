-- ============================================================================
-- 036_nano_demo_sim.sql
-- ----------------------------------------------------------------------------
-- A switch for the DEMO Nano Replay simulator, set from GreenVision.
--
-- One row per demo Nano device. The admin UI (/api/nano/demo-sim) writes
-- `enabled` and `scenario`; the worker (scripts/nano_demo_replay.py --control,
-- run as the nano-demo-sim systemd service) polls the row every few seconds,
-- publishes frames for the chosen scenario while it is enabled, and stamps
-- `worker_seen_at` so the UI can tell whether the worker is actually running.
--
-- Only demo devices may have a row: the API refuses any device whose IMEI does
-- not start with 99900 and whose name does not start with DEMO, and the worker
-- refuses the same. Nothing here touches a real unit.
--
-- scenario:
--   normal        replayed frames, producing, cell current within +-10%
--   alerts        cycles through catalog alerts, raising and clearing them
--   engine_off    engine stopped, plant not producing, no current
--   offline       no frames at all: the device goes offline after ~90 s
--   alert:<code>  hold one nano_alert_catalog alert raised (e.g. alert:A-03)
-- Re-runnable.
-- ============================================================================

CREATE TABLE IF NOT EXISTS nano_demo_sim (
  device_id      UUID PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
  enabled        BOOLEAN     NOT NULL DEFAULT FALSE,
  scenario       TEXT        NOT NULL DEFAULT 'normal'
                 CHECK (scenario IN ('normal', 'alerts', 'engine_off', 'offline')
                        OR scenario ~ '^alert:[A-Za-z0-9_-]{1,16}$'),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by     TEXT,
  worker_seen_at TIMESTAMPTZ,
  worker_note    TEXT
);

COMMENT ON TABLE nano_demo_sim IS
  'Demo Nano simulator switch: written by GreenVision, followed by nano_demo_replay.py --control.';
