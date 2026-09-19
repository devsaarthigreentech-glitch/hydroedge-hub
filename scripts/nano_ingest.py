#!/usr/bin/env python3
"""
nano_ingest.py  —  SGT HydroEdge / GreenVision (Nano IoT Gen 2 + NanoV3)

Phase 3: MQTT ingestion. Subscribes to the Nano bench/prod broker, discriminates
the four JSON frame shapes, and writes into the Step 1/2 schema.

    topic sgt/nano/{imei}/tel     telemetry   -> nano_frames + nano_device_state
    topic sgt/nano/{imei}/tel     t:cfg        -> nano_param_values (+ close nano_commands)
    topic sgt/nano/{imei}/status  t:status     -> nano_device_state   (online/LWT)
    topic sgt/nano/{imei}/alert   id:A-xx      -> nano_alerts

Two firmware generations publish the same frame envelope to the same topics and
the same IMEI (a reflashed unit keeps its identity):
  - Gen 2 (nano-iot-firmware-v2): permit state, electrode/ambient temps, PS
    over-temp. Level PIDs P-4096..98 mean "level LOW".
  - NanoV3: gateway beside the vendor analog box — pump/valve/engine status,
    remote-stop output, RCS set-point, PT100 temp, thermal lockout, heating
    jacket, adaptive RCS, OBD2 vehicle values. Level PIDs mean "water PRESENT".
  Both map into nano_device_state; a PID a generation doesn't send stays NULL.
  Requires migration 009_nanov3_state_columns.sql for the V3 columns.

Key behaviours (per SGT-GV-01 + the schema design):
  - ts stored raw; frames with ts=0 (pre-NTP) are kept and ordered by `up`.
  - Conditional CAN/Modbus/optional-sensor PIDs absent -> columns written NULL,
    never 0.
  - GPS fix<=0  ->  lat/lon written NULL (fix/sat still recorded).
  - boot_id: uses the firmware bid when present, else a GV-minted id that rolls
    over when uptime resets (up < last_up = reboot). Makes (device_id,boot_id,
    seq) a stable idempotency key so QoS-1 re-sends are ON CONFLICT DO NOTHING.
  - device_state upsert is boot-aware + uptime-guarded so a late/backfill frame
    never regresses newer live state.
  - IMEI->device_id resolved from devices.imei. Auto-create only if the devices
    table has no other required (NOT NULL, no-default) columns; else skip+warn.
  - /status accepts Gen 2 {"online":true} / {"state":"online"} and NanoV3
    {"t":"status","st":"online"}.

Run
    export PGPASSWORD=...
    python3 -u nano_ingest.py                         # 127.0.0.1:8883, topic sgt/nano/#
    python3 -u nano_ingest.py --auto-create           # create device rows for new IMEIs
    python3 -u nano_ingest.py --selftest FILE.jsonl   # offline: parse frames, print, no DB/MQTT

Requires: paho-mqtt, psycopg2 (neither needed for --selftest).
Use `python3 -u` when piping to tee/journald so lines aren't batched.
"""

import argparse
import json
import logging
import os
import signal
import sys
import uuid
from datetime import datetime, timezone

log = logging.getLogger("nano_ingest")


# =========================================================================== #
#  DB CONNECTION  —  fill in DB_PASSWORD before starting the service.
#  Leave the rest unless your setup differs. Environment variables
#  (PGPASSWORD, PGHOST, ...) and CLI flags still override these if present.
# =========================================================================== #
DB_HOST     = "127.0.0.1"
DB_PORT     = "5432"
DB_NAME     = "sgt_hydroedge"
DB_USER     = "sgt_admin"
DB_PASSWORD = "PASSWORD"          # <-- fill this in before starting (keep the quotes)
# =========================================================================== #


# --------------------------------------------------------------------------- #
# PID -> nano_device_state column mapping
# --------------------------------------------------------------------------- #

