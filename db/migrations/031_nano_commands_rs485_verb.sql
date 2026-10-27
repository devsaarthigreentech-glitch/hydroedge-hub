-- ============================================================================
-- 031_nano_commands_rs485_verb.sql
-- ----------------------------------------------------------------------------
-- NanoV3 firmware accepts {"cmd":"rs485","val":"scan [lo] [hi]"} and
-- {"cmd":"rs485","val":"read <start> <count> [slave] [fc]"}: a remote probe of
-- the RS485 / Modbus bus. It answers once the bus job finishes (a read in under
-- 1 s, a 32-address scan up to ~10 s) with
--   {"t":"cfg","id":"rs485","val":"<result text>","res":"ok"|"failed"}
-- or refuses at once with the normal nack frame (res = the reason).
-- Logged in nano_commands with verb 'rs485', pid 'rs485'; the result text is
-- kept in reply_text (migration 024).
--
-- Same approach as 015 / 017: replace whatever CHECK mentions verb with one
-- that also allows rs485.
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
    CHECK (verb IN ('set', 'stop', 'start', 'get', 'getall', 'reboot', 'rs485'));
  RAISE NOTICE 'nano_commands_verb_check now allows rs485';
END $$;
