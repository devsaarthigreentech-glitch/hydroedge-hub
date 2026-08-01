#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// ============================================================================
// notification-status.js — print exactly who would receive alert emails
// ----------------------------------------------------------------------------
// Read-only. Applies the same rule the alert scan does: a person is emailed
// only when their company is subscribed, they are subscribed, their account is
// active, and they have an email address.
//
// Usage:
//   node scripts/notification-status.js            # all companies
//   node scripts/notification-status.js --off      # only unsubscribed companies
//   node scripts/notification-status.js --emails   # flat list of every recipient
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

async function main() {
  const argv = process.argv.slice(2);
  const onlyOff = argv.includes("--off");
  const flat = argv.includes("--emails");

  loadEnv();

  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "5432", 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 15_000,
  });

  try {
    const hasColumns = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE table_name = 'customers' AND column_name = 'notifications_enabled') AS c,
        COUNT(*) FILTER (WHERE table_name = 'users'     AND column_name = 'notifications_enabled') AS u
      FROM information_schema.columns
      WHERE table_name IN ('customers', 'users')
    `);
    const { c, u } = hasColumns.rows[0];
    if (Number(c) === 0 || Number(u) === 0) {
      console.error("notifications_enabled columns are missing — run:");
      console.error("  node scripts/apply-migration.js db/migrations/004_notification_subscriptions.sql");
      return 1;
    }

    const companies = await pool.query(`
      SELECT c.id, c.name, c.company_name, c.notifications_enabled,
             COUNT(d.id) FILTER (
               WHERE d.deleted_at IS NULL
                 AND d.device_type = 'FMC650'
                 AND d.asset_name IN ('DG', 'EOW')
             )::int AS devices
        FROM customers c
        LEFT JOIN devices d ON d.customer_id = c.id
       WHERE c.deleted_at IS NULL
       GROUP BY c.id
       ORDER BY c.notifications_enabled DESC, c.name
    `);

    const people = await pool.query(`
      SELECT customer_id, email, full_name, username, status, notifications_enabled
        FROM users
       WHERE deleted_at IS NULL AND customer_id IS NOT NULL
       ORDER BY full_name NULLS LAST, username
    `);

    const byCustomer = {};
    for (const p of people.rows) (byCustomer[p.customer_id] ||= []).push(p);

    const recipientOf = (row) =>
      row.notifications_enabled && row.status === "active" && !!row.email;

    if (flat) {
      const all = new Set();
      for (const co of companies.rows) {
        if (!co.notifications_enabled) continue;
        for (const p of byCustomer[co.id] || []) if (recipientOf(p)) all.add(p.email);
      }
      [...all].sort().forEach((e) => console.log(e));
      console.log(`\n${all.size} unique recipient(s)`);
      return 0;
    }

    let totalRecipients = 0;
    for (const co of companies.rows) {
      if (onlyOff && co.notifications_enabled) continue;

      const members = byCustomer[co.id] || [];
      const recipients = co.notifications_enabled ? members.filter(recipientOf) : [];
      totalRecipients += recipients.length;

      const flag = co.notifications_enabled ? "ON " : "OFF";
      const company = co.company_name && co.company_name !== co.name ? ` (${co.company_name})` : "";
      console.log(`\n[${flag}] ${co.name}${company}  — ${co.devices} alertable device(s)`);

      if (!co.notifications_enabled) {
        console.log(`        company unsubscribed — ${members.length} person/people muted`);
        continue;
      }
      if (members.length === 0) {
        console.log("        no users linked to this company — nobody to email");
        continue;
      }
      for (const p of members) {
        const who = p.full_name || p.username;
        if (recipientOf(p)) {
          console.log(`        -> ${who} <${p.email}>`);
        } else {
          const why = !p.email ? "no email" : p.status !== "active" ? `account ${p.status}` : "unsubscribed";
          console.log(`           ${who} — skipped (${why})`);
        }
      }
    }

    console.log(`\n${companies.rows.filter((c) => c.notifications_enabled).length} of ${companies.rows.length} companies subscribed · ${totalRecipients} recipient slot(s)`);
    return 0;
  } finally {
    await pool.end();
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(`fatal: ${err.message}${err.code ? ` (code=${err.code})` : ""}`);
    process.exit(1);
  });