# Published by both generations, or Gen 2 only. A generation that doesn't send
# a PID leaves its column NULL.
ALWAYS = {
    "P-4075": "cell_current",
    "P-4093": "supply_voltage",
    "P-4094": "electrode_temp",        # gen2
    "P-4095": "ambient_temp",          # gen2
    "P-4096": "level_main",            # gen2: level LOW · v3: water PRESENT
    "P-4097": "level_bubbler",
    "P-4098": "level_electrolyte",
    "P-4099": "ps_overtemp",           # gen2
    "P-4100": "active_bearer",
    "P-4101": "rssi",
    "P-4102": "permit_state",          # gen2
}
CONDITIONAL = {
    "P-4103": "load_kw",               # gen2 Modbus
    "P-4104": "engine_rpm",
    "P-4105": "engine_load_pct",
    "P-4106": "fuel_rate_lph",
    "P-4107": "total_fuel_l",          # J1939 only
    "P-4108": "engine_hours",          # J1939 only
}
# NanoV3 additions (migration 009). The unconditional ones are in every V3
# frame; the rest appear only while their source reports.
V3_ALWAYS = {
    "P-802":  "rcs_setpoint",
    "P-4110": "pump1",
    "P-4111": "pump2",
    "P-4112": "solenoid",
    "P-4113": "engine_run",
    "P-4114": "remote_stop",
    "P-4119": "temp_present",
    "P-4120": "thermal_lockout",
    "P-4121": "jacket_on",
}
V3_CONDITIONAL = {
    "P-4115": "vehicle_speed_kph",     # OBD2 only
    "P-4116": "coolant_temp",          # OBD2 only
    "P-4117": "fuel_level_pct",        # OBD2 only
    "P-4118": "electrolyser_temp",     # PT100 fitted and enabled
    "P-4122": "jacket_fault",          # sent only when true
    "P-5250": "rcs_zone",              # auto-RCS active
    "P-5251": "rcs_reason",            # auto-RCS active
}
PID_COL = {**ALWAYS, **CONDITIONAL, **V3_ALWAYS, **V3_CONDITIONAL}

# device_state column order (device_id + updated_at handled separately)
STATE_COLS = [
    "last_frame_id", "last_ts", "last_ts_utc", "last_up", "last_seq",
    "last_boot_id", "net",
    "cell_current", "supply_voltage", "electrode_temp", "ambient_temp",
    "level_main", "level_bubbler", "level_electrolyte", "ps_overtemp",
    "active_bearer", "rssi", "permit_state",
    "load_kw", "engine_rpm", "engine_load_pct", "fuel_rate_lph",
    "total_fuel_l", "engine_hours",
    # NanoV3 (migration 009)
    "rcs_setpoint", "pump1", "pump2", "solenoid", "engine_run", "remote_stop",
    "vehicle_speed_kph", "coolant_temp", "fuel_level_pct",
    "electrolyser_temp", "temp_present", "thermal_lockout",
    "jacket_on", "jacket_fault", "rcs_zone", "rcs_reason",
    "last_lat", "last_lon", "gps_fix", "gps_sat",
    "active_faults", "d",
]
JSONB_STATE_COLS = {"active_faults", "d"}


def _placeholder(col):
    return "%s::jsonb" if col in JSONB_STATE_COLS else "%s"


STATE_UPSERT = (
    "INSERT INTO nano_device_state (device_id, " + ", ".join(STATE_COLS) + ", updated_at)\n"
    "VALUES (%s, " + ", ".join(_placeholder(c) for c in STATE_COLS) + ", now())\n"
    "ON CONFLICT (device_id) DO UPDATE SET\n    "
    + ", ".join("%s = EXCLUDED.%s" % (c, c) for c in STATE_COLS)
    + ", updated_at = now()\n"
    # Timestamp-only ordering: keep the snapshot at the frame with the newest
    # device timestamp. No seq or uptime guard. This device currently sends
    # ts=0 (no NTP clock) so EXCLUDED.last_ts_utc is NULL and every frame is
    # taken (latest received wins). Once the device has a real clock, frames
    # order by device time automatically.
    "WHERE nano_device_state.last_ts_utc IS NULL\n"
    "   OR EXCLUDED.last_ts_utc IS NULL\n"
    "   OR EXCLUDED.last_ts_utc >= nano_device_state.last_ts_utc;"
)

