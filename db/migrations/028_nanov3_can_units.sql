-- ============================================================================
-- 028_nanov3_can_units.sql
-- ----------------------------------------------------------------------------
-- Units for the CAN engine readings, as the NanoV3 firmware sends them. Some
-- registry rows predate NanoV3 (Gen 2 seed) and carry no unit, so the Live
-- tab's Engine (CAN / Modbus) cards showed bare numbers. Set them here so
-- every view that reads nano_registry.units picks them up.
-- ============================================================================

UPDATE nano_registry SET units = v.units, updated_at = now()
  FROM (VALUES
    ('P-4104', 'rpm'),
    ('P-4105', '%'),
    ('P-4106', 'L/h'),
    ('P-4107', 'L'),
    ('P-4108', 'h'),
    ('P-4115', 'km/h'),
    ('P-4116', '°C'),
    ('P-4117', '%'),
    ('P-4140', 'L'),
    ('P-4141', 'L'),
    ('P-4142', 'L')
  ) AS v(pid, units)
 WHERE nano_registry.pid = v.pid
   AND nano_registry.units IS DISTINCT FROM v.units;

DO $$
DECLARE wrong integer;
BEGIN
  SELECT count(*) INTO wrong FROM nano_registry
   WHERE pid IN ('P-4104','P-4105','P-4106','P-4107','P-4108','P-4115','P-4116','P-4117','P-4140','P-4141','P-4142')
     AND COALESCE(units, '') = '';
  IF wrong > 0 THEN
    RAISE EXCEPTION 'nano_registry: % CAN reading(s) still without a unit', wrong;
  END IF;
  RAISE NOTICE 'nano_registry: CAN reading units set.';
END $$;
