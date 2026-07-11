// ============================================================================
// DATABASE CONNECTION - PostgreSQL Client
// ----------------------------------------------------------------------------
// v2: Hardened pool with TCP keepalive + server-side timeouts.
//
// Why these settings matter:
//   - max: 10                              cap so we never starve the Python pool
//   - idleTimeoutMillis: 10s               idle pruning keeps the pool small
//   - connectionTimeoutMillis: 5s          fail fast under load instead of queuing
//   - keepAlive: true (+ initial 30s)      kernel detects dead PG backends in ~80s
//   - statement_timeout: 15s               runaway query can't permanently hold a conn
//   - query_timeout: 15s                   client-side mirror of statement_timeout
//   - idle_in_transaction_session_timeout  PG kills stuck transactions in 30s
// ============================================================================

import { Pool } from 'pg';

// Singleton: store the pool on globalThis so Next.js hot-reload reuses it
// instead of leaking a new pool on every code change.
const globalForPg = globalThis as unknown as { pgPool: Pool | undefined };

const pool =
  globalForPg.pgPool ??
  new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'sgt_hydroedge',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,

    // ----- Pool sizing -----
    // Total PG backends = (this) + Python pool max (10) + admin/migrations overhead.
    // Keep this well below PostgreSQL's max_connections (you have 100, can raise to 200).
    max: 10,

    // Close pooled connections that sit unused for 10s.
    idleTimeoutMillis: 10_000,

    // Fail fast if pool is exhausted instead of queuing forever.
    connectionTimeoutMillis: 5_000,

    // ----- TCP keepalive -----
    // Without this, the OS waits ~2 hours before noticing a dead PG backend.
    // With it, dead backends are reaped in ~80s.
    keepAlive: true,
    keepAliveInitialDelayMillis: 30_000,

    // ----- Server-side safety nets -----
    // Any query running longer than 15s is killed automatically.
    statement_timeout: 15_000,
    query_timeout: 15_000,

    // A transaction that's been idle for 30s gets killed — prevents stuck
    // transactions from holding row locks forever.
    idle_in_transaction_session_timeout: 30_000,
  });

  pool.setMaxListeners(50);

if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = pool;
}

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

// Query helper for simple statements.
export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}

// Get a dedicated client for transactions.
// Caller is responsible for client.release() in a finally block.
export async function getClient() {
  return pool.connect();
}

export default pool;