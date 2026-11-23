#!/usr/bin/env python3
"""
nano_demo_replay.py  --  temporary demo tool, NOT for production use.

Replays a real unit's stored telemetry (nano_frames) over MQTT as a separate
DEMO device, so every GreenVision screen shows a "live" unit for a screen
recording. The frames go through the normal broker and nano_ingest, nothing is
written directly into the telemetry tables, and the real unit is not touched.

    --setup     clone the source device row + its saved config as the demo device
    (default)   replay frames as the demo device until the frames run out or Ctrl-C
    --cleanup   delete the demo device and everything stored for it
    --coverage  list which Live parameters the frames carry and which are missing
    --list-alerts  print nano_alert_catalog, to choose codes for --alerts

--fill adds made-up values for parameters the frames don't carry (real values
are never replaced). Those numbers are SAMPLE DATA, not measurements: label a
video that shows them as simulated.

--current-band keeps measured cell current within +-N% of the setpoint. --alerts
raises and clears catalog alerts on a timer, with past events for Event History.
Those are made up as well.

Requires: psycopg2, paho-mqtt (the same packages as nano_ingest).
"""

import argparse
import bisect
import json
import logging
import math
import os
import queue
import signal
import sys
import time
import uuid

log = logging.getLogger("nano_demo_replay")

DEMO_IMEI_PREFIX = "99900"           # never a real TAC we ship; guards --cleanup
DEMO_NAME_PREFIX = "DEMO"
DEFAULT_DEMO_IMEI = "999000000000001"
DEFAULT_SOURCE_IMEI = "862360079122227"

# Everything the Live tab can show for a NanoV3 unit (route.ts MEASURED, gen v3
# or both). Used by --coverage.
LIVE_PIDS = [
    "P-4075", "P-4093", "P-802", "P-4118", "P-4119", "P-4096", "P-4097", "P-4098",
    "P-4126", "P-4110", "P-4111", "P-4112", "P-4113", "P-4114", "P-4120", "P-4121",
    "P-4122", "P-5250", "P-5251", "P-4123", "P-4124", "P-4125", "P-5506", "P-5507",
    "P-5508", "P-4127", "P-4128", "P-4129", "P-4130", "P-4131", "P-4132", "P-4133",
    "P-4134", "P-4135", "P-4136", "P-4137", "P-4139", "P-4138", "P-4140", "P-4141",
    "P-4142", "P-4228", "P-4150", "P-4151", "P-4152", "P-4153", "P-4154", "P-4155",
    "P-4156", "P-4157", "P-4100", "P-4101", "P-4104", "P-4105", "P-4106", "P-4107",
    "P-4108", "P-4115", "P-4116", "P-4117",
]
# Sent by the firmware only while something is wrong. --fill leaves them out, so
# the demo doesn't show a fault that never happened.
FAULT_ONLY_PIDS = {"P-4122", "P-4130"}


def wave(n, base, amp, period):
    """Slow drift around base, so a filled value moves like a real reading."""
    return round(base + amp * math.sin(2 * math.pi * n / period), 2)


def rpm_zone(rpm):
    return 1 if rpm <= 1000 else 2 if rpm <= 1500 else 3 if rpm <= 2000 else 4


def sample_values(n, d):
    """Made-up values for every Live parameter, in the firmware's own types."""
    rpm = d.get("P-4104")
    rpm = rpm if isinstance(rpm, (int, float)) else wave(n, 1650, 350, 47)
    zone = rpm_zone(rpm)
    vals = {
        "P-4104": rpm,
        "P-4105": wave(n, 55, 15, 61),
        "P-4106": wave(n, 9.5, 2, 53),
        "P-4107": round(12450 + n * 0.01, 2),
        "P-4108": round(1832.4 + n * 0.001, 2),
        "P-4115": wave(n, 52, 18, 71),
        "P-4116": wave(n, 86, 3, 97),
        "P-4117": round(max(5, 64 - n * 0.002), 1),
        "P-4118": wave(n, 46, 3, 83),
        "P-4119": True,
        "P-4124": 100,
        "P-4125": "OK",
        "P-4127": round(max(5, 62 - n * 0.002), 1),
        "P-4128": wave(n, 2.1, 0.02, 41),
        "P-4129": round(max(3, 37 - n * 0.001), 1),
        "P-4131": "Vehicle",
        "P-4132": wave(n, 3.92, 0.02, 89),
        "P-4133": wave(n, 86, 1, 89),
        "P-4134": "Charging",
        "P-4135": 0,
        "P-4136": "none",
        "P-4137": "Not run",
        "P-4138": False,
        "P-4139": False,
        "P-4140": round(max(3, 38 - n * 0.001), 1),
        "P-4141": round(4.2 + n * 0.001, 2),
        "P-4142": round(126.5 + n * 0.002, 2),
        "P-4228": "Idle",
        "P-5250": zone,
        "P-5251": "RPM zone %d" % zone,
        "P-5506": n,
        "P-5507": 0,
        "P-5508": "OK",
    }
    for k in range(8):
        vals["P-415%d" % k] = wave(n + k * 7, 20 + k * 10, 2 + k, 59 + k * 4)
    return vals


