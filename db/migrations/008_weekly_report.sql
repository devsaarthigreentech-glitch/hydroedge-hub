-- ============================================================================
-- 008_weekly_report.sql
-- ----------------------------------------------------------------------------
-- Support for the weekly customer report (POST /api/reports/weekly).
--
-- 1. devices.weekly_report — per-device override for report inclusion.
--
--    A customer can have far more devices ASSIGNED than actually running: one
--    account today carries 26 devices of which two are commissioned and
--    reporting. Listing the other 24 as "0 hours, no data" every Monday would
--    make the report unreadable and imply faults that do not exist.
--
--    So the report decides inclusion by a rule ('auto', the default):
--      status = 'active'
--      AND commissioned (tested, or already carrying an SGT-Gx series name)
--      AND has reported within 30 days of the report week
--
--    and this column lets a person overrule it when the rule is wrong:
--      'always'  include even if the rule says no (e.g. a unit that has been
--                silent for a month and the customer wants that fact in writing)
--      'never'   exclude even if the rule says yes (e.g. a demo or bench unit)
--
--    GET /api/reports/weekly?customer_id=<uuid> shows the decision and the
--    reason for every device, so the rule can be checked before anything sends.
--
-- 2. weekly_report_log — one row per company per report week that was sent.
--    The partial unique index is the double-send guard: the route refuses to
--    send a second report for the same company and week unless ?force=1.
--    Failed sends are logged too (for the audit trail) but do not close the
--    gate, so a Gmail hiccup on Monday morning is retried by the next run.
--
-- Safe to re-run: everything is IF NOT EXISTS.
-- ============================================================================

ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS weekly_report TEXT NOT NULL DEFAULT 'auto';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'devices'::regclass
       AND conname  = 'devices_weekly_report_check'
  ) THEN
    ALTER TABLE devices
      ADD CONSTRAINT devices_weekly_report_check
      CHECK (weekly_report IN ('auto', 'always', 'never'));
  END IF;
END $$;

COMMENT ON COLUMN devices.weekly_report IS
  'Weekly customer report inclusion: auto (active + commissioned + reported within 30 days), always, or never.';

CREATE TABLE IF NOT EXISTS weekly_report_log (
  id            BIGSERIAL    PRIMARY KEY,
  customer_id   UUID         NOT NULL,
  week_start    DATE         NOT NULL,   -- IST Monday
  week_end      DATE         NOT NULL,   -- IST Sunday (inclusive)
  device_count  INTEGER      NOT NULL DEFAULT 0,
  recipients    TEXT,                    -- comma-separated To list actually used
  email_status  TEXT         NOT NULL,   -- 'sent' or 'error: ...'
  summary       JSONB,                   -- fleet totals, for the audit trail
  sent_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE weekly_report_log IS
  'One row per company per report week attempted by POST /api/reports/weekly. Only rows with email_status = sent close the double-send gate.';

-- The double-send guard. Partial so a failed attempt never blocks the retry.
CREATE UNIQUE INDEX IF NOT EXISTS uq_weekly_report_sent
  ON weekly_report_log (customer_id, week_start)
  WHERE email_status = 'sent';

CREATE INDEX IF NOT EXISTS idx_weekly_report_log_customer
  ON weekly_report_log (customer_id, week_start DESC);
