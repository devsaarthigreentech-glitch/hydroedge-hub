-- 037: demo Nano simulator, driving scenarios.
--
-- Adds 'driving' and 'driving_alerts' to the scenarios nano_demo_sim accepts
-- (migration 036). Safe to run twice.
BEGIN;
ALTER TABLE nano_demo_sim DROP CONSTRAINT IF EXISTS nano_demo_sim_scenario_check;
ALTER TABLE nano_demo_sim ADD CONSTRAINT nano_demo_sim_scenario_check
  CHECK (scenario IN ('normal', 'driving', 'alerts', 'driving_alerts', 'engine_off', 'offline')
         OR scenario ~ '^alert:[A-Za-z0-9_-]{1,16}$');
COMMIT;
