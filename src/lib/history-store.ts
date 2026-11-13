// ============================================================================
// HISTORY STORE — io_records older than prod, read from DigitalOcean Spaces
// ----------------------------------------------------------------------------
// Prod io_records starts at HISTORY_CUTOVER (the 2026-10-07 offload swap moved
// everything older off the box). That history, plus the GreenVision-era archive
// that used to be read from the Hostinger box, lives in the Spaces bucket as
// small gzipped CSVs written by scripts/split-history.sh:
//
//   history/<device_id>/<io_id>/<YYYY-MM>.csv.gz   rows: timestamp,io_value
//   history/_months.txt                            months the split has finished
//
// /api/io-logs and its /export read windows before the cutover from here and
// windows at or after it from prod, exactly as they used to split between the
// archive database and prod.
//
// ── Missing vs empty ────────────────────────────────────────────────────────
// A file that does not exist for a FINISHED month means the device sent no rows
// for that IO that month: an empty result is correct. A month the split has not
// finished is an error, so a half-run never looks like a real gap.
//
// ── Config (prod .env.local) ────────────────────────────────────────────────
//   HISTORY_S3_KEY / HISTORY_S3_SECRET   read-only Spaces key for the bucket
//   HISTORY_S3_BUCKET   default sgt-hydroedge-archive
//   HISTORY_S3_REGION   default sgp1
//   HISTORY_CUTOVER_UTC default 2026-09-07T00:00:00Z
// Unset key → disabled, and every window is served from prod alone, as before.
// ============================================================================

import crypto from 'crypto';
import zlib from 'zlib';
import type { LogQuery } from './io-logs-query';

const BUCKET = process.env.HISTORY_S3_BUCKET || 'sgt-hydroedge-archive';
const REGION = process.env.HISTORY_S3_REGION || 'sgp1';
const HOST = `${REGION}.digitaloceanspaces.com`;
const PREFIX = 'history';

export const HISTORY_CUTOVER = new Date(process.env.HISTORY_CUTOVER_UTC || '2026-09-07T00:00:00Z');

// Same floor as buildLogSql, which hides rows stamped by an unset device clock.
const MIN_TS = Date.parse('2025-01-01T00:00:00Z');

export function isHistoryEnabled(): boolean {
  return Boolean(process.env.HISTORY_S3_KEY && process.env.HISTORY_S3_SECRET);
}

export interface HistoryRow { io_id: number; io_value: string; timestamp: Date }

// ── S3 GET with SigV4 (Spaces speaks the S3 API) ────────────────────────────

const hmac = (key: crypto.BinaryLike, s: string) => crypto.createHmac('sha256', key).update(s).digest();
const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