FRAME_INSERT = (
    "INSERT INTO nano_frames\n"
    "  (device_id, imei, schema_v, ts, up, seq, boot_id, net, d, faults, gps, source)\n"
    "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb,%s::jsonb,%s::jsonb,%s)\n"
    "ON CONFLICT (device_id, boot_id, seq) DO NOTHING\n"
    "RETURNING id;"
)

PARAM_UPSERT = (
    "INSERT INTO nano_param_values\n"
    "  (device_id, pid, value_text, value_num, res, source, ts, ts_utc, updated_at)\n"
    "VALUES (%s,%s,%s,%s,%s,%s,%s,%s, now())\n"
    "ON CONFLICT (device_id, pid) DO UPDATE SET\n"
    "  value_text=EXCLUDED.value_text, value_num=EXCLUDED.value_num,\n"
    "  res=EXCLUDED.res, source=EXCLUDED.source, ts=EXCLUDED.ts,\n"
    "  ts_utc=EXCLUDED.ts_utc, updated_at=now();"
)

ALERT_INSERT = (
    "INSERT INTO nano_alerts\n"
    "  (device_id, alert_id, src, sev, cat, message_key, ev, ts, ts_utc, stops, raw)\n"
    "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb)\n"
    "ON CONFLICT (device_id, alert_id, COALESCE(src,''), COALESCE(ev,''), ts) DO NOTHING;"
)

STATUS_UPSERT = (
    "INSERT INTO nano_device_state (device_id, online, status_ts, status_net, net, updated_at)\n"
    "VALUES (%s,%s,%s,%s,%s, now())\n"
    "ON CONFLICT (device_id) DO UPDATE SET\n"
    "  online=EXCLUDED.online, status_ts=EXCLUDED.status_ts,\n"
    "  status_net=COALESCE(EXCLUDED.status_net, nano_device_state.status_net),\n"
    "  net=COALESCE(EXCLUDED.net, nano_device_state.net), updated_at=now();"
)


# --------------------------------------------------------------------------- #
# Pure helpers (no DB / no MQTT — exercised by --selftest)
# --------------------------------------------------------------------------- #

def parse_topic(topic):
    """sgt/nano/{imei}/{leaf} -> (imei, leaf). Returns (None,None) if it doesn't match."""
    parts = topic.split("/")
    if len(parts) >= 4 and parts[0] == "sgt" and parts[1] == "nano":
        return parts[2], parts[3]
    return None, None


def classify(leaf, payload):
    """Discriminate the four frame shapes (payload wins; leaf cross-checks)."""
    if isinstance(payload, dict):
        t = payload.get("t")
        if t == "cfg":
            return "writeback"
        if t == "status" or leaf == "status":
            return "status"
        if isinstance(payload.get("id"), str) and payload["id"].startswith("A-"):
            return "alert"
        if leaf == "alert":
            return "alert"
        if "d" in payload and "seq" in payload:
            return "telemetry"
    return "unknown"


def firmware_variant(d):
    """'v3' / 'gen2' / 'unknown' from the PIDs a frame carries (same rule as the UI)."""
    if not isinstance(d, dict):
        return "unknown"
    if "P-4114" in d or "P-4110" in d or "P-4113" in d:
        return "v3"
    if "P-4102" in d or "P-4099" in d or "P-4094" in d:
        return "gen2"
    return "unknown"


def status_online(payload):
    """Online flag from any of the status shapes. None if the frame has none."""
    online = payload.get("online")
    if online is not None:
        return bool(online)
    for key in ("st", "state"):                     # NanoV3 sends "st", Gen 2 "state"
        if key in payload:
            return str(payload[key]).lower() in ("online", "up", "1", "true")
    return None


def _num(v):
    return v if isinstance(v, (int, float)) and not isinstance(v, bool) else None


def ts_to_utc(ts):
    return datetime.fromtimestamp(ts, tz=timezone.utc) if isinstance(ts, int) and ts > 0 else None


