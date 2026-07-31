#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// ============================================================================
// apply-migration.js — run a .sql file against the configured database
// ----------------------------------------------------------------------------
// Exists because this project has no migration tool and psql is not installed
// on the dev machine. Uses the `pg` driver already in node_modules.
//
// Usage:
//   node scripts/apply-migration.js db/migrations/001_device_daily_summary.sql
//   node scripts/apply-migration.js db/migrations/002_analytics_source_indexes.sql --no-transaction
//   node scripts/apply-migration.js <file> --dry-run
//
// Flags:
//   --no-transaction  Split the file and run each statement on its own.
//                     REQUIRED for CREATE INDEX CONCURRENTLY, which Postgres
//                     refuses to run inside a transaction block. Without this
//                     flag the whole file runs as one implicit transaction, so
//                     a failure rolls the entire migration back (what you want
//                     for 001).
//   --dry-run         Print what would run, execute nothing.
// ============================================================================

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const { Pool } = require(path.join(ROOT, "node_modules", "pg"));

function loadEnv() {
  const file = path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) throw new Error(".env.local not found");
  const body = fs.readFileSync(file, "utf8");
  if (body.trim() === "") throw new Error(".env.local is empty — restore it first");
  for (const line of body.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  if (!process.env.DB_HOST) {
    throw new Error("DB_HOST is not set — refusing to silently fall back to localhost");
  }
}

/**
 * Split SQL into statements on top-level semicolons.
 *
 * Must respect dollar-quoting ($$ ... $$), or the semicolons inside a plpgsql
 * function body would each be treated as a statement boundary and shred the
 * function. Also skips line comments and string literals.
 */
function splitStatements(sql) {
  const out = [];
  let buf = "";
  let i = 0;
  let inLineComment = false;
  let inBlockComment = false;
  let inSingle = false;
  let dollarTag = null;

  while (i < sql.length) {
    const ch = sql[i];
    const rest = sql.slice(i);

    if (inLineComment) {
      buf += ch;
      if (ch === "\n") inLineComment = false;
      i++;
      continue;
    }
    if (inBlockComment) {
      buf += ch;
      if (rest.startsWith("*/")) { buf += sql[i + 1]; i += 2; inBlockComment = false; continue; }
      i++;
      continue;
    }
    if (dollarTag) {
      if (rest.startsWith(dollarTag)) { buf += dollarTag; i += dollarTag.length; dollarTag = null; continue; }
      buf += ch; i++; continue;
    }
    if (inSingle) {
      buf += ch;
      if (ch === "'") inSingle = false;
      i++;
      continue;
    }

    if (rest.startsWith("--")) { inLineComment = true; buf += ch; i++; continue; }
    if (rest.startsWith("/*")) { inBlockComment = true; buf += ch; i++; continue; }
    if (ch === "'") { inSingle = true; buf += ch; i++; continue; }

    const dollar = /^\$[A-Za-z_]*\$/.exec(rest);
    if (dollar) { dollarTag = dollar[0]; buf += dollarTag; i += dollarTag.length; continue; }

    if (ch === ";") { out.push(buf.trim()); buf = ""; i++; continue; }

    buf += ch;
    i++;
  }
  if (buf.trim()) out.push(buf.trim());
  // Drop fragments that are only comments/whitespace.
  return out.filter((s) => s.replace(/--[^\n]*/g, "").trim().length > 0);
}

/** First meaningful line, for progress output. */
function label(stmt) {
  const line = stmt
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("--"));
  return (line || stmt).slice(0, 90);
}

async function main() {
  const argv = process.argv.slice(2);
  const file = argv.find((a) => !a.startsWith("--"));
  const noTx = argv.includes("--no-transaction");
  const dryRun = argv.includes("--dry-run");

  if (!file) {
    console.error("Usage: node scripts/apply-migration.js <file.sql> [--no-transaction] [--dry-run]");
    return 1;
  }

  const full = path.resolve(ROOT, file);
  if (!fs.existsSync(full)) throw new Error(`No such file: ${full}`);
  const sql = fs.readFileSync(full, "utf8");

  const statements = noTx ? splitStatements(sql) : [sql];

  console.log(`file   : ${path.relative(ROOT, full)}`);
  console.log(`mode   : ${noTx ? "statement-by-statement (no transaction)" : "single implicit transaction"}`);

  // Deliberately before loadEnv so a dry run works with no database configured.
  if (dryRun) {
    console.log(`\n--dry-run: ${statements.length} statement(s) would run\n`);
    statements.forEach((s, n) => console.log(`  ${n + 1}. ${label(s)}`));
    return 0;
  }

  loadEnv();
  console.log(`target : ${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`);

  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "5432", 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 15_000,
    // CREATE INDEX CONCURRENTLY on a large table can run for a long time.
    statement_timeout: 60 * 60_000,
    query_timeout: 60 * 60_000,
  });

  let failed = 0;
  try {
    console.log("");
    for (let n = 0; n < statements.length; n++) {
      const stmt = statements[n];
      const tag = `[${n + 1}/${statements.length}]`;
      const started = Date.now();
      try {
        await pool.query(stmt);
        console.log(`  ok   ${tag} ${label(stmt)}  (${((Date.now() - started) / 1000).toFixed(1)}s)`);
      } catch (err) {
        failed++;
        console.error(`  FAIL ${tag} ${label(stmt)}`);
        console.error(`       ${err.code || ""} ${err.message}`);
        if (err.position) {
          // Point at the offending character — invaluable for a long function body.
          const pos = parseInt(err.position, 10);
          const upto = stmt.slice(0, pos);
          const line = upto.split("\n").length;
          console.error(`       at statement line ${line}: ${stmt.split("\n")[line - 1]?.trim()}`);
        }
        if (err.hint) console.error(`       hint: ${err.hint}`);
        if (!noTx) break; // the whole file rolled back; nothing else will run
      }
    }
  } finally {
    await pool.end();
  }

  console.log(failed === 0 ? "\napplied cleanly" : `\n${failed} statement(s) failed`);
  return failed > 0 ? 1 : 0;
}

main()
  .then((c) => process.exit(c))
  .catch((err) => {
    console.error(`fatal: ${err.message}${err.code ? ` (code=${err.code})` : ""}`);
    process.exit(1);
  });
