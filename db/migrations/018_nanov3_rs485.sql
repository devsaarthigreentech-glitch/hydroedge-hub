-- ============================================================================
-- 018_nanov3_rs485.sql
-- ----------------------------------------------------------------------------
-- NanoV3 RS485 / Modbus RTU master on UART1 (GPIO40/41/42). Off by default:
-- with P-5500 false no pins are claimed and nothing is published.
--
--   P-5500..P-5505  settings (enable, baud, parity, stop bits, slave address,
--                   response timeout). Applied live - no reboot needed.
--   P-5506..P-5508  RO telemetry, only while the bus is active:
--                   transactions OK, transaction errors, last result.
--
-- Registry rows go into the existing Gen 2 category "Energy Meter / RS485
-- Modbus", so the Config tab shows them under Engine & Power. The three
-- telemetry values get nano_device_state columns (same shape as 012: nullable,
-- absent stays NULL).
--
-- Restart the ingest after applying: it validates its column list at start-up.
-- ============================================================================

ALTER TABLE nano_device_state
  ADD COLUMN IF NOT EXISTS rs485_ok_count    INTEGER,
  ADD COLUMN IF NOT EXISTS rs485_err_count   INTEGER,
  ADD COLUMN IF NOT EXISTS rs485_last_result TEXT;

COMMENT ON COLUMN nano_device_state.rs485_ok_count    IS 'P-5506 NanoV3: RS485 transactions OK; NULL while the bus is off';
COMMENT ON COLUMN nano_device_state.rs485_err_count   IS 'P-5507 NanoV3: RS485 transaction errors; NULL while the bus is off';
COMMENT ON COLUMN nano_device_state.rs485_last_result IS 'P-5508 NanoV3: outcome of the last RS485 transaction; NULL while the bus is off';

INSERT INTO nano_registry
  (pid, pid_num, band, category, name, description, data_type, units,
   valid_range, enum_values, default_value, access, settable_via,
   sms_eligible, auth_req, presence, source, proposed, notes)
SELECT v.pid, v.pid_num,
       COALESCE((SELECT band FROM nano_registry WHERE category = 'Energy Meter / RS485 Modbus' LIMIT 1), 36),
       'Energy Meter / RS485 Modbus',
       v.name, v.description, v.data_type, v.units, v.valid_range, v.enum_values,
       v.default_value, v.access, v.settable_via, false, false, v.presence,
       'NanoV3 config_table.c', false, v.notes
  FROM (VALUES
    ('P-5500', 5500, 'RS485 Enable', 'Enable the RS485 / Modbus master on UART1 (GPIO40/41/42). Off = no pins claimed, nothing published.',
     'bool', NULL, NULL, NULL::text[], 'false', 'RW', '{"Cloud","CLI"}'::text[], NULL, 'persist'),
    ('P-5501', 5501, 'RS485 Baud Rate', 'Line speed. Must match the meter. Applied live.',
     'uint32', 'bit/s', '1200..115200', NULL::text[], '9600', 'RW', '{"Cloud","CLI"}'::text[], NULL, 'persist'),
    ('P-5502', 5502, 'RS485 Parity', 'Parity bit. Must match the meter. Applied live.',
     'enum', NULL, NULL, '{"None","Even","Odd"}'::text[], 'None', 'RW', '{"Cloud","CLI"}'::text[], NULL, 'persist'),
    ('P-5503', 5503, 'RS485 Stop Bits', 'Stop bits. Must match the meter. Applied live.',
     'enum', NULL, NULL, '{"1","2"}'::text[], '1', 'RW', '{"Cloud","CLI"}'::text[], NULL, 'persist'),
    ('P-5504', 5504, 'RS485 Slave Address', 'Modbus address of the meter on the bus.',
     'uint16', NULL, '1..247', NULL::text[], '1', 'RW', '{"Cloud","CLI"}'::text[], NULL, 'persist'),
    ('P-5505', 5505, 'RS485 Response Timeout', 'How long to wait for the meter to answer before counting an error.',
     'uint16', 'ms', '50..5000', NULL::text[], '300', 'RW', '{"Cloud","CLI"}'::text[], NULL, 'persist'),
    ('P-5506', 5506, 'RS485 Transactions OK', 'Modbus transactions answered correctly since boot. Published while the bus is active.',
     'uint32', NULL, NULL, NULL::text[], '0', 'RO', '{}'::text[], 'conditional', 'runtime only'),
    ('P-5507', 5507, 'RS485 Transaction Errors', 'Timeouts, CRC and exception replies since boot. Published while the bus is active.',
     'uint32', NULL, NULL, NULL::text[], '0', 'RO', '{}'::text[], 'conditional', 'runtime only'),
    ('P-5508', 5508, 'RS485 Last Result', 'Outcome of the last Modbus transaction. Published while the bus is active.',
     'string', NULL, NULL, NULL::text[], NULL, 'RO', '{}'::text[], 'conditional', 'runtime only')
  ) AS v(pid, pid_num, name, description, data_type, units, valid_range, enum_values,
         default_value, access, settable_via, presence, notes)
ON CONFLICT (pid) DO NOTHING;

DO $$
DECLARE missing integer;
BEGIN
  SELECT count(*) INTO missing FROM (VALUES ('P-5500'), ('P-5501'), ('P-5502'), ('P-5503'), ('P-5504'),
                                            ('P-5505'), ('P-5506'), ('P-5507'), ('P-5508')) v(pid)
   WHERE NOT EXISTS (SELECT 1 FROM nano_registry r WHERE r.pid = v.pid);
  IF missing > 0 THEN
    RAISE EXCEPTION 'nano_registry still missing % RS485 parameter(s)', missing;
  END IF;
  RAISE NOTICE 'nano_registry: all 9 RS485 parameters present.';
END $$;