def state_values(payload):
    """Build the dict of nano_device_state columns from a telemetry payload."""
    d = payload.get("d") or {}
    gps = payload.get("gps") or {}
    faults = payload.get("faults") or []

    vals = {col: None for col in STATE_COLS}
    for pid, col in PID_COL.items():
        if pid in d:                      # absent stays None -> NULL (never 0)
            vals[col] = d[pid]

    ts = payload.get("ts")
    vals["last_ts"] = ts
    vals["last_ts_utc"] = ts_to_utc(ts)
    vals["last_up"] = payload.get("up")
    vals["last_seq"] = payload.get("seq")
    vals["net"] = payload.get("net")

    fix = gps.get("fix")
    vals["gps_fix"] = fix
    vals["gps_sat"] = gps.get("sat")
    if isinstance(fix, (int, float)) and fix and fix > 0:
        vals["last_lat"] = _num(gps.get("lat"))
        vals["last_lon"] = _num(gps.get("lon"))
    else:
        vals["last_lat"] = None            # no lock -> no position (not 0,0 null-island)
        vals["last_lon"] = None

    vals["active_faults"] = json.dumps(faults)
    vals["d"] = json.dumps(d)
    return vals


def frame_row(device_id, imei, payload, boot_id):
    """Params tuple for FRAME_INSERT."""
    return (
        device_id, imei, payload.get("v"),
        payload.get("ts"), payload.get("up"), payload.get("seq"),
        boot_id, payload.get("net"),
        json.dumps(payload.get("d") or {}),
        json.dumps(payload.get("faults") or []),
        json.dumps(payload["gps"]) if payload.get("gps") is not None else None,
        "live",
    )


# --------------------------------------------------------------------------- #
# DB layer
# --------------------------------------------------------------------------- #

