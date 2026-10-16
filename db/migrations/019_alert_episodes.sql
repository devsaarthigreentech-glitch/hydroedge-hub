-- ============================================================================
-- 019_alert_episodes.sql
-- ----------------------------------------------------------------------------
-- The alert scan stops treating "what is wrong at this instant" as the whole
-- story. Two new tables:
--
-- 1. alert_episodes — one row per fault occurrence on a device.
--      first_seen_at   the scan that first detected it
--      last_seen_at    the latest scan that still detected it
--      cleared_at      set once it has gone undetected for the clear grace
--                      period (the alert route's EPISODE_CLEAR_GRACE); stored
--                      as last_seen_at, i.e. roughly when it really cleared
--    Water and current alarms only evaluate while the engine runs, so before
--    this table a fault that happened overnight and stopped with the engine
--    never reached the 09:00 email. The daily email now reads from here:
--    everything still open, plus everything that cleared since the last one.
--
--    Delivery bookkeeping lives on the row so a failed send never consumes it:
--      customer_reported_at   last DELIVERED customer digest that listed it
--      support_notified_at    support digest that announced it as new
--      immediate_sent_at      last DELIVERED urgent email for it
--      immediate_attempt_at   last urgent attempt, delivered or not (throttle)
--
-- 2. alert_dispatches — one row per email attempt: customer digest, support
--    digest or immediate. The daily and 6-hourly gates read it, and the Alert
--    Activity screen shows it. notification_log is still written per alert for
--    the weekly report.
--
-- Idempotent. Nothing is backfilled: episodes start with the first scan after
-- deploy.
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_episodes (
  id                    BIGSERIAL   PRIMARY KEY,
  device_id             UUID        NOT NULL,
  customer_id           UUID        NOT NULL,
  alert_id              TEXT        NOT NULL,
  severity              TEXT        NOT NULL,
  message               TEXT        NOT NULL,
  action                TEXT        NOT NULL,
  first_seen_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cleared_at            TIMESTAMPTZ,
  customer_reported_at  TIMESTAMPTZ,
  support_notified_at   TIMESTAMPTZ,
  immediate_sent_at     TIMESTAMPTZ,
  immediate_attempt_at  TIMESTAMPTZ
);

COMMENT ON TABLE alert_episodes IS
  'One row per fault occurrence per device, written by POST /api/alerts/check. Open while cleared_at IS NULL.';
COMMENT ON COLUMN alert_episodes.message IS
  'Latest alarm text. Refreshed every scan, so durations (e.g. water short time) stay current.';
COMMENT ON COLUMN alert_episodes.customer_reported_at IS
  'Last delivered customer digest that included this episode. A failed send never sets it.';

-- One open episode per device and alarm. The scan upserts against this.
CREATE UNIQUE INDEX IF NOT EXISTS uq_alert_episodes_open
  ON alert_episodes (device_id, alert_id)
  WHERE cleared_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_alert_episodes_customer_seen
  ON alert_episodes (customer_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_alert_episodes_first_seen
  ON alert_episodes (first_seen_at DESC);

CREATE TABLE IF NOT EXISTS alert_dispatches (
  id             BIGSERIAL   PRIMARY KEY,
  kind           TEXT        NOT NULL,
  customer_id    UUID,
  sent_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status         TEXT        NOT NULL,
  recipients     TEXT        NOT NULL DEFAULT '',
  cc             TEXT        NOT NULL DEFAULT '',
  episode_count  INTEGER     NOT NULL DEFAULT 0,
  subject        TEXT        NOT NULL DEFAULT ''
);

COMMENT ON TABLE alert_dispatches IS
  'Every alert email attempt. status is ''sent'' or ''error: ...''. customer_id is NULL for the support digest.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'alert_dispatches_kind_check'
  ) THEN
    ALTER TABLE alert_dispatches
      ADD CONSTRAINT alert_dispatches_kind_check
      CHECK (kind IN ('customer_digest', 'support_digest', 'immediate'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_alert_dispatches_kind_sent
  ON alert_dispatches (kind, customer_id, sent_at DESC);

-- ----------------------------------------------------------------------------
-- Timezones. The daily email goes out at 09:00 in the customer's own zone,
-- read from customers.timezone. A blank value falls back to Asia/Kolkata in
-- the route; the column already exists on most installs.
-- ----------------------------------------------------------------------------
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS timezone TEXT;
