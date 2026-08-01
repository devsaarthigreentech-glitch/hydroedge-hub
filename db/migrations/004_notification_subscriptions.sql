-- ============================================================================
-- 004_notification_subscriptions.sql
-- ----------------------------------------------------------------------------
-- Adds subscribe / unsubscribe switches for the alert email system.
--
-- Three independent switches now gate every alert email. All default to ON, so
-- applying this migration changes nobody's behaviour except the seed below.
--
--   customers.notifications_enabled   company-wide mute. OFF = nobody at that
--                                     company is emailed, and its devices are
--                                     not even scanned.
--   users.notifications_enabled       per-person mute. OFF = that one person is
--                                     dropped from the recipient list.
--   device_alert_settings.alerts_enabled   per-device mute (pre-existing).
--
-- A person is emailed only when all of: their company is enabled, they are
-- enabled, they are active, and they have an email address.
--
-- Replaces the hardcoded customer-id exclusion that used to live in
-- src/app/api/alerts/check/route.ts.
-- ============================================================================

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN customers.notifications_enabled IS
  'Company-wide alert email switch. FALSE mutes every user at this company and skips its devices during the alert scan.';

COMMENT ON COLUMN users.notifications_enabled IS
  'Per-user alert email switch. FALSE drops this user from alert recipient lists even when their company is enabled.';

-- The alert scan filters devices by the company switch, then looks up that
-- company's enabled users. Both are partial indexes because the scan only ever
-- asks for the enabled, non-deleted rows.
CREATE INDEX IF NOT EXISTS idx_customers_notifications_enabled
  ON customers (id)
  WHERE notifications_enabled AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_notifications_enabled
  ON users (customer_id)
  WHERE notifications_enabled AND deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- Seed: mute Turbo Energy.
--
-- Matches the customer id that was previously hardcoded in the alert route, and
-- separately any customer whose name or company name mentions "turbo energy" —
-- so this still does the right thing if that id is stale or if the company has
-- more than one row (parent + sub-customer). Idempotent: re-running is a no-op.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  muted INTEGER;
  r     RECORD;
BEGIN
  UPDATE customers
     SET notifications_enabled = FALSE,
         updated_at            = NOW()
   WHERE deleted_at IS NULL
     AND notifications_enabled = TRUE
     AND (
           id = '0670fea8-0d6c-4ba2-a026-0c764d7c5d67'
           OR name         ILIKE '%turbo energy%'
           OR company_name ILIKE '%turbo energy%'
         );

  GET DIAGNOSTICS muted = ROW_COUNT;
  RAISE NOTICE 'notifications: muted % customer row(s) for Turbo Energy', muted;

  FOR r IN
    SELECT name, company_name FROM customers
     WHERE deleted_at IS NULL AND notifications_enabled = FALSE
     ORDER BY name
  LOOP
    RAISE NOTICE 'notifications: OFF -> % (%)', r.name, COALESCE(r.company_name, 'no company name');
  END LOOP;
END $$;