class DB:
    def __init__(self, dsn, auto_create):
        import psycopg2
        self.psycopg2 = psycopg2
        self.dsn = dsn
        self.auto_create = auto_create
        self.conn = None
        self._imei_cache = {}          # imei -> device_id (uuid str)
        self._unknown = set()          # imei we've already warned about
        self._boot = {}                # device_id -> {"boot_id":..., "last_up":int}
        self.connect()

    def connect(self):
        self.conn = self.psycopg2.connect(
            self.dsn, connect_timeout=15,
            keepalives=1, keepalives_idle=30,
            keepalives_interval=10, keepalives_count=3,
        )
        self.conn.autocommit = False

    def _cur(self):
        try:
            return self.conn.cursor()
        except self.psycopg2.OperationalError:
            log.warning("DB connection lost — reconnecting")
            self.connect()
            return self.conn.cursor()

    # --- devices introspection / resolution --------------------------------- #

    def preflight(self):
        with self._cur() as cur:
            cur.execute("""
                SELECT 1 FROM information_schema.columns
                WHERE table_schema='public' AND table_name='devices'
                  AND column_name='imei';
            """)
            if not cur.fetchone():
                sys.exit("devices has no 'imei' column — cannot map IMEI to device_id.")

            # every column the state upsert writes must exist, or the first frame
            # fails loudly at runtime; better to refuse at start-up with the fix.
            cur.execute("""
                SELECT column_name FROM information_schema.columns
                WHERE table_schema='public' AND table_name='nano_device_state';
            """)
            have = {r[0] for r in cur.fetchall()}
            missing = [c for c in STATE_COLS if c not in have]
            if missing:
                sys.exit("nano_device_state is missing column(s) %s — apply "
                         "db/migrations/009_nanov3_state_columns.sql first."
                         % ", ".join(missing))

            # columns that would block a safe auto-create (NOT NULL, no default,
            # and not one we supply ourselves)
            cur.execute("""
                SELECT column_name, column_default
                FROM information_schema.columns
                WHERE table_schema='public' AND table_name='devices'
                  AND is_nullable='NO';
            """)
            supplied = {"id", "imei", "protocol"}
            self._blocking = [c for c, dflt in cur.fetchall()
                              if c not in supplied and dflt is None]
            cur.execute("SELECT count(*) FROM devices WHERE protocol='nano';")
            n = cur.fetchone()[0]
        self.conn.commit()
        log.info("devices OK; %d nano device(s) registered", n)
        if self.auto_create and self._blocking:
            log.warning("--auto-create disabled: devices requires column(s) %s "
                        "that I won't invent. Register Nano devices manually, or "
                        "give those columns a default/nullability.",
                        ", ".join(self._blocking))
            self.auto_create = False

    def resolve_device(self, imei):
        if imei in self._imei_cache:
            return self._imei_cache[imei]
        with self._cur() as cur:
            cur.execute("SELECT id FROM devices WHERE imei::text = %s LIMIT 1;", (imei,))
            row = cur.fetchone()
            if row:
                self.conn.commit()
                self._imei_cache[imei] = row[0]
                return row[0]
            if not self.auto_create:
                self.conn.rollback()
                if imei not in self._unknown:
                    self._unknown.add(imei)
                    log.warning("unknown IMEI %s — no device row; skipping "
                                "(use --auto-create or register it)", imei)
                return None
            new_id = str(uuid.uuid4())
            cur.execute(
                "INSERT INTO devices (id, imei, protocol) VALUES (%s,%s,'nano') "
                "RETURNING id;", (new_id, imei))
            dev_id = cur.fetchone()[0]
        self.conn.commit()
        log.info("auto-created device %s for IMEI %s", dev_id, imei)
        self._imei_cache[imei] = dev_id
        return dev_id

    # --- boot_id resolution ------------------------------------------------- #

    def resolve_boot(self, device_id, up):
        # A reboot is detected by uptime going backwards (up < last_up). On this
        # firmware `seq` is a persistent counter that does NOT reset per boot, so
        # `up` is the only reliable boot signal.
        up = up or 0
        st = self._boot.get(device_id)
        if st is None:                                 # first frame this run
            last_up, last_boot = None, None
            with self._cur() as cur:
                cur.execute("SELECT last_up, last_boot_id FROM nano_device_state "
                            "WHERE device_id=%s;", (device_id,))
                r = cur.fetchone()
            self.conn.commit()
            if r:
                last_up, last_boot = r
            if last_boot is not None and last_up is not None and up >= last_up:
                st = {"boot_id": last_boot, "last_up": up}       # same boot continuing
            else:
                st = {"boot_id": uuid.uuid4().hex, "last_up": up}  # reboot (up reset) or first-ever
            self._boot[device_id] = st
            return st["boot_id"]
        if up < st["last_up"]:                          # uptime went backwards -> reboot
            st["boot_id"] = uuid.uuid4().hex
        st["last_up"] = up
        return st["boot_id"]

    # --- writers ------------------------------------------------------------ #

    def ingest_telemetry(self, device_id, imei, payload):
        boot_id = self.resolve_boot(device_id, payload.get("up"))
        with self._cur() as cur:
            cur.execute(FRAME_INSERT, frame_row(device_id, imei, payload, boot_id))
            row = cur.fetchone()
            if row is None:                             # dedup: already stored
                self.conn.commit()
                return "dup", boot_id, None
            frame_id = row[0]
            vals = state_values(payload)
            params = [device_id] + [vals[c] for c in STATE_COLS[1:]]
            params.insert(1, frame_id)                  # last_frame_id (STATE_COLS[0])
            cur.execute(STATE_UPSERT, params)
        self.conn.commit()
        return "ok", boot_id, frame_id

    def ingest_writeback(self, device_id, payload):
        # Config-mirror writeback is FLAT (SGT-GV-01 §8.5): top-level id/val/res,
        # no d{}. Fires on every successful cfg_set from any source (cloud/SMS/
        # internal), so nano_param_values always reflects device truth.
        pid = payload.get("id")
        if not pid:
            return None, None, 0
        val = payload.get("val")
        res = payload.get("res")
        ts = payload.get("ts")
        with self._cur() as cur:
            cur.execute(PARAM_UPSERT, (
                device_id, pid,
                None if val is None else str(val), _num(val),
                res, payload.get("src"), ts, ts_to_utc(ts)))
            # correlate to the most recent pending command for this pid+device
            cur.execute("""
                UPDATE nano_commands SET status=%s, result_reason=%s, resolved_at=now()
                WHERE id = (SELECT id FROM nano_commands
                            WHERE device_id=%s AND pid=%s AND status='pending'
                            ORDER BY sent_at DESC LIMIT 1);
            """, ("ok" if res == "ok" else "nack",
                  None if res == "ok" else res, device_id, pid))
            correlated = cur.rowcount
        self.conn.commit()
        return pid, res, correlated

    def ingest_status(self, device_id, payload):
        online = status_online(payload)
        ts = payload.get("ts")
        with self._cur() as cur:
            cur.execute(STATUS_UPSERT, (
                device_id, online, ts_to_utc(ts) or datetime.now(timezone.utc),
                payload.get("net"), payload.get("net")))
        self.conn.commit()
        return online

    def ingest_alert(self, device_id, payload):
        ts = payload.get("ts")
        with self._cur() as cur:
            cur.execute(ALERT_INSERT, (
                device_id, payload.get("id"), payload.get("src"),
                payload.get("sev"), payload.get("cat"),
                payload.get("key", payload.get("message_key")),
                payload.get("ev"), ts, ts_to_utc(ts),
                payload.get("stops"), json.dumps(payload)))
        self.conn.commit()


