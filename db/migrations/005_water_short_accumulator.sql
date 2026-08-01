-- ============================================================================
-- 005_water_short_accumulator.sql
-- ----------------------------------------------------------------------------
-- Turns device_water_short_log from a wall-clock stopwatch into an accumulator
-- of engine-on time.
--
-- Before: the row stored first_seen_at, and the alarm fired once NOW() was an
-- hour past it. Stopping the engine deleted the row, so the hour restarted from
-- zero on the next start — and any engine-off time in between counted toward
-- the hour, which it should not have.
--
-- After: the row carries a running total.
--   short_seconds   engine-on seconds the shortage has held, across restarts
--   clear_seconds   how long the condition has read clear WHILE RUNNING; the
--                   episode is closed only once this passes the noise buffer
--   last_tick_at    when time was last credited; NULL means paused (engine off
--                   or telemetry stale), so the next scan credits nothing for
--                   the gap
--   updated_at      staleness check — an untouched episode eventually expires
--
-- first_seen_at and cleared_at keep their meaning, so the table is still a
-- readable history of shortage episodes.
--
-- Safe on a database where the table does not exist yet: the CREATE runs and
-- the ALTERs become no-ops.
-- ============================================================================

CREATE TABLE IF NOT EXISTS device_water_short_log (
  id            BIGSERIAL PRIMARY KEY,
  device_id     UUID        NOT NULL,
  signal        TEXT        NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cleared_at    TIMESTAMPTZ,
  short_seconds INTEGER     NOT NULL DEFAULT 0,
  clear_seconds INTEGER     NOT NULL DEFAULT 0,
  last_tick_at  TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE device_water_short_log
  ADD COLUMN IF NOT EXISTS short_seconds INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clear_seconds INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_tick_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN device_water_short_log.short_seconds IS
  'Accumulated engine-on seconds the shortage condition has held. Survives engine restarts; reset only when the condition reads clear while running for longer than the noise buffer.';
COMMENT ON COLUMN device_water_short_log.clear_seconds IS
  'Engine-on seconds the condition has read clear within the current episode. Noise buffer — the episode closes when this passes the threshold in the alert route.';
COMMENT ON COLUMN device_water_short_log.last_tick_at IS
  'Last scan that credited time. NULL means paused (engine off or telemetry stale) so the next scan credits nothing for the gap.';

-- One open episode per device+signal. The alert route upserts against this.
CREATE UNIQUE INDEX IF NOT EXISTS uq_device_water_short_open
  ON device_water_short_log (device_id, signal)
  WHERE cleared_at IS NULL;

-- ----------------------------------------------------------------------------
-- Reset episodes that are open right now.
--
-- Their elapsed wall-clock time includes engine-off periods, which is exactly
-- the measurement this migration removes — carrying it over would fire alarms
-- the new rule does not justify. Starting these from zero can delay a genuine
-- alert by up to an hour of running, which is the safe direction to err.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  reset_count INTEGER;
BEGIN
  UPDATE device_water_short_log
     SET short_seconds = 0,
         clear_seconds = 0,
         last_tick_at  = NULL,
         first_seen_at = NOW(),
         updated_at    = NOW()
   WHERE cleared_at IS NULL;

  GET DIAGNOSTICS reset_count = ROW_COUNT;
  RAISE NOTICE 'water accumulator: reset % open episode(s) to zero', reset_count;
END $$;