def band_current(n, setpoint, band_pct):
    """Setpoint +- band_pct, drifting; the two sines can never exceed the band."""
    drift = 0.7 * math.sin(2 * math.pi * n / 37) + 0.3 * math.sin(2 * math.pi * n / 11)
    return round(setpoint * (1 + band_pct / 100.0 * drift), 3)


def apply_current_band(d, n, band_pct):
    setpoint = d.get("P-802")
    if not band_pct or "P-4075" not in d or not isinstance(setpoint, (int, float)):
        return
    # Not producing means no current, as on a real unit (P-5011/P-5012).
    d["P-4075"] = band_current(n, setpoint, band_pct) if d.get("P-4126") else 0.0


def apply_alert(frame, alert):
    """Make a frame agree with the alert being simulated right now."""
    if alert["id"] not in frame["faults"]:
        frame["faults"] = frame["faults"] + [alert["id"]]
    if alert["stops"]:
        frame["d"].update({"P-4114": True, "P-4126": False, "P-4110": False, "P-4111": False,
                           "P-4112": False, "P-4075": 0.0})


def alert_payload(alert, ev, ts):
    return {"id": alert["id"], "src": alert["src"], "sev": alert["sev"], "cat": alert["cat"],
            "key": alert["key"], "ev": ev, "ts": int(ts), "stops": alert["stops"]}


def alert_at(t, alerts, first, hold, gap):
    """Which alert is raised t seconds into the run, or None. Cycles through them."""
    if t < first or not alerts:
        return None
    index, into = divmod(t - first, hold + gap)
    return alerts[int(index) % len(alerts)] if into < hold else None


def build_frame(src, n, now, up0, seq0, demo_imei, fill=False, gps=None, band=0, alert=None,
                setpoint=None):
    """A stored frame -> a fresh telemetry payload stamped as the demo device."""
    d = dict(src.get("d") or {})
    if fill:
        for pid, val in sample_values(n, d).items():
            if pid == "P-4119":
                # P-4119 is in every real frame, usually false when no PT100 is
                # fitted; true is the only value consistent with a filled P-4118.
                if "P-4118" not in d:
                    d[pid] = val
            elif pid not in d and pid not in FAULT_ONLY_PIDS:
                d[pid] = val
    if setpoint is not None:
        d["P-802"] = setpoint
    apply_current_band(d, n, band)
    frame = {
        "v": src.get("schema_v"),
        "imei": demo_imei,
        "ts": int(now),
        "up": int(now - up0),
        "seq": seq0 + n,
        "net": src.get("net"),
        "d": d,
        "faults": src.get("faults") or [],
    }
    if gps:
        frame["gps"] = {"fix": 1, "sat": 9, "lat": gps[0], "lon": gps[1]}
    elif src.get("gps") is not None:
        frame["gps"] = src["gps"]
    if alert:
        apply_alert(frame, alert)
    return frame


def active(src):
    """True for frames where the plant or engine was actually running."""
    d = src.get("d") or {}
    return bool(d.get("P-4126") or d.get("P-4113"))


# --------------------------------------------------------------------------- #
# DB
# --------------------------------------------------------------------------- #

def db_connect(args):
    import psycopg2
    if args.dsn:
        return psycopg2.connect(args.dsn)
    return psycopg2.connect(
        host=os.environ.get("PGHOST", "127.0.0.1"),
        port=os.environ.get("PGPORT", "5432"),
        dbname=os.environ.get("PGDATABASE", "sgt_hydroedge"),
        user=os.environ.get("PGUSER", "sgt_admin"),
        password=os.environ.get("PGPASSWORD"),
    )


def load_frames(conn, args):
    sql = ("SELECT schema_v, net, d, faults, gps FROM nano_frames "
           "WHERE imei::text = %s AND ts::bigint > %s ")
    params = [args.source_imei, int(time.time()) - args.days * 86400]
    sql += "ORDER BY ts::bigint, seq"
    with conn.cursor() as cur:
        cur.execute(sql, params)
        cols = [c[0] for c in cur.description]
        frames = [dict(zip(cols, r)) for r in cur.fetchall()]
    conn.commit()
    if args.active_only:
        frames = [f for f in frames if active(f)]
    return frames


def coverage(frames):
    seen = {}
    for f in frames:
        for pid in (f.get("d") or {}):
            seen[pid] = seen.get(pid, 0) + 1
    print("%d frames" % len(frames))
    print("\nPRESENT (frames carrying it):")
    for pid in LIVE_PIDS:
        if pid in seen:
            print("  %-8s %d" % (pid, seen[pid]))
    missing = [p for p in LIVE_PIDS if p not in seen]
    print("\nMISSING (%d, --fill would add all but %s):"
          % (len(missing), ", ".join(sorted(FAULT_ONLY_PIDS))))
    print("  " + " ".join(missing))