# --------------------------------------------------------------------------- #
# MQTT
# --------------------------------------------------------------------------- #

def make_client(db, args):
    import paho.mqtt.client as mqtt

    try:
        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=args.client_id)
    except (AttributeError, TypeError):          # paho-mqtt < 2.0
        client = mqtt.Client(client_id=args.client_id)

    def on_connect(client, userdata, flags, reason_code, properties=None):
        log.info("connected to broker %s:%s (rc=%s); subscribing %s",
                 args.broker_host, args.broker_port, reason_code, args.topic)
        client.subscribe(args.topic, qos=args.qos)

    def on_message(client, userdata, msg):
        try:
            imei, leaf = parse_topic(msg.topic)
            if imei is None:
                return
            payload = json.loads(msg.payload.decode("utf-8", "replace"))
        except Exception as e:
            log.warning("bad frame on %s: %s", msg.topic, e)
            return
        try:
            kind = classify(leaf, payload)
            p_imei = payload.get("imei", imei)
            if p_imei and p_imei != imei:
                log.warning("imei mismatch topic=%s payload=%s (using topic)", imei, p_imei)
            device_id = db.resolve_device(imei)
            if device_id is None:
                return
            if kind == "telemetry":
                status, boot, fid = db.ingest_telemetry(device_id, imei, payload)
                log.info("tel imei=%s fw=%s seq=%s up=%s -> %s%s", imei,
                         firmware_variant(payload.get("d")), payload.get("seq"),
                         payload.get("up"), status,
                         (" frame#%s" % fid) if fid else "")
            elif kind == "writeback":
                pid, res, corr = db.ingest_writeback(device_id, payload)
                log.info("cfg imei=%s id=%s res=%s%s", imei, pid, res,
                         " (closed pending cmd)" if corr else "")
            elif kind == "status":
                online = db.ingest_status(device_id, payload)
                log.info("status imei=%s -> online=%s", imei, online)
            elif kind == "alert":
                db.ingest_alert(device_id, payload)
                log.info("alert imei=%s id=%s src=%s", imei, payload.get("id"),
                         payload.get("src"))
            else:
                log.warning("unclassified frame on %s: keys=%s", msg.topic,
                            list(payload)[:6])
        except Exception:
            db.conn.rollback()
            log.exception("handler error on %s", msg.topic)

    client.on_connect = on_connect
    client.on_message = on_message
    return client


# --------------------------------------------------------------------------- #
# selftest (offline)
# --------------------------------------------------------------------------- #

