// ============================================================================
// ARCHIVE DATABASE — read-only raw history on a second Postgres
// ----------------------------------------------------------------------------
// Some devices' early raw history lives on a separate box (sgt_hydroedge_archive)
// and was never re-imported into production. Deliberately so: production's
// io_records is already 46 GB / 314 M rows on a 1 vCPU host, and the archive
// holds ONLY io_records — no devices, no gps_records — so merging it would have
// grown the hot table for the benefit of one tab.
//
// Instead /api/io-logs reads whichever database actually holds the window it was
// asked for. Nothing else in the app talks to the archive.
//
// ── Entirely opt-in ─────────────────────────────────────────────────────────
// isArchiveEnabled() is false unless ALL THREE of ARCHIVE_DB_HOST,
// ARCHIVE_DEVICE_IDS and ARCHIVE_CUTOVER_UTC are set and valid. Unset, every
// caller behaves exactly as it did before this file existed.
//
// ── Config ──────────────────────────────────────────────────────────────────
//   ARCHIVE_DB_HOST/PORT/NAME/USER/PASSWORD   connection to the archive box
//   ARCHIVE_DB_SSL=true                       TLS for the hop (see note below)
//   ARCHIVE_CUTOVER_UTC                       ISO instant; strictly before it,
//                                             raw rows live in the archive
//   ARCHIVE_DEVICE_IDS                        comma-separated device UUIDs
//
// Only devices in ARCHIVE_DEVICE_IDS are ever routed. The archive contains rows
// for many devices, but only those we have actually verified get sent there —
// silently sourcing a device's logs from a database nobody checked is how you
// end up showing a gap as if it were real data.
// ============================================================================

import { Pool } from 'pg';

// Same hot-reload guard as the primary pool in db.ts.
const globalForArchive = globalThis as unknown as { archivePool: Pool | undefined };

/** Devices whose pre-cutover raw history is served from the archive. */
const ARCHIVE_DEVICE_IDS: Set<string> = new Set(
  (process.env.ARCHIVE_DEVICE_IDS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
);

/**
 * The instant raw data moved from the archive box to production. Rows strictly
 * before it come from the archive; at or after, from production.
 *
 * NOTE there is a genuine gap around the changeover where neither database has
 * rows (the ingest was down between the final archive packet and the first
 * production one). An empty result inside that window is correct, not a bug —
 * which is exactly why this returns rows rather than inventing a fallback.
 */
const CUTOVER: Date | null = (() => {
  const raw = process.env.ARCHIVE_CUTOVER_UTC;
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    console.error(`[archive] ARCHIVE_CUTOVER_UTC is not a valid date: "${raw}" — archive routing disabled`);
    return null;
  }
  return d;
})();

export function isArchiveEnabled(): boolean {
  return Boolean(process.env.ARCHIVE_DB_HOST) && ARCHIVE_DEVICE_IDS.size > 0 && CUTOVER !== null;
}

function getPool(): Pool {
  if (globalForArchive.archivePool) return globalForArchive.archivePool;

  const pool = new Pool({
    host: process.env.ARCHIVE_DB_HOST,
    port: parseInt(process.env.ARCHIVE_DB_PORT || '5432'),
    database: process.env.ARCHIVE_DB_NAME || 'sgt_hydroedge_archive',
    user: process.env.ARCHIVE_DB_USER,
    password: process.env.ARCHIVE_DB_PASSWORD,

    // Smaller than the primary pool: this serves one tab, on windows older than
    // the cutover, and must never compete with live traffic for connections.
    max: 4,
    idleTimeoutMillis: 10_000,

    // Higher than the primary's 5s — this is a cross-host hop over the public
    // internet, not a unix socket, so a cold TCP+TLS handshake is slower.
    connectionTimeoutMillis: 8_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 30_000,

    statement_timeout: 15_000,
    query_timeout: 15_000,

    // The archive is read-only for us, but a stuck transaction would still pin a
    // backend on that box.
    idle_in_transaction_session_timeout: 30_000,

    // The connection crosses the public internet, so TLS is worth having even
    // though pg_hba already restricts the source IP.
    // rejectUnauthorized:false encrypts without verifying the certificate chain,
    // which is what a self-signed Postgres cert requires. It stops passive
    // eavesdropping, NOT an active MITM — if that matters, put the archive's CA
    // in `ca` here instead.
    ssl: process.env.ARCHIVE_DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  pool.setMaxListeners(50);
  pool.on('error', (err) => {
    console.error('❌ Unexpected archive database error:', err);
  });

  // Cache in all environments, not just dev. The archive pool is created lazily
  // on first pre-cutover request, so without this a serverless-style re-import
  // would build a new pool per request against a box we do not control.
  globalForArchive.archivePool = pool;
  return pool;
}

export async function archiveQuery(text: string, params?: unknown[]) {
  if (!isArchiveEnabled()) {
    throw new Error('Archive database is not configured');
  }
  return getPool().query(text, params);
}

export type LogSources = { archive: boolean; primary: boolean };

/**
 * Which database(s) hold `[start, end)` for this device.
 *
 * A window straddling the cutover needs BOTH — returning only one side would
 * silently truncate the result at an arbitrary date with nothing in the response
 * to reveal it.
 *
 * At least one source is always true: if `start` is not before the cutover then
 * `end` (> start) is at or after it, so `primary` is set.
 */
export function planLogSources(deviceId: string, start: Date, end: Date): LogSources {
  if (!isArchiveEnabled() || !ARCHIVE_DEVICE_IDS.has(deviceId.toLowerCase())) {
    return { archive: false, primary: true };
  }
  const cutover = CUTOVER!.getTime();
  return {
    archive: start.getTime() < cutover,
    primary: end.getTime() >= cutover,
  };
}
