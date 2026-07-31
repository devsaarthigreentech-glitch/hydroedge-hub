#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// ============================================================================
// rollup-daily-summary.js — populate device_daily_summary
// ----------------------------------------------------------------------------
// All computation happens inside Postgres (refresh_device_daily_summary).
// This script only decides WHICH device-days to refresh, and paces the work.
//
// Usage:
//   node scripts/rollup-daily-summary.js --today            # current IST day
//   node scripts/rollup-daily-summary.js --days 3           # last 3 IST days
//   node scripts/rollup-daily-summary.js --from 2026-01-01 --to 2026-07-31
//   node scripts/rollup-daily-summary.js --backfill         # last 180 days
//   node scripts/rollup-daily-summary.js --device <uuid> --days 7
//
// Flags:
//   --max-days N      backfill window, default 180. NOT derived from
//                     MIN(timestamp): the raw tables contain device-RTC values
//                     ranging from 1970 to 2185, so the true minimum is
//                     meaningless as a floor.
//   --concurrency N   parallel device-days (default 1). Raise carefully: this
//                     shares max_connections with the app and the GPS ingest.
//   --dry-run         list the work, touch nothing.
//
// Cron (server local time; adjust if the host is not on IST):
//   */15 * * * *  cd /srv/app && node scripts/rollup-daily-summary.js --today   >> /var/log/rollup.log 2>&1
//   20   0 * * *  cd /srv/app && node scripts/rollup-daily-summary.js --days 3  >> /var/log/rollup.log 2>&1
//
// The nightly --days 3 pass exists because packets arrive late: a device out of
// coverage can deliver yesterday's records today. Re-running is free (the
// function is idempotent) and repairs those days.
// ============================================================================

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const { Pool } = require(path.join(ROOT, "node_modules", "pg"));

const IST = "Asia/Kolkata";

