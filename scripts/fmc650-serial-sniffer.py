#!/usr/bin/env python3
"""
Bench listener for an FMC650 whose RS-485 port is in TCP Binary mode.

Point ONE test unit's server address at this script (spare port on the ingest
host, or ngrok/your laptop). It speaks just enough Teltonika to keep the unit
happy — IMEI handshake, Codec 8/8E acks — and prints every Codec 12/13 packet
(the RS-485 traffic) as hex, decoding it as a Modbus RTU frame when it looks
like one.

    python scripts/fmc650-serial-sniffer.py --port 5027
    python scripts/fmc650-serial-sniffer.py --port 5027 --poll 10 --slave 1 --start 0 --count 14

--poll N sends a Modbus "read holding registers" request down to the FMC650
every N seconds (Codec 12, type --cmd-type) so the sensor answers without
ModScan32 on the bus. Which type the unit forwards to the port is in the wiki
table "behavior when it receives different CMD ID (Type) values"; try 5, then
the unit's configured Command ID (6). Leave it off while ModScan32 is still wired in parallel — two
masters on one RS-485 bus collide.

While it runs, type a line starting with "!" to send a normal GPRS text
command to every connected unit (e.g. "!getver", "!setparam 2005:5027"); the
unit's text reply is printed. That is how you point the unit back at the
production ingest when the test is over.

Nothing is written to any database. Output goes to stdout and serial-sniffer.log.
"""
import argparse
import asyncio
import datetime as dt
import struct
import sys

LOG = open("serial-sniffer.log", "a", buffering=1)
CLIENTS: dict[str, asyncio.StreamWriter] = {}     # imei -> writer


def log(msg: str) -> None:
    line = f"{dt.datetime.now().isoformat(timespec='seconds')}  {msg}"
    print(line)
    LOG.write(line + "\n")


# ── CRCs ──────────────────────────────────────────────────────────────────────
# Both are CRC-16 with the reflected 0xA001 polynomial; they differ only in the
# initial value. Teltonika (CRC-16/ARC) starts at 0x0000, Modbus at 0xFFFF.

def crc16(data: bytes, init: int) -> int:
    crc = init
    for b in data:
        crc ^= b
        for _ in range(8):
            crc = (crc >> 1) ^ 0xA001 if crc & 1 else crc >> 1
    return crc & 0xFFFF


def teltonika_crc(data: bytes) -> int:
    return crc16(data, 0x0000)


def modbus_crc(data: bytes) -> int:
    return crc16(data, 0xFFFF)


# ── Modbus RTU decode ─────────────────────────────────────────────────────────

def describe_modbus(frame: bytes) -> str:
    """Best-effort description of a raw RTU frame; never raises."""
    if len(frame) < 4:
        return "(too short for Modbus)"
    body, crc = frame[:-2], struct.unpack("<H", frame[-2:])[0]
    crc_ok = modbus_crc(body) == crc
    unit, fc = body[0], body[1]
    tag = f"unit={unit} fc=0x{fc:02X} crc={'ok' if crc_ok else 'BAD'}"

    if fc in (0x03, 0x04) and len(body) == 6:
        start, qty = struct.unpack(">HH", body[2:6])
        return f"REQUEST  {tag} start={start} qty={qty}"

    if fc in (0x03, 0x04) and len(body) >= 3 and body[2] == len(body) - 3:
        regs = struct.unpack(f">{body[2] // 2}H", body[3:3 + body[2]])
        s16 = [r - 65536 if r > 32767 else r for r in regs]
        out = [f"RESPONSE {tag} regs={len(regs)}",
               f"    u16 : {list(regs)}",
               f"    s16 : {s16}",
               f"    x0.1: {[round(v / 10, 1) for v in s16]}"]
        if len(regs) % 2 == 0:
            raw = body[3:3 + body[2]]
            floats = struct.unpack(f">{len(regs) // 2}f", raw)
            out.append(f"    f32 : {[round(f, 3) for f in floats]}   (IEEE754 big-endian, DFM-style)")
        return "\n".join(out)

    if fc & 0x80:
        return f"EXCEPTION {tag} code={body[2] if len(body) > 2 else '?'}"

    return f"OTHER    {tag}"


# ── Teltonika packet helpers ──────────────────────────────────────────────────

def build_codec12(payload: bytes, cmd_type: int = 0x05) -> bytes:
    """Server -> device Codec 12. In TCP Binary mode the FMC650 writes the
    payload straight to RS-485."""
    core = bytes([0x0C, 0x01, cmd_type]) + struct.pack(">I", len(payload)) + payload + b"\x01"
    return b"\x00\x00\x00\x00" + struct.pack(">I", len(core)) + core + struct.pack(">I", teltonika_crc(core))  # CRC-16 travels in a 4-byte field


def build_modbus_read(slave: int, fc: int, start: int, count: int) -> bytes:
    body = struct.pack(">BBHH", slave, fc, start, count)
    return body + struct.pack("<H", modbus_crc(body))


