-- ============================================================================
-- 009_nanov3_state_columns.sql
-- ----------------------------------------------------------------------------
-- Adds the NanoV3 measured PIDs to nano_device_state.
--
-- NanoV3 (the ESP32-S3 gateway beside the vendor's analog control box) reuses
-- the Gen 2 topic layout and IMEI identity, so its frames already land in
-- nano_frames and the raw `d` JSON. But nano_ingest.py only lifts PIDs it has
-- a column for into nano_device_state, and the live screen reads columns, not
-- `d`. Everything NanoV3 added — pump/valve/engine status, the remote-stop
-- output, the RCS set-point, PT100 temperature, thermal lockout, heating
-- jacket, adaptive RCS, OBD2 vehicle values — therefore never reached the UI.
--
-- Column-per-PID, matching how the Gen 2 PIDs are stored, so the live route
-- keeps doing a single-row read. Nullable, no defaults, so an absent PID is
-- NULL (never 0) — the same rule the Gen 2 CAN columns follow.
--
-- The Gen 2 columns (permit_state, electrode_temp, ambient_temp, ps_overtemp,
-- load_kw) stay: a Gen 2 unit still writes them and NanoV3 simply leaves them
-- NULL. The ingest must be restarted after this migration (it builds its
-- upsert statement from a column list at start-up).
-- ============================================================================

ALTER TABLE nano_device_state
  -- analog-box status inputs (P-4110..P-4113) and the stop line (P-4114)
  ADD COLUMN IF NOT EXISTS pump1            BOOLEAN,
  ADD COLUMN IF NOT EXISTS pump2            BOOLEAN,
  ADD COLUMN IF NOT EXISTS solenoid         BOOLEAN,
  ADD COLUMN IF NOT EXISTS engine_run       BOOLEAN,
  ADD COLUMN IF NOT EXISTS remote_stop      BOOLEAN,
  -- remote current setting, amps requested (P-802)
  ADD COLUMN IF NOT EXISTS rcs_setpoint     NUMERIC(6,2),
  -- OBD2-only CAN values (P-4115..P-4117)
  ADD COLUMN IF NOT EXISTS vehicle_speed_kph NUMERIC(6,1),
  ADD COLUMN IF NOT EXISTS coolant_temp     NUMERIC(6,1),
  ADD COLUMN IF NOT EXISTS fuel_level_pct   NUMERIC(5,1),
  -- PT100 electrolyser temperature (P-4118) and its presence flag (P-4119)
  ADD COLUMN IF NOT EXISTS electrolyser_temp NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS temp_present     BOOLEAN,
  -- thermal stop-line lockout (P-4120), heating jacket (P-4121/P-4122)
  ADD COLUMN IF NOT EXISTS thermal_lockout  BOOLEAN,
  ADD COLUMN IF NOT EXISTS jacket_on        BOOLEAN,
  ADD COLUMN IF NOT EXISTS jacket_fault     BOOLEAN,
  -- adaptive RCS controller state (P-5250 zone, P-5251 reason)
  ADD COLUMN IF NOT EXISTS rcs_zone         INTEGER,
  ADD COLUMN IF NOT EXISTS rcs_reason       TEXT;

COMMENT ON COLUMN nano_device_state.pump1             IS 'P-4110 NanoV3: analog box pump 1 running';
COMMENT ON COLUMN nano_device_state.pump2             IS 'P-4111 NanoV3: analog box pump 2 running';
COMMENT ON COLUMN nano_device_state.solenoid          IS 'P-4112 NanoV3: solenoid valve open';
COMMENT ON COLUMN nano_device_state.engine_run        IS 'P-4113 NanoV3: engine running (alternator input)';
COMMENT ON COLUMN nano_device_state.remote_stop       IS 'P-4114 NanoV3: remote-stop output asserted (GPIO43 driven)';
COMMENT ON COLUMN nano_device_state.rcs_setpoint      IS 'P-802 NanoV3: RCS current set-point sent to the analog box, amps';
COMMENT ON COLUMN nano_device_state.vehicle_speed_kph IS 'P-4115 NanoV3: OBD2 vehicle speed; NULL when CAN off/stale';
COMMENT ON COLUMN nano_device_state.coolant_temp      IS 'P-4116 NanoV3: OBD2 coolant temperature °C; NULL when absent';
COMMENT ON COLUMN nano_device_state.fuel_level_pct    IS 'P-4117 NanoV3: OBD2 fuel level %; NULL when absent';
COMMENT ON COLUMN nano_device_state.electrolyser_temp IS 'P-4118 NanoV3: PT100 electrolyser temperature °C; NULL when sensor absent';
COMMENT ON COLUMN nano_device_state.temp_present      IS 'P-4119 NanoV3: MAX31865 responding and RTD OK';
COMMENT ON COLUMN nano_device_state.thermal_lockout   IS 'P-4120 NanoV3: thermal guard holding the stop line';
COMMENT ON COLUMN nano_device_state.jacket_on         IS 'P-4121 NanoV3: heating jacket energised';
COMMENT ON COLUMN nano_device_state.jacket_fault      IS 'P-4122 NanoV3: heating jacket / expander fault (only sent when true)';
COMMENT ON COLUMN nano_device_state.rcs_zone          IS 'P-5250 NanoV3: adaptive RCS zone; NULL when auto-RCS inactive';
COMMENT ON COLUMN nano_device_state.rcs_reason        IS 'P-5251 NanoV3: adaptive RCS reason text; NULL when auto-RCS inactive';
