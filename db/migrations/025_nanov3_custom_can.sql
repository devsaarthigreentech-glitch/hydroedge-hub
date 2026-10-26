-- ============================================================================
-- 025_nanov3_custom_can.sql
-- ----------------------------------------------------------------------------
-- NanoV3 firmware 9c76466 adds a third CAN protocol, Custom: listen-only,
-- decoding the vehicle's own broadcast frames with signal maps set from here.
--
--   P-4204          CAN Protocol gains "Custom" (J1939 | OBD2 | Custom)
--   P-4210..P-4214  Custom CAN maps, string, max 95 chars, empty = off:
--                     "ID, BYTE, NBYTES, BE|LE, SCALE, OFFSET[, MASK[, SHIFT]]"
--                     e.g. "0x316, 2, 2, BE, 0.25, 0"
--                   published as P-4104 RPM, P-4115 speed, P-4116 coolant,
--                   P-4117 fuel level, P-4105 engine load -- the existing
--                   Engine (CAN / Modbus) Live fields, so no new columns.
--   P-4218          CAN Sniff Log Interval, s, 0..60, 0 = off (USB, bench use)
--
-- The new rows take P-4200's band and category, so they sit next to
-- P-4200..P-4206 in the Config tab. The command API checks a set against
-- enum_values, so without the P-4204 update "Custom" would be refused.
-- ============================================================================

UPDATE nano_registry
   SET enum_values = CASE
         WHEN enum_values IS NULL OR cardinality(enum_values) = 0 THEN '{"J1939","OBD2","Custom"}'::text[]
         ELSE array_append(enum_values, 'Custom')
       END,
       description = 'J1939 = listen-only; OBD2 = polled mode-01 requests; Custom = listen-only, decodes the vehicle''s broadcast frames with the maps P-4210..P-4214.',
       updated_at = now()
 WHERE pid = 'P-4204'
   AND NOT ('Custom' = ANY(COALESCE(enum_values, '{}'::text[])));

INSERT INTO nano_registry
  (pid, pid_num, band, category, name, description, data_type, units,
   valid_range, enum_values, default_value, access, settable_via,
   sms_eligible, auth_req, presence, source, proposed, notes)
SELECT v.pid, v.pid_num,
       COALESCE((SELECT band FROM nano_registry WHERE pid = 'P-4200'), 27),
       COALESCE((SELECT category FROM nano_registry WHERE pid = 'P-4200'), 'CAN'),
       v.name, v.description, v.data_type, v.units, v.valid_range, NULL::text[],
       v.default_value, 'RW', '{"Cloud","CLI"}'::text[],
       false, false, NULL, 'NanoV3 config_table.c', false, 'persist'
  FROM (VALUES
    ('P-4210', 4210, 'Custom CAN Map: Engine RPM', 'Custom CAN map for engine RPM (P-4204 = Custom): ''ID, BYTE, NBYTES, BE|LE, SCALE, OFFSET[, MASK[, SHIFT]]'', e.g. ''0x316, 2, 2, BE, 0.25, 0''. Empty = off. Published as P-4104.',
     'string', NULL, NULL, ''),
    ('P-4211', 4211, 'Custom CAN Map: Vehicle Speed', 'Custom CAN map for vehicle speed, same format as P-4210. Published as P-4115.',
     'string', NULL, NULL, ''),
    ('P-4212', 4212, 'Custom CAN Map: Coolant Temp', 'Custom CAN map for coolant temperature, same format as P-4210. Published as P-4116.',
     'string', NULL, NULL, ''),
    ('P-4213', 4213, 'Custom CAN Map: Fuel Level', 'Custom CAN map for fuel level, same format as P-4210. Published as P-4117.',
     'string', NULL, NULL, ''),
    ('P-4214', 4214, 'Custom CAN Map: Engine Load', 'Custom CAN map for engine load, same format as P-4210. Published as P-4105.',
     'string', NULL, NULL, ''),
    ('P-4218', 4218, 'CAN Sniff Log Interval', 'Seconds between USB sniff-log reports of every CAN id seen (Custom mode only). 0 = off. Bench use, to find the P-4210..P-4214 maps.',
     'uint16', 's', '0..60', '0')
  ) AS v(pid, pid_num, name, description, data_type, units, valid_range, default_value)
ON CONFLICT (pid) DO NOTHING;

DO $$
DECLARE missing integer;
BEGIN
  SELECT count(*) INTO missing FROM (VALUES
    ('P-4210'), ('P-4211'), ('P-4212'), ('P-4213'), ('P-4214'), ('P-4218')) v(pid)
   WHERE NOT EXISTS (SELECT 1 FROM nano_registry r WHERE r.pid = v.pid);
  IF missing > 0 THEN
    RAISE EXCEPTION 'nano_registry still missing % Custom CAN parameter(s)', missing;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM nano_registry WHERE pid = 'P-4204' AND 'Custom' = ANY(enum_values)) THEN
    RAISE EXCEPTION 'nano_registry: P-4204 has no Custom option';
  END IF;
  RAISE NOTICE 'nano_registry: P-4204 Custom, P-4210..P-4214, P-4218 present.';
END $$;
