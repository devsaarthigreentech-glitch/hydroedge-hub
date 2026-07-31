#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// ============================================================================
// verify-daily-summary.js — prove the rollup agrees with the live query
// ----------------------------------------------------------------------------
// Hits /api/analytics twice for the same window — once normally (served from
// device_daily_summary) and once with ?live=1 (raw scan) — and diffs them.
//
// Run this after every backfill, and after any change to a formula in either
// db/migrations/001_device_daily_summary.sql or src/app/api/analytics/route.ts.
// A rollup that silently drifts from the query it replaced is worse than no
// rollup at all, because nothing looks broken.
//
// Usage:
//   node scripts/verify-daily-summary.js                      # 10 devices, 7 days
//   node scripts/verify-daily-summary.js --sample 40 --days 30
//   node scripts/verify-daily-summary.js --base http://localhost:3000
//
// Requires the Next dev/prod server to be running.
// ============================================================================

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const { Pool } = require(path.join(ROOT, "node_modules", "pg"));

// Distance/fuel are floating point sums taken two different ways; insisting on
// exact equality would produce noise. These are tight enough to catch a real
// formula divergence and loose enough to ignore rounding.
const TOL_KM = 0.05;
const TOL_L = 0.05;

function loadEnv() {
  const file = path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

function parseArgs(argv) {
  const a = { sample: 10, days: 7, base: "http://localhost:3000" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--sample") a.sample = parseInt(argv[++i], 10);
    else if (argv[i] === "--days") a.days = parseInt(argv[++i], 10);
    else if (argv[i] === "--base") a.base = argv[++i];
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  return a;
}

async function fetchAnalytics(base, deviceId, days, live) {
  const url =
    `${base}/api/analytics?device_id=${encodeURIComponent(deviceId)}` +
    `&days=${days}${live ? "&live=1" : ""}`;
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(`HTTP ${res.status}: ${body.error || "request failed"}`);
  }
  return body;
}

function near(a, b, tol) {
  return Math.abs((a ?? 0) - (b ?? 0)) <= tol;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadEnv();

  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "5432", 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 10_000,
  });

  let devices;
  try {
    // Prefer devices that actually have summary rows — comparing two empty
    // results proves nothing.
    const r = await pool.query(
      `SELECT d.id, d.device_name
         FROM devices d
         JOIN device_daily_summary s ON s.device_id = d.id
        WHERE d.deleted_at IS NULL
          AND (s.distance_km > 0 OR s.fuel_litres_level > 0 OR s.fuel_litres_can > 0)
        GROUP BY d.id, d.device_name
        ORDER BY COUNT(*) DESC
        LIMIT $1`,
      [args.sample]
    );
    devices = r.rows;
  } finally {
    await pool.end();
  }

  if (devices.length === 0) {
    console.error("No devices with summary data. Run the rollup backfill first.");
    return 1;
  }

  console.log(`Comparing ${devices.length} device(s) over ${args.days} day(s)\n`);

  let mismatches = 0;
  let compared = 0;

  for (const d of devices) {
    const label = d.device_name || d.id;
    let summary, live;
    try {
      [summary, live] = await Promise.all([
        fetchAnalytics(args.base, d.id, args.days, false),
        fetchAnalytics(args.base, d.id, args.days, true),
      ]);
    } catch (err) {
      console.log(`  ERROR  ${label}: ${err.message}`);
      mismatches++;
      continue;
    }

    if (summary.source !== "daily_summary") {
      console.log(`  SKIP   ${label}: served ${summary.source}, not the rollup`);
      continue;
    }
    compared++;

    const problems = [];
    const s = summary.summary;
    const l = live.summary;

    if (!near(s.total_distance_km, l.total_distance_km, TOL_KM)) {
      problems.push(`distance ${s.total_distance_km} vs live ${l.total_distance_km}`);
    }
    if (!near(s.total_fuel_litres, l.total_fuel_litres, TOL_L)) {
      problems.push(`fuel ${s.total_fuel_litres} vs live ${l.total_fuel_litres}`);
    }

    // Per-day diff catches errors that cancel out in the totals.
    const liveByDay = new Map(live.data.map((r) => [r.day, r]));
    for (const row of summary.data) {
      const lr = liveByDay.get(row.day);
      if (!lr) {
        problems.push(`${row.day}: in rollup, absent from live`);
        continue;
      }
      if (!near(row.distance_km, lr.distance_km, TOL_KM)) {
        problems.push(`${row.day} distance ${row.distance_km} vs ${lr.distance_km}`);
      }
      if (!near(row.fuel_litres, lr.fuel_litres, TOL_L)) {
        problems.push(`${row.day} fuel ${row.fuel_litres} vs ${lr.fuel_litres}`);
      }
      liveByDay.delete(row.day);
    }
    for (const day of liveByDay.keys()) {
      problems.push(`${day}: in live, absent from rollup (backfill gap?)`);
    }

    if (problems.length === 0) {
      console.log(`  ok     ${label}`);
    } else {
      mismatches++;
      console.log(`  DIFF   ${label}`);
      for (const p of problems.slice(0, 8)) console.log(`           ${p}`);
      if (problems.length > 8) console.log(`           ... ${problems.length - 8} more`);
    }
  }

  console.log(
    `\n${compared} compared, ${mismatches} with differences` +
      (summaryNote(compared, mismatches))
  );
  return mismatches > 0 ? 1 : 0;
}

function summaryNote(compared, mismatches) {
  if (compared === 0) return " — nothing was actually compared, check --days";
  return mismatches === 0 ? " — rollup matches the live query" : "";
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(`fatal: ${err.message}`);
    process.exit(1);
  });