/** The object's bytes, or null if it does not exist. */
async function s3Get(key: string): Promise<Buffer | null> {
  const path = `/${BUCKET}/${key.split('/').map(encodeURIComponent).join('/')}`;
  const amzDate = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const day = amzDate.slice(0, 8);
  const scope = `${day}/${REGION}/s3/aws4_request`;
  const signed = 'host;x-amz-content-sha256;x-amz-date';
  const canonical = [
    'GET', path, '',
    `host:${HOST}`, 'x-amz-content-sha256:UNSIGNED-PAYLOAD', `x-amz-date:${amzDate}`, '',
    signed, 'UNSIGNED-PAYLOAD',
  ].join('\n');
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n');
  let k: Buffer = hmac(`AWS4${process.env.HISTORY_S3_SECRET}`, day);
  for (const part of [REGION, 's3', 'aws4_request']) k = hmac(k, part);
  const signature = crypto.createHmac('sha256', k).update(toSign).digest('hex');

  const res = await fetch(`https://${HOST}${path}`, {
    headers: {
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
      'x-amz-date': amzDate,
      Authorization: `AWS4-HMAC-SHA256 Credential=${process.env.HISTORY_S3_KEY}/${scope}, SignedHeaders=${signed}, Signature=${signature}`,
    },
    signal: AbortSignal.timeout(20_000),
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`history store: GET ${key} → HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Caches ──────────────────────────────────────────────────────────────────
// The export walks a window in 6 h slices, so without a cache it would fetch
// the same month file once per slice. Parsed files are small (one device, one
// IO, one month), so a short-lived cache of a few dozen is cheap.

type Parsed = { ts: number; v: string }[];   // sorted by ts
const FILE_TTL_MS = 10 * 60_000;
const FILE_CACHE_MAX = 24;
const fileCache = new Map<string, { at: number; rows: Promise<Parsed> }>();

let monthsCache: { at: number; months: Promise<Set<string>> } | null = null;

function finishedMonths(): Promise<Set<string>> {
  if (monthsCache && Date.now() - monthsCache.at < FILE_TTL_MS) return monthsCache.months;
  const months = s3Get(`${PREFIX}/_months.txt`).then(
    (b) => new Set((b ? b.toString('utf8') : '').split('\n').map((s) => s.trim()).filter(Boolean))
  );
  monthsCache = { at: Date.now(), months };
  months.catch(() => { monthsCache = null; });
  return months;
}

function parse(buf: Buffer): Parsed {
  const out: Parsed = [];
  for (const line of zlib.gunzipSync(buf).toString('utf8').split('\n')) {
    if (!line) continue;
    // timestamp,io_value — DuckDB quotes a field only if it contains a comma or
    // quote, which neither a timestamp nor a numeric value does; strip defensively.
    const i = line.indexOf(',');
    const ts = Date.parse(line.slice(0, i).replace(/"/g, ''));
    if (!isNaN(ts)) out.push({ ts, v: line.slice(i + 1).replace(/"/g, '') });
  }
  // The split writes partitions in parallel, so file order is not guaranteed.
  return out.sort((a, b) => a.ts - b.ts);
}

/** Index of the first row with ts >= t. */
function lowerBound(rows: Parsed, t: number): number {
  let lo = 0, hi = rows.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (rows[mid].ts < t) lo = mid + 1; else hi = mid;
  }
  return lo;
}

function monthFile(deviceId: string, ioId: number, month: string): Promise<Parsed> {
  const key = `${PREFIX}/${deviceId.toLowerCase()}/${ioId}/${month}.csv.gz`;
  const hit = fileCache.get(key);
  if (hit && Date.now() - hit.at < FILE_TTL_MS) return hit.rows;
  const rows = s3Get(key).then((b) => (b ? parse(b) : []));
  fileCache.set(key, { at: Date.now(), rows });
  rows.catch(() => fileCache.delete(key));
  while (fileCache.size > FILE_CACHE_MAX) fileCache.delete(fileCache.keys().next().value!);
  return rows;
}

function monthsBetween(from: Date, to: Date): string[] {
  const out: string[] = [];
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  while (d <= to) {
    out.push(d.toISOString().slice(0, 7));
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return out;
}

// ── Query ───────────────────────────────────────────────────────────────────

/**
 * Rows for `[start, end]` (inclusive, clipped to before the cutover) with the
 * same filters buildLogSql applies, sorted by timestamp in `order`.
 *
 * With `limit` (DESC only) months are read newest first and reading stops once
 * `limit` rows are in hand — older months cannot enter the newest N — so a
 * 31-day window on a busy device never holds the whole range in memory.
 */
export async function historyQuery(
  deviceId: string, q: LogQuery, start: Date, end: Date, order: 'asc' | 'desc', limit?: number
): Promise<HistoryRow[]> {
  if (!isHistoryEnabled()) throw new Error('History store is not configured');

  const from = Math.max(start.getTime(), MIN_TS);
  const to = Math.min(end.getTime(), HISTORY_CUTOVER.getTime() - 1);
  if (from > to) return [];

  const months = monthsBetween(new Date(from), new Date(to));
  const finished = await finishedMonths();
  // Months before the earliest split month predate the export: genuinely empty.
  const earliest = [...finished].sort()[0];
  const pending = months.filter((m) => !finished.has(m) && earliest !== undefined && m >= earliest);
  if (finished.size === 0 || pending.length) {
    throw new Error(`history not yet available for ${pending.length ? pending.join(', ') : 'any month'}`);
  }

  const cmp = order === 'asc'
    ? (a: HistoryRow, b: HistoryRow) => a.timestamp.getTime() - b.timestamp.getTime()
    : (a: HistoryRow, b: HistoryRow) => b.timestamp.getTime() - a.timestamp.getTime();
  const capped = order === 'desc' && limit !== undefined;

  const batches = capped ? [...months].reverse().map((m) => [m]) : [months];

  const out: HistoryRow[] = [];
  for (const batch of batches) {
    const files = await Promise.all(
      q.ioIds.flatMap((io) => batch.map((mm) => monthFile(deviceId, io, mm).then((rows) => ({ io, rows }))))
    );
    const chunk: HistoryRow[] = [];
    for (const { io, rows } of files) {
      for (let i = lowerBound(rows, from); i < rows.length && rows[i].ts <= to; i++) {
        const r = rows[i];
        if (q.min !== null || q.max !== null) {
          const n = parseFloat(r.v);
          if (isNaN(n)) continue;
          if (q.min !== null && n < q.min) continue;
          if (q.max !== null && n > q.max) continue;
        }
        chunk.push({ io_id: io, io_value: r.v, timestamp: new Date(r.ts) });
      }
    }
    // A loop, not push(...chunk): a week of one busy device is >100k rows,
    // which overflows the call stack as spread arguments.
    chunk.sort(cmp);
    for (const r of chunk) {
      out.push(r);
      if (capped && out.length >= limit!) return out;
    }
  }
  return out;
}

export type LogSources = { history: boolean; primary: boolean };

/**
 * Which store(s) hold `[start, end]`. A window straddling the cutover needs
 * both — returning one side would silently truncate the result at an arbitrary
 * date. At least one is always true.
 */
export function planLogSources(start: Date, end: Date): LogSources {
  if (!isHistoryEnabled()) return { history: false, primary: true };
  const cutover = HISTORY_CUTOVER.getTime();
  return {
    history: start.getTime() < cutover,
    primary: end.getTime() >= cutover,
  };
}