def load_catalog(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT alert_id, severity, category, message_key, stops_engine, condition "
                    "FROM nano_alert_catalog ORDER BY severity_rank DESC NULLS LAST, alert_id;")
        rows = cur.fetchall()
    conn.commit()
    return [{"id": r[0], "src": r[0], "sev": r[1], "cat": r[2], "key": r[3],
             "stops": bool(r[4]), "condition": r[5]} for r in rows]


def list_alerts(catalog):
    for a in catalog:
        print("%-6s %-9s %-18s stops=%-5s %s"
              % (a["id"], a["sev"], a["cat"], a["stops"], a["condition"] or ""))


def pick_alerts(catalog, codes):
    """The named codes, or the first non-stopping alert of each severity, mildest first."""
    if codes:
        by_id = {a["id"]: a for a in catalog}
        unknown = [c for c in codes if c not in by_id]
        if unknown:
            sys.exit("not in nano_alert_catalog: %s (see --list-alerts)" % ", ".join(unknown))
        return [by_id[c] for c in codes]
    picked = []
    for sev in ("Info", "Warning", "Fault", "Critical"):
        rows = [a for a in catalog if a["sev"] == sev]
        rows.sort(key=lambda a: a["stops"])
        picked += rows[:1]
    return picked


def require_demo_imei(args):
    if not args.demo_imei.startswith(DEMO_IMEI_PREFIX) or args.demo_imei == args.source_imei:
        sys.exit("refusing: demo IMEI must start with %s and differ from the source"
                 % DEMO_IMEI_PREFIX)


def setup_device(conn, args):
    """Clone the source device row (any columns it has) + its saved config."""
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM devices WHERE imei::text = %s LIMIT 1;", (args.demo_imei,))
        if cur.fetchone():
            print("demo device %s already exists" % args.demo_imei)
            conn.rollback()
            return
        cur.execute("SELECT id FROM devices WHERE imei::text = %s LIMIT 1;", (args.source_imei,))
        row = cur.fetchone()
        if not row:
            sys.exit("source device %s not found" % args.source_imei)
        source_id = row[0]
        new_id = str(uuid.uuid4())
        cur.execute("CREATE TEMP TABLE demo_dev ON COMMIT DROP AS "
                    "SELECT * FROM devices WHERE id = %s;", (source_id,))
        cur.execute("UPDATE demo_dev SET id = %s, imei = %s, device_name = %s;",
                    (new_id, args.demo_imei, "%s %s" % (DEMO_NAME_PREFIX, args.name)))
        cur.execute("INSERT INTO devices SELECT * FROM demo_dev;")
        cur.execute("INSERT INTO nano_param_values "
                    "(device_id, pid, value_text, value_num, res, source, ts, ts_utc, updated_at) "
                    "SELECT %s, pid, value_text, value_num, res, source, ts, ts_utc, now() "
                    "FROM nano_param_values WHERE device_id = %s;", (new_id, source_id))
        copied = cur.rowcount
    conn.commit()
    print("created %s %s, imei %s, %d config values copied"
          % (DEMO_NAME_PREFIX, args.name, args.demo_imei, copied))
    print("restart nothing: nano_ingest picks the device up on its first frame")


def cleanup_device(conn, args):
    with conn.cursor() as cur:
        cur.execute("SELECT id, device_name FROM devices WHERE imei::text = %s;", (args.demo_imei,))
        rows = cur.fetchall()
        if not rows:
            print("no device with imei %s" % args.demo_imei)
            conn.rollback()
            return
        for dev_id, name in rows:
            if not (name or "").startswith(DEMO_NAME_PREFIX):
                sys.exit("refusing: device %s is named %r, not %s..." % (dev_id, name, DEMO_NAME_PREFIX))
            for table in ("nano_can_capture_chunks", "nano_can_captures", "nano_alerts",
                          "nano_commands", "nano_param_values", "nano_device_state",
                          "nano_frames"):
                cur.execute("DELETE FROM %s WHERE device_id = %%s;" % table, (dev_id,))
                print("  %-26s %d rows deleted" % (table, cur.rowcount))
            cur.execute("DELETE FROM devices WHERE id = %s;", (dev_id,))
            print("  deleted device %r" % name)
    conn.commit()


# --------------------------------------------------------------------------- #
# MQTT
# --------------------------------------------------------------------------- #

def mqtt_connect(args, inbox=None):
    """inbox: a queue that receives the demo unit's /cmd payloads (--control)."""
    import paho.mqtt.client as mqtt
    client_id = "gv-nano-demo-replay"
    try:
        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=client_id)
    except (AttributeError, TypeError):          # paho-mqtt < 2.0
        client = mqtt.Client(client_id=client_id)
    if inbox is not None:
        topic = "sgt/nano/%s/cmd" % args.demo_imei

        def on_connect(c, userdata, flags, rc, properties=None):
            c.subscribe(topic, qos=1)               # again after every reconnect

        def on_message(c, userdata, msg):
            if not msg.retain:
                inbox.put(msg.payload)

        client.on_connect, client.on_message = on_connect, on_message
    client.connect(args.broker_host, args.broker_port, keepalive=60)
    client.loop_start()
    return client


