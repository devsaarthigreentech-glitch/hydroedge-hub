#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// ============================================================================
// db-status.js — read-only health report
// ----------------------------------------------------------------------------
// Touches nothing. Reports connection, schema gaps, table sizes, the indexes
// the analytics rollup depends on, and rollup coverage.
//
//   node scripts/db-status.js
//
// Run it before and after applying the migrations.
// ============================================================================

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const { Pool } = require(path.join(ROOT, "node_modules", "pg"));

function loadEnv() {
  const file = path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) throw new Error(".env.local not found");
  const body = fs.readFileSync(file, "utf8");
  if (body.trim() === "") throw new Error(".env.local is EMPTY — restore it first");
  for (const line of body.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  if (!process.env.DB_HOST) {
    throw new Error("DB_HOST not set — refusing to fall back to localhost silently");
  }
}

const p = (...a) => console.log(...a);
const head = (t) => p(`\n─── ${t} ${"─".repeat(Math.max(0, 60 - t.length))}`);

// Columns the application selects but which may not exist yet.
const EXPECTED_DEVICE_COLS = [
  "id", "imei", "device_name", "device_type", "manufacturer", "protocol",
  "status", "connection_status", "customer_id", "asset_name", "asset_type",
  "sim_number", "firmware_version", "tags", "notes", "tested", "name_locked",
  "created_at", "updated_at", "last_latitude", "last_longitude",
  "last_location_time", "last_contact_at", "deleted_at",
];

async function safe(pool, label, sql, params = []) {
  try {
    return await pool.query(sql, params);
  } catch (err) {
    p(`  (${label} unavailable: ${err.code || ""} ${err.message})`);
    return null;
  }
}

async function main() {
  loadEnv();

  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "5432", 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 15_000,
    statement_timeout: 120_000,
    query_timeout: 120_000,
  });

  try {
    head("CONNECTION");
    p(`  ${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`);
    const v = await pool.query("SELECT version(), current_database() AS db");
    p(`  ok — ${v.rows[0].version.split(",")[0]}`);

    head("DEVICES TABLE — missing columns");
    const cols = await pool.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema='public' AND table_name='devices'`
    );
    const have = new Set(cols.rows.map((r) => r.column_name));
    const missing = EXPECTED_DEVICE_COLS.filter((c) => !have.has(c));
    p(missing.length ? `  MISSING: ${missing.join(", ")}` : "  (none — all expected columns present)");

    head("TABLE SIZES");
    const sizes = await safe(pool, "sizes", `
      SELECT relname AS t, n_live_tup AS rows,
             pg_size_pretty(pg_total_relation_size(relid)) AS size
        FROM pg_stat_user_tables
       ORDER BY pg_total_relation_size(relid) DESC LIMIT 12`);
    if (sizes) for (const r of sizes.rows) {
      p(`  ${String(r.t).padEnd(26)} ${String(r.rows).padStart(12)} rows   ${r.size}`);
    }

    head("ANALYTICS SOURCE INDEXES");
    const idx = await safe(pool, "indexes", `
      SELECT tablename, indexname, indexdef FROM pg_indexes
       WHERE schemaname='public' AND tablename IN ('io_records','gps_records')
       ORDER BY tablename, indexname`);
    if (idx) {
      if (idx.rows.length === 0) p("  (no indexes at all on io_records / gps_records)");
      for (const r of idx.rows) p(`  [${r.tablename}] ${r.indexdef.replace(/^CREATE /, "")}`);
    }
    const wanted = ["idx_io_records_device_io_ts", "idx_gps_records_device_ts"];
    const haveIdx = new Set((idx ? idx.rows : []).map((r) => r.indexname));
    const missIdx = wanted.filter((n) => !haveIdx.has(n));
    p(missIdx.length ? `  MISSING (migration 002): ${missIdx.join(", ")}` : "  both rollup indexes present");

    const invalid = await safe(pool, "invalid index check", `
      SELECT c.relname FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid
       WHERE NOT i.indisvalid`);
    if (invalid && invalid.rows.length) {
      p(`  ⚠ INVALID indexes (failed CONCURRENTLY build — drop and retry): ${invalid.rows.map(r=>r.relname).join(", ")}`);
    }

    head("RAW DATA RANGE");
    for (const t of ["io_records", "gps_records"]) {
      const r = await safe(pool, t, `SELECT MIN(timestamp) a, MAX(timestamp) b, COUNT(*)::bigint n FROM ${t}`);
      if (r) p(`  ${t.padEnd(12)} ${r.rows[0].n} rows   ${r.rows[0].a} → ${r.rows[0].b}`);
    }

    head("ROLLUP STATUS (device_daily_summary)");
    const exists = await pool.query(
      `SELECT to_regclass('public.device_daily_summary') IS NOT NULL AS t,
              to_regproc('refresh_device_daily_summary(uuid,date)') IS NOT NULL AS f`
    );
    p(`  table exists   : ${exists.rows[0].t}`);
    p(`  function exists: ${exists.rows[0].f}`);

    if (exists.rows[0].t) {
      const s = await safe(pool, "rollup stats", `
        SELECT COUNT(*)::bigint AS rows,
               COUNT(DISTINCT device_id)::int AS devices,
               MIN(day) AS first_day, MAX(day) AS last_day,
               COUNT(*) FILTER (WHERE is_partial)::int AS partial,
               MAX(computed_at) AS newest
          FROM device_daily_summary`);
      if (s) {
        const r = s.rows[0];
        p(`  ${r.rows} rows across ${r.devices} device(s)`);
        p(`  days ${r.first_day} → ${r.last_day}, ${r.partial} partial`);
        p(`  last refreshed: ${r.newest}`);
      }
      const devTotal = await safe(pool, "device count",
        `SELECT COUNT(*)::int n FROM devices WHERE deleted_at IS NULL`);
      if (devTotal) p(`  live devices in fleet: ${devTotal.rows[0].n}`);
    } else {
      p("  → run migration 001 first");
    }
  } finally {
    await pool.end();
  }
  return 0;
}

main()
  .then((c) => process.exit(c))
  .catch((err) => {
    const bits = [err.message, err.code ? `code=${err.code}` : ""].filter(Boolean);
    console.error(`\nfatal: ${bits.join(" ")}`);
    if (Array.isArray(err.errors)) {
      for (const e of err.errors) console.error(`  ${e.code || ""} ${e.message || ""}`.trim());
    }
    process.exit(1);
  });
