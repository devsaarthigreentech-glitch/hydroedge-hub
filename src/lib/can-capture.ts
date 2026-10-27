// ============================================================================
// NanoV3 remote CAN capture → candump .log
// ----------------------------------------------------------------------------
// The device (firmware 28bc6a1, can_capture.h) uploads one byte stream in
// chunks; the ingest stores the decoded chunks. Joined in seq order the stream
// is records back to back, little-endian:
//     u32 t_ms   ms since capture start
//     u32 id     bit 31 set = 29-bit identifier (mask 0x1FFFFFFF)
//     u8  dlc    0..8
//     u8  data[dlc]
// Each record becomes one candump -l line, which SavvyCAN and cantools open:
//     (1793020509.123000) can0 124#080F880000000270
// ============================================================================

export interface CandumpResult {
  text: string;
  frames: number;
  /** bytes left over that do not make a whole record (or a bad dlc stopped parsing) */
  trailing: number;
}

const hex = (v: number, width: number) => v.toString(16).toUpperCase().padStart(width, '0');

/** Seconds with microseconds, as candump prints them. t0 = 0: relative to the capture start. */
function stamp(t0: number, tMs: number): string {
  const sec = t0 + Math.floor(tMs / 1000);
  const usec = (tMs % 1000) * 1000;
  return `${sec}.${String(usec).padStart(6, '0')}`;
}

export function toCandump(buf: Buffer, t0: number, iface = 'can0'): CandumpResult {
  const lines: string[] = [];
  let off = 0;
  while (off + 9 <= buf.length) {
    const tMs = buf.readUInt32LE(off);
    const rawId = buf.readUInt32LE(off + 4);
    const dlc = buf[off + 8];
    if (dlc > 8 || off + 9 + dlc > buf.length) break;
    const ext = (rawId & 0x80000000) !== 0;
    const id = ext ? hex(rawId & 0x1fffffff, 8) : hex(rawId & 0x7ff, 3);
    const data = buf.subarray(off + 9, off + 9 + dlc).toString('hex').toUpperCase();
    lines.push(`(${stamp(t0, tMs)}) ${iface} ${id}#${data}`);
    off += 9 + dlc;
  }
  return { text: lines.length ? lines.join('\n') + '\n' : '', frames: lines.length, trailing: buf.length - off };
}

/**
 * Join stored chunks in seq order. Chunks slice the stream mid-record, so a
 * missing chunk misaligns everything after it: only the unbroken run from
 * seq 0 is usable. Returns that run and how many chunks it covers.
 */
export function joinChunks(chunks: Array<{ seq: number; data: Buffer }>): { buf: Buffer; contiguous: number } {
  const sorted = [...chunks].sort((a, b) => a.seq - b.seq);
  const parts: Buffer[] = [];
  for (const c of sorted) {
    if (c.seq !== parts.length) break;
    parts.push(c.data);
  }
  return { buf: Buffer.concat(parts), contiguous: parts.length };
}