class Stdout:
    """--dry-run stand-in for the MQTT client: "topic {json}", as --selftest reads."""
    def publish(self, topic, payload, qos=0):
        print(topic, payload, flush=True)

        class Info:
            @staticmethod
            def wait_for_publish(timeout=None):
                return True
        return Info()


def publish_alert_history(client, topic, alerts, now):
    """A past set + clear per alert, oldest first (Event History sorts by arrival)."""
    count = len(alerts)
    for i, alert in enumerate(alerts):
        raised = now - (count - i) * 5 * 3600
        for ev, ts in (("set", raised), ("clear", raised + 900)):
            client.publish(topic, json.dumps(alert_payload(alert, ev, ts)), qos=1).wait_for_publish(5)
    log.info("published %d past alert events", count * 2)


def replay(client, frames, args, alerts=()):
    tel = "sgt/nano/%s/tel" % args.demo_imei
    status = "sgt/nano/%s/status" % args.demo_imei
    alert_topic = "sgt/nano/%s/alert" % args.demo_imei
    gps = tuple(float(x) for x in args.gps.split(",")) if args.gps else None
    stopping = []
    signal.signal(signal.SIGINT, lambda *_: stopping.append(1))
    signal.signal(signal.SIGTERM, lambda *_: stopping.append(1))

    def send_status(state):
        client.publish(status, json.dumps({"t": "status", "st": state, "ts": int(time.time()),
                                           "net": "Cell"}), qos=1).wait_for_publish(5)

    send_status("online")
    now = time.time()
    if alerts:
        publish_alert_history(client, alert_topic, alerts, now)
    start, raised = now, None
    # seq starts from the clock so a second run never collides with the first
    # on nano_frames (device_id, boot_id, seq).
    up0, seq0 = now - 3600, int(now)
    n = 0
    pos = 0
    while not stopping:
        if pos >= len(frames):
            if not args.loop:
                break
            pos = 0
        current = alert_at(time.time() - start, alerts, args.alert_first, args.alert_hold,
                           args.alert_gap)
        if current is not raised:
            if raised:
                log.info("alert cleared: %s", raised["id"])
                client.publish(alert_topic, json.dumps(alert_payload(raised, "clear", time.time())),
                               qos=1).wait_for_publish(5)
            if current:
                log.info("alert raised: %s %s", current["id"], current["sev"])
                client.publish(alert_topic, json.dumps(alert_payload(current, "set", time.time())),
                               qos=1).wait_for_publish(5)
            raised = current
        frame = build_frame(frames[pos], n, time.time(), up0, seq0, args.demo_imei,
                            fill=args.fill, gps=gps, band=args.current_band, alert=current)
        client.publish(tel, json.dumps(frame), qos=1).wait_for_publish(5)
        pos += 1
        n += 1
        if n % 20 == 0:
            log.info("sent %d frames (source frame %d of %d)", n, pos, len(frames))
        deadline = time.time() + args.interval
        while not stopping and time.time() < deadline:
            time.sleep(min(0.2, args.interval))
    if raised:
        client.publish(alert_topic, json.dumps(alert_payload(raised, "clear", time.time())),
                       qos=1).wait_for_publish(5)
    send_status("offline")
    log.info("stopped after %d frames; demo device marked offline", n)


# --------------------------------------------------------------------------- #
# --control: follow the GreenVision switch (nano_demo_sim, migration 036)
# --------------------------------------------------------------------------- #

DRIVING = ("driving", "driving_alerts")
ROUTE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                          "nano_demo_route_hyderabad.json")
ON_ROUTE_KM = 0.3        # a last position this close to the route is resumed from


def haversine_km(a, b):
    la1, lo1, la2, lo2 = (math.radians(x) for x in (a[0], a[1], b[0], b[1]))
    h = (math.sin((la2 - la1) / 2) ** 2
         + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2)
    return 2 * 6371 * math.asin(math.sqrt(h))


class Drive:
    """The demo vehicle on a closed loop of [lat, lon] points (made up).

    Until it has driven, position is None and frames keep the replayed unit's
    own GPS. Afterwards it stays parked wherever it last stopped."""

    def __init__(self, points, last=None):
        self.points, self.cum = points, [0.0]
        for a, b in zip(points, points[1:]):
            self.cum.append(self.cum[-1] + haversine_km(a, b))
        self.total = self.cum[-1]
        self.km, self.speed, self.started, self.last_t = 0.0, 0.0, False, None
        if last:
            near = min(range(len(points)), key=lambda i: haversine_km(points[i], last))
            if haversine_km(points[near], last) <= ON_ROUTE_KM:
                self.km, self.started = self.cum[near] % self.total, True

    def step(self, now, moving, n):
        """Advance to now. Speeds up, drifts like traffic, and brakes to a stop."""
        dt = min(max(now - self.last_t, 0.0), 10.0) if self.last_t is not None else 0.0
        self.last_t = now
        target = (46 + 12 * math.sin(2 * math.pi * n / 37)
                  + 5 * math.sin(2 * math.pi * n / 11)) if moving else 0.0
        was = self.speed
        self.speed = min(target, was + 4 * dt) if target > was else max(target, was - 8 * dt)
        self.km = (self.km + (was + self.speed) / 2 * dt / 3600) % self.total
        self.started = self.started or moving

    def halt(self):
        """Signal lost, switched off, rebooting: it doesn't move while unseen."""
        self.speed, self.last_t = 0.0, None

    @property
    def position(self):
        if not self.started:
            return None
        i = min(bisect.bisect_right(self.cum, self.km) - 1, len(self.points) - 2)
        span = self.cum[i + 1] - self.cum[i]
        t = (self.km - self.cum[i]) / span if span else 0.0
        a, b = self.points[i], self.points[i + 1]
        return (round(a[0] + (b[0] - a[0]) * t, 6), round(a[1] + (b[1] - a[1]) * t, 6))

    def apply(self, frame):
        """Make the frame agree with the movement. A drive has its engine running."""
        d = frame["d"]
        if not self.started:
            return
        d["P-4115"] = round(self.speed, 1)
        if self.speed > 0:
            d["P-4113"] = True
            d["P-4104"] = rpm = int(900 + self.speed * 20)
            if "P-5250" in d:
                d["P-5250"] = rpm_zone(rpm)
            if str(d.get("P-5251", "")).startswith("RPM zone"):
                d["P-5251"] = "RPM zone %d" % rpm_zone(rpm)