// ── Env ─────────────────────────────────────────────────────────────────────
// Next.js loads .env.local itself; a bare node process does not.
function loadEnv() {
  const file = path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    if (process.env[m[1]] !== undefined) continue; // real env wins
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

// ── Args ────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  // Default 1: the database host is a 1 vCPU box also serving the app and the
  // GPS ingest. Parallel rollups there cause contention, not throughput.
  const args = { concurrency: 1 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${a} needs a value`);
      return v;
    };
    switch (a) {
      case "--today":       args.today = true; break;
      case "--backfill":    args.backfill = true; break;
      case "--dry-run":     args.dryRun = true; break;
      case "--days":        args.days = parseInt(next(), 10); break;
      case "--from":        args.from = next(); break;
      case "--to":          args.to = next(); break;
      case "--device":      args.device = next(); break;
      case "--max-days":    args.maxDays = parseInt(next(), 10); break;
      case "--concurrency": args.concurrency = parseInt(next(), 10); break;
      case "--help": case "-h": args.help = true; break;
      default: throw new Error(`Unknown argument: ${a}`);
    }
  }
  return args;
}

// ── IST date helpers ────────────────────────────────────────────────────────
// The rollup grain is the IST calendar day, which is NOT the host's local day.
// en-CA formatting yields YYYY-MM-DD.
function istToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: IST });
}

function addDays(isoDay, delta) {
  // Anchor at noon UTC so DST/offset arithmetic can never roll the date over.
  const d = new Date(`${isoDay}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function dayRange(from, to) {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

// ── Work planning ───────────────────────────────────────────────────────────
async function resolveDays(pool, args) {
  const today = istToday();

  if (args.from || args.to) {
    if (!args.from || !args.to) throw new Error("--from and --to must be used together");
    if (!ISO_DAY.test(args.from) || !ISO_DAY.test(args.to)) {
      throw new Error("--from/--to must be YYYY-MM-DD");
    }
    if (args.from > args.to) throw new Error("--from is after --to");
    return dayRange(args.from, args.to);
  }

  if (args.today) return [today];

  if (args.days) {
    if (!Number.isInteger(args.days) || args.days < 1) throw new Error("--days must be >= 1");
    return dayRange(addDays(today, -(args.days - 1)), today);
  }

  if (args.backfill) {
    // MIN(timestamp) CANNOT be trusted as the backfill floor. These tables carry
    // device-RTC values with no sanity clamp — gps_records starts at 1970-01-01
    // and io_records runs to 2185. Planning from the raw minimum would schedule
    // ~20,000 days x every device and never finish.
    //
    // So the floor is an explicit window (--max-days, default 180) and the raw
    // minimum only ever shortens it.
    const maxDays = args.maxDays || 180;
    const floor = addDays(today, -(maxDays - 1));

    const r = await pool.query(`
      SELECT LEAST(
               (SELECT MIN(timestamp) FROM io_records),
               (SELECT MIN(timestamp) FROM gps_records)
             ) AS oldest`);
    const oldest = r.rows[0] && r.rows[0].oldest;
    if (!oldest) throw new Error("No raw records found — nothing to backfill");

    const rawFirstDay = new Date(oldest).toLocaleDateString("en-CA", { timeZone: IST });
    const start = rawFirstDay > floor ? rawFirstDay : floor;

    if (rawFirstDay < floor) {
      console.log(
        `[rollup] oldest raw record is ${rawFirstDay}; capping backfill at ${maxDays} days ` +
        `(from ${start}). Override with --max-days N or --from/--to.`
      );
    }
    return dayRange(start, today);
  }

  throw new Error("Pick one of --today, --days N, --from/--to, or --backfill");
}

async function resolveDevices(pool, args) {
  if (args.device) {
    const r = await pool.query(
      `SELECT id, device_name FROM devices WHERE id = $1 AND deleted_at IS NULL`,
      [args.device]
    );
    if (r.rows.length === 0) throw new Error(`Device not found: ${args.device}`);
    return r.rows;
  }
  const r = await pool.query(
    `SELECT id, device_name FROM devices WHERE deleted_at IS NULL ORDER BY device_name`
  );
  return r.rows;
}

// ── Bounded-concurrency worker pool ─────────────────────────────────────────
async function runPool(tasks, concurrency, worker) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
    while (cursor < tasks.length) {
      const task = tasks[cursor++];
      await worker(task);
    }
  });
  await Promise.all(runners);
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(fs.readFileSync(__filename, "utf8").split("\n")
      .filter((l) => l.startsWith("//")).join("\n"));
    return 0;
  }

  loadEnv();

  const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    database: process.env.DB_NAME || "sgt_hydroedge",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
    max: Math.max(args.concurrency, 1) + 1,
    connectionTimeoutMillis: 10_000,
    // A single device-day over a long history can genuinely take minutes.
    // Deliberately far higher than the app pool's 15s ceiling.
    statement_timeout: 10 * 60_000,
    query_timeout: 10 * 60_000,
  });

  const started = Date.now();
  let ok = 0, failed = 0, skipped = 0;

  try {
    const [days, devices] = await Promise.all([
      resolveDays(pool, args),
      resolveDevices(pool, args),
    ]);

    const tasks = [];
    for (const d of devices) for (const day of days) tasks.push({ device: d, day });

    console.log(
      `[rollup] ${devices.length} device(s) x ${days.length} day(s) = ${tasks.length} device-days`
    );
    console.log(`[rollup] range ${days[0]} .. ${days[days.length - 1]} (IST), concurrency ${args.concurrency}`);

    if (args.dryRun) {
      console.log("[rollup] --dry-run: nothing written");
      return 0;
    }

    let done = 0;
    await runPool(tasks, args.concurrency, async ({ device, day }) => {
      try {
        const r = await pool.query(
          `SELECT refresh_device_daily_summary($1::uuid, $2::date) AS written`,
          [device.id, day]
        );
        if (r.rows[0].written) ok++; else skipped++;
      } catch (err) {
        failed++;
        // Keep going: one bad device-day must not abort a backfill.
        console.error(
          `[rollup] FAIL ${device.device_name || device.id} ${day}: ${err.message}`
        );
      }
      done++;
      // Progress every 5% (min 25 tasks apart) so cron logs stay readable.
      const step = Math.max(25, Math.ceil(tasks.length / 20));
      if (done % step === 0 || done === tasks.length) {
        const pct = Math.round((done / tasks.length) * 100);
        console.log(`[rollup] ${done}/${tasks.length} (${pct}%)`);
      }
    });

    const secs = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`[rollup] done in ${secs}s — ${ok} written, ${skipped} skipped, ${failed} failed`);
    return failed > 0 ? 1 : 0;
  } finally {
    await pool.end();
  }
}

// Connection errors (ECONNREFUSED) arrive as an AggregateError with an EMPTY
// message, so `err.message` alone logs a blank line — useless in a cron log.
function describe(err) {
  const parts = [];
  if (err.message) parts.push(err.message);
  if (err.code) parts.push(`code=${err.code}`);
  if (Array.isArray(err.errors)) {
    for (const e of err.errors) {
      if (e && (e.code || e.message)) parts.push(`[${e.code || ""} ${e.message || ""}`.trim() + "]");
    }
  }
  if (err.detail) parts.push(`detail=${err.detail}`);
  return parts.length ? parts.join(" ") : String(err);
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(`[rollup] fatal: ${describe(err)}`);
    process.exit(1);
  });