def selftest(path):
    print("Offline selftest — parsing frames, no DB/MQTT.\n")
    seen_boot = {"boot": uuid.uuid4().hex, "last_seq": None}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            # accept either raw JSON or "topic {json}"
            topic = None
            if not line.startswith("{"):
                topic, _, rest = line.partition(" ")
                line = rest.strip()
            payload = json.loads(line)
            imei = payload.get("imei") or (parse_topic(topic)[0] if topic else "?")
            leaf = parse_topic(topic)[1] if topic else "tel"
            kind = classify(leaf, payload)
            print("== %s  imei=%s  kind=%s" % (topic or "(no topic)", imei, kind))
            if kind == "telemetry":
                seq = payload.get("seq")
                if seen_boot["last_seq"] is not None and seq < seen_boot["last_seq"]:
                    seen_boot["boot"] = uuid.uuid4().hex
                seen_boot["last_seq"] = seq
                fr = frame_row("<device_uuid>", imei, payload, seen_boot["boot"])
                sv = state_values(payload)
                fw = firmware_variant(payload.get("d"))
                print("   frame: fw=%s v=%s ts=%s up=%s seq=%s boot=%s net=%s faults=%s"
                      % (fw, fr[2], fr[3], fr[4], fr[5], fr[6][:8], fr[7], payload.get("faults")))
                print("   ts_utc=%s" % sv["last_ts_utc"])
                if fw == "v3":
                    measures = {c: sv[c] for c in ("cell_current", "supply_voltage",
                                "rcs_setpoint", "level_main", "level_bubbler",
                                "level_electrolyte", "pump1", "pump2", "solenoid",
                                "engine_run", "remote_stop", "active_bearer", "rssi")}
                    cond = {c: sv[c] for c in list(CONDITIONAL.values())
                            + list(V3_CONDITIONAL.values())}
                else:
                    measures = {c: sv[c] for c in ("cell_current", "supply_voltage",
                                "electrode_temp", "active_bearer", "rssi", "permit_state")}
                    cond = {c: sv[c] for c in CONDITIONAL.values()}
                print("   always: %s" % measures)
                print("   conditional (NULL when absent): %s" % cond)
                print("   gps: fix=%s sat=%s lat=%s lon=%s"
                      % (sv["gps_fix"], sv["gps_sat"], sv["last_lat"], sv["last_lon"]))
            elif kind == "status":
                print("   online=%s net=%s" % (status_online(payload), payload.get("net")))
            print()


# --------------------------------------------------------------------------- #

def dsn_from_env(args):
    # precedence: CLI flag > environment variable > in-file constant above
    parts = {
        "host": args.host or os.environ.get("PGHOST", DB_HOST),
        "port": args.port or os.environ.get("PGPORT", DB_PORT),
        "dbname": args.dbname or os.environ.get("PGDATABASE", DB_NAME),
        "user": args.user or os.environ.get("PGUSER", DB_USER),
    }
    pw = os.environ.get("PGPASSWORD") or DB_PASSWORD
    if pw:
        parts["password"] = pw          # if still blank, libpq falls back to ~/.pgpass
    return " ".join("%s=%s" % (k, v) for k, v in parts.items())


def main():
    ap = argparse.ArgumentParser(description="Nano MQTT ingestion subscriber.")
    ap.add_argument("--broker-host", default=os.environ.get("NANO_BROKER_HOST", "127.0.0.1"))
    ap.add_argument("--broker-port", type=int,
                    default=int(os.environ.get("NANO_BROKER_PORT", "8883")))
    ap.add_argument("--topic", default="sgt/nano/#")
    ap.add_argument("--qos", type=int, default=1)
    ap.add_argument("--client-id", default="gv-nano-ingest")
    ap.add_argument("--auto-create", action="store_true",
                    help="create a devices row (protocol='nano') for unknown IMEIs")
    ap.add_argument("--selftest", metavar="FILE",
                    help="offline: parse frames from a file (topic+json or json per line)")
    ap.add_argument("--dsn"); ap.add_argument("--host"); ap.add_argument("--port")
    ap.add_argument("--dbname"); ap.add_argument("--user")
    args = ap.parse_args()

    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(message)s")

    if args.selftest:
        selftest(args.selftest)
        return

    dsn = args.dsn or dsn_from_env(args)
    try:
        db = DB(dsn, args.auto_create)
    except ImportError:
        sys.exit("psycopg2 is required (pip install psycopg2-binary).")
    db.preflight()

    try:
        client = make_client(db, args)
    except ImportError:
        sys.exit("paho-mqtt is required (pip install paho-mqtt).")

    def stop(signum, frame):
        log.info("signal %s — disconnecting", signum)
        client.disconnect()
    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)

    client.connect(args.broker_host, args.broker_port, keepalive=60)
    client.loop_forever()
    log.info("stopped")


if __name__ == "__main__":
    main()