def load_drive(conn, device_id):
    """The drive, resumed from the unit's last position; None without a route file."""
    try:
        with open(ROUTE_FILE) as f:
            points = json.load(f)
    except (OSError, ValueError) as e:
        log.warning("no driving scenarios: %s", e)
        return None
    with conn.cursor() as cur:
        cur.execute("SELECT last_lat, last_lon FROM nano_device_state WHERE device_id = %s;",
                    (device_id,))
        row = cur.fetchone()
    conn.commit()
    last = (float(row[0]), float(row[1])) if row and None not in row else None
    return Drive(points, last)


def apply_engine_off(frame):
    """Engine stopped: no run signal, no RPM, plant idle, no cell current."""
    frame["d"].update({"P-4113": False, "P-4126": False, "P-4110": False, "P-4111": False,
                       "P-4112": False, "P-4075": 0.0, "P-4104": 0})


def demo_device_id(conn, args):
    with conn.cursor() as cur:
        cur.execute("SELECT id::text FROM devices WHERE imei::text = %s LIMIT 1;",
                    (args.demo_imei,))
        row = cur.fetchone()
    conn.commit()
    if not row:
        sys.exit("no device with imei %s: run --setup first" % args.demo_imei)
    return row[0]                       # require_demo_imei() has checked the 99900 prefix


# --- commands --------------------------------------------------------------- #
# Answers what GreenVision's Commands and Config tabs send, the way NanoV3's
# config_manager / connectivity_owner do, so a set moves the simulated plant.

REPLY_DELAY = 1.5        # the app marks a command "sent" just after publishing
                         # it; an instant answer would be overwritten by that
REBOOT_GRACE, REBOOT_DOWN = 4, 20
NUMERIC = {"float", "int16", "uint16", "uint32", "uint8", "int", "uint"}


def not_simulated(pid):
    """Actions with their own follow-up traffic (OTA, CAN capture, CAN sim)."""
    return pid.startswith("P-53") or pid in ("P-4220", "P-4224", "P-4227")


