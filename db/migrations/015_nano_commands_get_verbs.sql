-- ============================================================================
-- 015_nano_commands_get_verbs.sql
-- ----------------------------------------------------------------------------
-- NanoV3 firmware 40a3f6b adds two READ commands, so the cloud can finally ask
-- a device for its settings instead of only learning them when they change:
--   {"cmd":"get","id":"P-xxx"}   one parameter
--   {"cmd":"getall"}             every parameter (logged with pid '*')
-- Both are answered on the ordinary t:cfg frame.
--
-- nano_commands was created outside this repo, so whether its verb column has
-- a CHECK constraint (and under which name) is not known here. Any CHECK that
-- mentions verb is replaced by one that also allows get / getall; if there was
-- none, this adds one. Rows already in the table only use set/stop/start, so
-- the new constraint validates immediately.
-- ============================================================================

DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'nano_commands'::regclass
       AND contype  = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%verb%'
  LOOP
    EXECUTE format('ALTER TABLE nano_commands DROP CONSTRAINT %I', c.conname);
    RAISE NOTICE 'dropped %', c.conname;
  END LOOP;

  ALTER TABLE nano_commands
    ADD CONSTRAINT nano_commands_verb_check
    CHECK (verb IN ('set', 'stop', 'start', 'get', 'getall'));
END $$;
