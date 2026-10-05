-- ============================================================================
-- 017_nano_commands_reboot_verb.sql
-- ----------------------------------------------------------------------------
-- NanoV3 firmware 4b74d6a accepts {"cmd":"reboot"}: it queues an
-- acknowledgement ({"t":"cfg","id":"reboot","res":"rebooting"}) and restarts
-- about 4 s later. Logged in nano_commands with verb 'reboot', pid 'reboot'.
--
-- Same approach as 015: replace whatever CHECK mentions verb with one that
-- also allows reboot.
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
    CHECK (verb IN ('set', 'stop', 'start', 'get', 'getall', 'reboot'));
END $$;