class SimUnit:
    """The demo unit's parameters, and its answers to /cmd frames."""

    def __init__(self, registry, saved):
        self.registry = registry         # pid -> {type, enums, range, access, default}
        self.values = dict(saved)        # pid -> value, as the unit last reported it
        self.replies = []                # [due, t:cfg fields, plant changed?]
        self.reboot_at = None

    def value(self, pid):
        if pid in self.values:
            return self.values[pid]
        default = self.registry.get(pid, {}).get("default")
        if default is None:
            return ""
        try:
            return self.parse(pid, default)
        except ValueError:
            return default

    @property
    def stopped(self):
        return str(self.value("P-1101")).lower() == "stop"

    @property
    def setpoint(self):
        v = self.value("P-802")
        return v if isinstance(v, (int, float)) and not isinstance(v, bool) else None

    def bounds(self, pid):
        if pid == "P-802":               # the firmware checks against the live ceiling
            top = self.value("P-803")
            return 0.0, float(top) if isinstance(top, (int, float)) else 30.0
        lo, sep, hi = str(self.registry.get(pid, {}).get("range") or "").partition("..")
        try:
            return (float(lo), float(hi)) if sep else None
        except ValueError:
            return None

    def parse(self, pid, raw):
        """raw as this parameter's own type, or ValueError with the unit's reason."""
        meta = self.registry[pid]
        kind = meta["type"]
        if kind == "bool":
            text = str(raw).strip().lower()
            if text in ("true", "1", "on"):
                return True
            if text in ("false", "0", "off"):
                return False
            raise ValueError("want true/false")
        if kind in NUMERIC:
            try:
                num = float(raw)
            except (TypeError, ValueError):
                num = math.nan
            if isinstance(raw, bool) or not math.isfinite(num):
                raise ValueError("want number")
            if kind != "float" and num != int(num):
                raise ValueError("want integer")
            rng = self.bounds(pid)
            if rng and not rng[0] <= num <= rng[1]:
                raise ValueError("range %g..%g" % rng)
            return num if kind == "float" else int(num)
        if meta["enums"]:
            for option in meta["enums"]:
                if option.lower() == str(raw).strip().lower():
                    return option
            raise ValueError("want one of: %s" % " | ".join(meta["enums"]))
        return str(raw)

    def reply(self, now, pid, val, res="ok", changed=False):
        if res == "ok" and self.registry.get(pid, {}).get("access") == "WO":
            val = "***" if val != "" else ""
        self.replies.append([now + REPLY_DELAY, {"id": pid, "val": val, "res": res}, changed])

    def nack(self, now, pid, val, reason):
        self.reply(now, pid or "?", val if val is not None else "", reason[:63])
        # The ingest stores a refused value like any other, so the screens would
        # show it as the unit's own. Report the value the unit still holds.
        if pid in self.registry:
            self.reply(now, pid, self.value(pid))

    def set(self, now, pid, raw):
        meta = self.registry.get(pid)
        if meta is None or meta["access"] not in ("RW", "WO"):
            return self.nack(now, pid, raw, "not settable (%s)" % pid)
        if not_simulated(pid):
            return self.nack(now, pid, raw, "not simulated")
        try:
            self.values[pid] = self.parse(pid, raw)
        except ValueError as e:
            return self.nack(now, pid, raw, str(e))
        self.reply(now, pid, self.values[pid], changed=True)
        if pid == "P-803" and self.setpoint is not None and self.setpoint > self.values[pid]:
            self.values["P-802"] = self.values[pid]      # firmware clamps and reports it
            self.reply(now, "P-802", self.values["P-802"], changed=True)

    def command(self, raw, now):
        try:
            c = json.loads(raw)
        except (ValueError, UnicodeDecodeError):
            c = None
        if not isinstance(c, dict):
            return self.nack(now, "", "", "bad json")
        verb, pid = c.get("cmd"), str(c.get("id") or "")
        log.info("command: %s %s", verb, pid)
        if verb == "set":
            if not pid or "val" not in c:
                self.nack(now, pid, "", "set needs id+val")
            else:
                self.set(now, pid, c["val"])
        elif verb in ("stop", "start"):
            self.set(now, "P-1101", "Stop" if verb == "stop" else "Run")
        elif verb == "get":
            if pid in self.registry:
                self.reply(now, pid, self.value(pid))
            else:
                self.nack(now, pid, "", "unknown id (%s)" % pid)
        elif verb == "getall":
            for known in self.registry:
                self.reply(now, known, self.value(known))
        elif verb == "reboot":
            self.reply(now, "reboot", "", "rebooting")
            self.reboot_at = now + REPLY_DELAY + REBOOT_GRACE
        elif verb == "rs485":
            self.nack(now, "rs485", c.get("val"), "rs485 unsupported")
        else:
            self.nack(now, pid, "", "unknown cmd")

    def due(self, now, limit=5):
        """Up to limit replies whose time has come, oldest first."""
        out = []
        while self.replies and len(out) < limit and self.replies[0][0] <= now:
            out.append(self.replies.pop(0))
        return out

    def apply(self, frame):
        """STOP is latching and outranks whatever the scenario shows."""
        if self.stopped:
            frame["d"].update({"P-4114": True, "P-4126": False, "P-4110": False,
                               "P-4111": False, "P-4112": False, "P-4075": 0.0})


def load_unit(conn, device_id):
    with conn.cursor() as cur:
        cur.execute("SELECT pid, data_type, enum_values, valid_range, access, default_value "
                    "FROM nano_registry WHERE generations IS NULL OR 'NanoV3' = ANY(generations) "
                    "ORDER BY pid;")
        registry = {r[0]: {"type": r[1], "enums": r[2], "range": r[3], "access": r[4],
                           "default": r[5]} for r in cur.fetchall()}
        # res <> 'ok' is a refused value, not one the unit holds.
        cur.execute("SELECT pid, value_text FROM nano_param_values "
                    "WHERE device_id = %s AND value_text IS NOT NULL "
                    "AND COALESCE(res, 'ok') = 'ok';", (device_id,))
        rows = cur.fetchall()
    conn.commit()
    unit = SimUnit(registry, {})
    # P-803 first: it bounds P-802.
    for pid, text in sorted(rows, key=lambda r: r[0] != "P-803"):
        if pid in registry:
            try:
                unit.values[pid] = unit.parse(pid, text)
            except ValueError:
                log.warning("saved %s=%r ignored, using the default", pid, text)
    return unit


def read_switch(conn, device_id, note):
    """(enabled, scenario) from nano_demo_sim, stamping the worker heartbeat."""
    with conn.cursor() as cur:
        cur.execute("INSERT INTO nano_demo_sim (device_id, worker_seen_at, worker_note) "
                    "VALUES (%s, now(), %s) ON CONFLICT (device_id) DO UPDATE "
                    "SET worker_seen_at = now(), worker_note = EXCLUDED.worker_note "
                    "RETURNING enabled, scenario;", (device_id, note))
        row = cur.fetchone()
    conn.commit()
    return bool(row[0]), row[1]