def handle_serial_packet(core: bytes, imei: str) -> None:
    codec = core[0]
    cmd_type = core[2]
    size = struct.unpack(">I", core[3:7])[0]
    data = core[7:7 + size]
    when = ""
    if codec == 0x0D:                       # Codec 13 = Codec 12 + timestamp
        ts = struct.unpack(">I", data[:4])[0]
        when = f" device_ts={dt.datetime.fromtimestamp(ts, dt.timezone.utc).isoformat()}"
        data = data[4:]
    log(f"[{imei}] codec=0x{codec:02X} type=0x{cmd_type:02X}{when} len={len(data)} hex={data.hex(' ')}")
    if data and all(32 <= b < 127 or b in (9, 10, 13) for b in data):
        log(f"[{imei}]   TEXT: {data.decode('ascii').strip()}")
    else:
        log(f"[{imei}]   {describe_modbus(data)}")


# ── Connection handler ────────────────────────────────────────────────────────

async def read_exact(reader: asyncio.StreamReader, n: int) -> bytes:
    return await reader.readexactly(n)


async def poller(writer: asyncio.StreamWriter, imei: str, args) -> None:
    frame = build_modbus_read(args.slave, args.fc, args.start, args.count)
    pkt = build_codec12(frame, args.cmd_type)
    log(f"[{imei}] poller armed: every {args.poll}s sending RTU {frame.hex(' ')} as codec12 type 0x{args.cmd_type:02X}")
    while True:
        await asyncio.sleep(args.poll)
        writer.write(pkt)
        await writer.drain()
        log(f"[{imei}] -> poll sent ({len(pkt)} bytes codec12)")


async def handle(reader: asyncio.StreamReader, writer: asyncio.StreamWriter, args) -> None:
    peer = writer.get_extra_info("peername")
    imei = "?"
    poll_task = None
    try:
        # IMEI handshake: 2-byte length + ASCII IMEI, reply 0x01 to accept.
        n = struct.unpack(">H", await read_exact(reader, 2))[0]
        imei = (await read_exact(reader, n)).decode("ascii", "replace")
        writer.write(b"\x01")
        await writer.drain()
        log(f"[{imei}] connected from {peer}")
        CLIENTS[imei] = writer

        if args.poll:
            poll_task = asyncio.create_task(poller(writer, imei, args))

        while True:
            preamble = await read_exact(reader, 4)
            if preamble != b"\x00\x00\x00\x00":
                log(f"[{imei}] bad preamble {preamble.hex()} — dropping connection")
                return
            length = struct.unpack(">I", await read_exact(reader, 4))[0]
            core = await read_exact(reader, length)
            crc = struct.unpack(">I", await read_exact(reader, 4))[0]   # 4-byte CRC field
            if teltonika_crc(core) != crc:
                log(f"[{imei}] CRC mismatch on codec 0x{core[0]:02X} packet — ignoring")
                continue

            codec = core[0]
            if codec in (0x08, 0x8E):
                # AVL records: ack the record count so the unit stops resending.
                count = core[1]
                writer.write(struct.pack(">I", count))
                await writer.drain()
                if args.verbose:
                    log(f"[{imei}] codec=0x{codec:02X} {count} AVL record(s) acked")
            elif codec in (0x0C, 0x0D):
                handle_serial_packet(core, imei)
            else:
                log(f"[{imei}] unhandled codec 0x{codec:02X} len={length}")
    except (asyncio.IncompleteReadError, ConnectionResetError):
        log(f"[{imei}] disconnected")
    finally:
        if poll_task:
            poll_task.cancel()
        if CLIENTS.get(imei) is writer:     # a newer socket may already have replaced us
            del CLIENTS[imei]
        writer.close()


async def console() -> None:
    """Lines typed as "!<gprs command>" go to every connected unit as a
    Codec 12 text command — the same thing the GreenVis Commands tab sends."""
    while True:
        line = await asyncio.to_thread(sys.stdin.readline)
        if not line:                       # stdin closed (nohup / no tty)
            return
        line = line.strip()
        if not line.startswith("!"):
            continue
        cmd = line[1:].strip()
        if not CLIENTS:
            log(f"console: no unit connected, not sending '{cmd}'")
            continue
        pkt = build_codec12(cmd.encode("ascii"))
        for imei, w in list(CLIENTS.items()):
            w.write(pkt)
            await w.drain()
            log(f"[{imei}] -> gprs command sent: {cmd}")


async def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--host", default="0.0.0.0")
    p.add_argument("--port", type=int, default=5027)
    p.add_argument("--poll", type=float, default=0, help="seconds between Modbus polls (0 = listen only)")
    p.add_argument("--slave", type=int, default=1)
    p.add_argument("--fc", type=lambda s: int(s, 0), default=0x03, help="0x03 holding / 0x04 input")
    p.add_argument("--start", type=int, default=0)
    p.add_argument("--count", type=int, default=14)
    p.add_argument("--cmd-type", type=lambda s: int(s, 0), default=5,
                   help="Codec 12 type byte for the poll: 5 = GPRS command channel, or the RS-485 'Command ID' configured on the unit (6)")
    p.add_argument("-v", "--verbose", action="store_true", help="also log AVL packet acks")
    args = p.parse_args()

    server = await asyncio.start_server(lambda r, w: handle(r, w, args), args.host, args.port)
    log(f"listening on {args.host}:{args.port}  poll={'off' if not args.poll else f'{args.poll}s'}")
    asyncio.create_task(console())
    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        sys.exit(0)