def control(client, conn, frames, args, catalog, device_id, unit, inbox, drive=None):
    tel = "sgt/nano/%s/tel" % args.demo_imei
    status = "sgt/nano/%s/status" % args.demo_imei
    alert_topic = "sgt/nano/%s/alert" % args.demo_imei
    gps = tuple(float(x) for x in args.gps.split(",")) if args.gps else None
    # "Producing" scenarios: skip frames where the engine ran but the plant did not.
    frames = [f for f in frames if (f.get("d") or {}).get("P-4126")] or frames
    by_id = {a["id"]: a for a in catalog}
    codes = [c.strip() for c in args.alert_codes.split(",")] if args.alert_codes else None
    cycle = [by_id[c] for c in codes if c in by_id] if codes else pick_alerts(catalog, None)
    stopping = []
    signal.signal(signal.SIGINT, lambda *_: stopping.append(1))
    signal.signal(signal.SIGTERM, lambda *_: stopping.append(1))

    def pub(topic, payload):
        client.publish(topic, json.dumps(payload), qos=1).wait_for_publish(5)

    def send_status(state):
        pub(status, {"t": "status", "st": state, "ts": int(time.time()), "net": "Cell"})

    now = time.time()
    up0, seq0 = now - 3600, int(now)
    n = pos = 0
    sending, scenario, raised, cycle_start = False, None, None, now
    note = "starting"
    down_until = 0                       # rebooting: silent until then
    log.info("unit starts at P-802=%s, P-1101=%s", unit.value("P-802"), unit.value("P-1101"))
    log.info("control mode: following nano_demo_sim for device %s", device_id)

    while not stopping:
        try:
            enabled, want = read_switch(conn, device_id, note)
        except Exception as e:                       # DB restart, dropped connection...
            log.warning("switch read failed (%s); reconnecting", e)
            try:
                conn.close()
            except Exception:
                pass
            time.sleep(5)
            try:
                conn = db_connect(args)
            except Exception as e2:
                log.warning("reconnect failed: %s", e2)
            continue

        now = time.time()
        if unit.reboot_at and now >= unit.reboot_at:
            log.info("rebooting")
            unit.reboot_at, unit.replies, down_until = None, [], now + REBOOT_DOWN
            up0 = down_until                         # uptime restarts, as on a real unit
        rebooting = now < down_until
        want_send = enabled and want != "offline" and not rebooting
        if want != scenario:
            log.info("scenario: %s -> %s", scenario, want)
            if raised:
                pub(alert_topic, alert_payload(raised, "clear", time.time()))
                raised = None
            scenario, cycle_start = want, time.time()
        if want_send and not sending:
            log.info("simulation on (%s)", scenario)
            send_status("online")
        elif sending and not want_send:
            if raised:
                pub(alert_topic, alert_payload(raised, "clear", time.time()))
                raised = None
            if not enabled or rebooting:
                send_status("offline")
            log.info("simulation %s", "off" if not enabled else
                     "paused: reboot" if rebooting else "paused: signal lost")
        sending = want_send
        if drive and not sending:
            drive.halt()

        if sending:
            if scenario in ("alerts", "driving_alerts"):
                current = alert_at(time.time() - cycle_start, cycle, args.alert_first,
                                   args.alert_hold, args.alert_gap)
            elif scenario.startswith("alert:"):
                current = by_id.get(scenario[6:])
            else:
                current = None
            if current is not raised:
                if raised:
                    pub(alert_topic, alert_payload(raised, "clear", time.time()))
                if current:
                    pub(alert_topic, alert_payload(current, "set", time.time()))
                raised = current
            if pos >= len(frames):
                pos = 0
            if drive:
                drive.step(time.time(), scenario in DRIVING, n)
            where = (drive.position if drive else None) or gps
            frame = build_frame(frames[pos], n, time.time(), up0, seq0, args.demo_imei,
                                fill=args.fill, gps=where, band=args.current_band, alert=current,
                                setpoint=unit.setpoint)
            if scenario == "engine_off":
                apply_engine_off(frame)
                if drive:
                    drive.speed = 0.0
            if drive:
                drive.apply(frame)
            unit.apply(frame)
            pub(tel, frame)
            pos += 1
            n += 1
            note = "sending %s, %d frames%s" % (scenario, n,
                                                ", stopped by command" if unit.stopped else "")
        elif rebooting and enabled:
            note = "rebooting"
        else:
            note = "idle (%s)" % ("off" if not enabled else "signal lost")

        # Between frames: take commands and answer them. A unit that is off, out
        # of coverage or restarting never sees them; GreenVision's retry sends
        # set / stop / start again once it is back.
        deadline = time.time() + args.interval
        while not stopping and time.time() < deadline:
            while True:
                try:
                    raw = inbox.get_nowait()
                except queue.Empty:
                    break
                if sending:
                    unit.command(raw, time.time())
            if not sending:
                unit.replies, unit.reboot_at = [], None
            for _, fields, changed in unit.due(time.time()):
                pub(tel, dict({"v": 2, "t": "cfg", "ts": int(time.time())}, **fields))
                if changed:
                    deadline = 0                     # show the change at once
            time.sleep(min(0.2, args.interval))

    if raised:
        pub(alert_topic, alert_payload(raised, "clear", time.time()))
    if sending:
        send_status("offline")
    try:
        read_switch(conn, device_id, "stopped")
    except Exception:
        pass
    log.info("control mode stopped after %d frames", n)


def main():
    ap = argparse.ArgumentParser(description="Replay a unit's stored frames as a demo device.")
    ap.add_argument("--setup", action="store_true", help="create the demo device, then exit")
    ap.add_argument("--cleanup", action="store_true", help="delete the demo device and its data")
    ap.add_argument("--coverage", action="store_true", help="list present/missing Live parameters")
    ap.add_argument("--list-alerts", action="store_true", help="print the alert catalog")
    ap.add_argument("--control", action="store_true",
                    help="run as a service: follow the GreenVision switch (nano_demo_sim)")
    ap.add_argument("--source-imei", default=DEFAULT_SOURCE_IMEI)
    ap.add_argument("--demo-imei", default=DEFAULT_DEMO_IMEI)
    ap.add_argument("--name", default="Nano Replay", help="demo device name, after the DEMO prefix")
    ap.add_argument("--days", type=int, default=7, help="how far back to read frames")
    ap.add_argument("--active-only", action="store_true",
                    help="only frames where the plant or engine was running")
    ap.add_argument("--interval", type=float, default=3.0, help="seconds between frames")
    ap.add_argument("--loop", action="store_true", help="start over when the frames run out")
    ap.add_argument("--fill", action="store_true", help="add SAMPLE values for missing parameters")
    ap.add_argument("--gps", metavar="LAT,LON", help="report this fixed position in every frame")
    ap.add_argument("--current-band", type=float, default=10.0,
                    help="keep cell current within +-N%% of P-802 (0 = leave the real value)")
    ap.add_argument("--alerts", action="store_true", help="simulate alerts (made up)")
    ap.add_argument("--alert-codes", help="comma list, in order; default one per severity")
    ap.add_argument("--alert-first", type=float, default=30, help="seconds before the first alert")
    ap.add_argument("--alert-hold", type=float, default=40, help="seconds each alert stays raised")
    ap.add_argument("--alert-gap", type=float, default=20, help="seconds of all-clear between alerts")
    ap.add_argument("--catalog-file", metavar="FILE", help="catalog from JSON, not the DB (testing)")
    ap.add_argument("--broker-host", default="127.0.0.1")
    ap.add_argument("--broker-port", type=int, default=8883)
    ap.add_argument("--dsn")
    ap.add_argument("--from-file", metavar="FILE", help="read stored frames from JSONL, not the DB")
    ap.add_argument("--dry-run", action="store_true", help="print frames instead of publishing")
    args = ap.parse_args()

    logging.basicConfig(level=logging.INFO, stream=sys.stderr,
                        format="%(asctime)s %(levelname)s %(message)s")
    require_demo_imei(args)

    conn = None if args.from_file else db_connect(args)
    if args.setup:
        return setup_device(conn, args)
    if args.cleanup:
        return cleanup_device(conn, args)

    catalog = []
    if args.list_alerts or args.alerts or args.control:
        if args.catalog_file:
            with open(args.catalog_file) as f:
                catalog = json.load(f)
        else:
            catalog = load_catalog(conn)
    if args.list_alerts:
        return list_alerts(catalog)
    alerts = []
    if args.alerts:
        codes = [c.strip() for c in args.alert_codes.split(",")] if args.alert_codes else None
        alerts = pick_alerts(catalog, codes)
        log.info("alerts: %s", ", ".join("%s %s" % (a["id"], a["sev"]) for a in alerts))

    if args.from_file:
        with open(args.from_file) as f:
            frames = [json.loads(line) for line in f if line.strip()]
    else:
        frames = load_frames(conn, args)
        if not args.control:
            conn.close()
    if args.control:
        if conn is None:
            sys.exit("--control needs the database (no --from-file)")
        if not frames:
            sys.exit("no frames found for %s in the last %d days" % (args.source_imei, args.days))
        device_id = demo_device_id(conn, args)
        unit = load_unit(conn, device_id)
        inbox = queue.Queue()
        client = Stdout() if args.dry_run else mqtt_connect(args, inbox)
        control(client, conn, frames, args, catalog, device_id, unit, inbox,
                load_drive(conn, device_id))
        if not args.dry_run:
            client.loop_stop()
            client.disconnect()
        return
    if args.coverage:
        return coverage(frames)
    if not frames:
        sys.exit("no frames found for %s in the last %d days" % (args.source_imei, args.days))

    log.info("%d frames, %.0f min at %gs per frame", len(frames),
             len(frames) * args.interval / 60, args.interval)
    client = Stdout() if args.dry_run else mqtt_connect(args)
    replay(client, frames, args, alerts)
    if not args.dry_run:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    main()
