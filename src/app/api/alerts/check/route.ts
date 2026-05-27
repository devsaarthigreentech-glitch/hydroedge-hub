// // // // // // import { NextRequest, NextResponse } from "next/server";
// // // // // // import { Pool } from "pg";
// // // // // // import { sendAlertEmail } from "@/lib/email";

// // // // // // // ============================================================================
// // // // // // // POST /api/alerts/check — Scan all GreenX devices, send email on new alerts
// // // // // // // GET  /api/alerts/check — View recent alert history
// // // // // // //
// // // // // // // Cron: */5 * * * * curl -s -X POST http://localhost:3000/api/alerts/check
// // // // // // // ============================================================================

// // // // // // const pool = new Pool({
// // // // // //   host: process.env.DB_HOST || "localhost",
// // // // // //   port: parseInt(process.env.DB_PORT || "5432"),
// // // // // //   database: process.env.DB_NAME || "sgt_hydroedge",
// // // // // //   user: process.env.DB_USER || "sgt_admin",
// // // // // //   password: process.env.DB_PASSWORD || "",
// // // // // // });

// // // // // // const DEFAULT_COOLDOWN = 30; // minutes

// // // // // // // ── Alarm logic (mirrors GreenXHealthPanel exactly) ──────────────────────────

// // // // // // interface Alarm {
// // // // // //   id: string;
// // // // // //   severity: "critical" | "warning";
// // // // // //   message: string;
// // // // // //   action: string;
// // // // // // }

// // // // // // function getIO(records: { io_id: number; io_value: number }[], ioId: number): number | null {
// // // // // //   const r = records.find((rec) => rec.io_id === ioId);
// // // // // //   return r !== undefined ? r.io_value : null;
// // // // // // }

// // // // // // function calcOutputCurrent(records: { io_id: number; io_value: number }[]): number | null {
// // // // // //   const raw = getIO(records, 9);
// // // // // //   if (raw === null) return null;
// // // // // //   return parseFloat((((raw * 0.001) / 83) * 1000).toFixed(1));
// // // // // // }

// // // // // // function computeAlarms(
// // // // // //   records: { io_id: number; io_value: number }[],
// // // // // //   model: string,
// // // // // //   setCurrent: number | null
// // // // // // ): Alarm[] {
// // // // // //   const alarms: Alarm[] = [];
// // // // // //   const din1 = getIO(records, 1);
// // // // // //   const din2 = getIO(records, 2);
// // // // // //   const din4 = getIO(records, 4);
// // // // // //   const ain1A = calcOutputCurrent(records);
// // // // // //   const ain2 = getIO(records, 10);
// // // // // //   const ain3 = getIO(records, 11);
// // // // // //   const dout1 = getIO(records, 179);
// // // // // //   const isRunning = din1 === 1 && ain1A !== null && ain1A > 2;
// // // // // //   const eowLabel = model === "EOW" ? "engine" : "DG set";

// // // // // //   if (din1 === 0 && ain1A !== null && ain1A > 2)
// // // // // //     alarms.push({ id: "abnormal_current_no_dg", severity: "critical", message: `Abnormal: current detected but ${eowLabel} is OFF`, action: "Contact Saarthi Support immediately" });

// // // // // //   if (din1 === 1) {
// // // // // //     if (dout1 === 1)
// // // // // //       alarms.push({ id: "remote_shutdown", severity: "warning", message: "System remotely shutdown — maintenance mode active", action: "Check with maintenance team before restarting" });

// // // // // //     if (ain1A !== null && ain1A < 2 && dout1 === 0)
// // // // // //       alarms.push({ id: "abnormal_no_current", severity: "critical", message: `Abnormal: ${eowLabel} is ON but no output current`, action: "Contact Saarthi Support immediately" });

// // // // // //     if (isRunning && ain2 !== null && ain2 < 2 && dout1 === 0 && din2 === 0)
// // // // // //       alarms.push({ id: "electrolyser_water_short", severity: "critical", message: "Internal electrolyser water shortage detected", action: "Contact Saarthi Support immediately" });

// // // // // //     if (model === "380KVA" || model === "625KVA" || model === "EOW") {
// // // // // //       if (ain3 !== null && ain3 > 20)
// // // // // //         alarms.push({ id: "main_tank_short", severity: "warning", message: "Main water tank level is low", action: "Fill the main water tank" });
// // // // // //       if (isRunning && ain2 !== null && ain2 < 2 && dout1 === 0 && din4 === 0)
// // // // // //         alarms.push({ id: "bubbler_water_short", severity: "critical", message: "Internal bubbler water shortage detected", action: "Contact Saarthi Support immediately" });
// // // // // //     }

// // // // // //     if (isRunning && setCurrent !== null && ain1A !== null) {
// // // // // //       const tol = setCurrent * 0.1;
// // // // // //       if (ain1A < setCurrent - tol)
// // // // // //         alarms.push({ id: "under_current", severity: "warning", message: `Running under current — ${ain1A} A (set: ${setCurrent} A)`, action: "Contact Saarthi Support (+10% tolerance)" });
// // // // // //       else if (ain1A > setCurrent + tol)
// // // // // //         alarms.push({ id: "over_current", severity: "warning", message: `Running over current — ${ain1A} A (set: ${setCurrent} A)`, action: "Contact Saarthi Support (+10% tolerance)" });
// // // // // //     }
// // // // // //   }

// // // // // //   return alarms;
// // // // // // }

// // // // // // function getDeviceModel(device: any): string {
// // // // // //   if (device.asset_type === "EOW" || device.asset_name === "EOW") return "EOW";
// // // // // //   const name = (device.device_name || "").toLowerCase();
// // // // // //   if (name.includes("1500")) return "1500KVA";
// // // // // //   if (name.includes("625")) return "625KVA";
// // // // // //   return "380KVA";
// // // // // // }

// // // // // // // ── POST: Check all devices and send alerts ──────────────────────────────────

// // // // // // export async function POST(request: NextRequest) {
// // // // // //   const client = await pool.connect();
// // // // // //   const results: any[] = [];

// // // // // //   try {
// // // // // //     // Find all GreenX-eligible devices with customer email
// // // // // //     const devicesResult = await client.query(`
// // // // // //       SELECT 
// // // // // //         d.id, d.imei, d.device_name, d.device_type, d.asset_name, d.asset_type,
// // // // // //         c.name AS customer_name,
// // // // // //         c.contact_person_email AS customer_email,
// // // // // //         c.contact_person_name AS contact_name,
// // // // // //         c.contact_person_phone AS contact_phone,
// // // // // //         das.set_current,
// // // // // //         das.alerts_enabled,
// // // // // //         COALESCE(das.cooldown_minutes, ${DEFAULT_COOLDOWN}) AS cooldown_minutes
// // // // // //       FROM devices d
// // // // // //       JOIN customers c ON c.id = d.customer_id
// // // // // //       LEFT JOIN device_alert_settings das ON das.device_id = d.id
// // // // // //       WHERE d.device_type = 'FMC650'
// // // // // //         AND (d.asset_type IN ('DG', 'EOW') OR d.asset_name IN ('DG', 'EOW'))
// // // // // //         AND d.deleted_at IS NULL
// // // // // //         AND COALESCE(das.alerts_enabled, TRUE) = TRUE
// // // // // //     `);

// // // // // //     if (devicesResult.rows.length === 0) {
// // // // // //       return NextResponse.json({
// // // // // //         success: true,
// // // // // //         message: "No GreenX devices found",
// // // // // //         checked: 0,
// // // // // //         alerts_sent: 0,
// // // // // //       });
// // // // // //     }

// // // // // //     for (const device of devicesResult.rows) {
// // // // // //       // Get latest IO records for this device
// // // // // //       const ioResult = await client.query(`
// // // // // //         SELECT DISTINCT ON (io.io_id)
// // // // // //           io.io_id,
// // // // // //           io.io_value
// // // // // //         FROM io_records io
// // // // // //         WHERE io.device_id = $1
// // // // // //         ORDER BY io.io_id, io.timestamp DESC
// // // // // //       `, [device.id]);

// // // // // //       if (ioResult.rows.length === 0) continue;

// // // // // //       const ioRecords = ioResult.rows.map((r: any) => ({
// // // // // //         io_id: r.io_id,
// // // // // //         io_value: parseFloat(r.io_value),
// // // // // //       }));

// // // // // //       // Run alarm logic
// // // // // //       const model = getDeviceModel(device);
// // // // // //       const alarms = computeAlarms(
// // // // // //         ioRecords,
// // // // // //         model,
// // // // // //         device.set_current ? parseFloat(device.set_current) : null
// // // // // //       );

// // // // // //       if (alarms.length === 0) {
// // // // // //         // No alarms — resolve any active notifications
// // // // // //         await client.query(`
// // // // // //           UPDATE notification_log
// // // // // //           SET resolved_at = NOW()
// // // // // //           WHERE device_id = $1 AND resolved_at IS NULL
// // // // // //         `, [device.id]);
// // // // // //         continue;
// // // // // //       }

// // // // // //       for (const alarm of alarms) {
// // // // // //         // Check cooldown — was this alert already sent recently?
// // // // // //         const recentCheck = await client.query(`
// // // // // //           SELECT id FROM notification_log
// // // // // //           WHERE device_id = $1
// // // // // //             AND alert_id = $2
// // // // // //             AND resolved_at IS NULL
// // // // // //             AND sent_at > NOW() - INTERVAL '1 minute' * $3
// // // // // //           LIMIT 1
// // // // // //         `, [device.id, alarm.id, device.cooldown_minutes]);

// // // // // //         if (recentCheck.rows.length > 0) continue; // Still in cooldown

// // // // // //         const systemName = model === "EOW" ? "GreenDrive" : "GreenX";
// // // // // //         const timestamp = new Date().toISOString();
// // // // // //         let emailStatus = "no_email";

// // // // // //         // Send email if customer has an email address
// // // // // //         if (device.customer_email) {
// // // // // //           const emailResult = await sendAlertEmail({
// // // // // //             to: device.customer_email,
// // // // // //             contactName: device.contact_name || device.customer_name,
// // // // // //             customerName: device.customer_name,
// // // // // //             severity: alarm.severity,
// // // // // //             systemName,
// // // // // //             message: alarm.message,
// // // // // //             action: alarm.action,
// // // // // //             deviceName: device.device_name || device.imei,
// // // // // //             deviceImei: device.imei,
// // // // // //             deviceModel: model,
// // // // // //             timestamp,
// // // // // //           });

// // // // // //           emailStatus = emailResult.success ? "sent" : `error: ${emailResult.error}`;
// // // // // //         }

// // // // // //         // Log the notification
// // // // // //         await client.query(`
// // // // // //           INSERT INTO notification_log
// // // // // //             (device_id, alert_id, severity, message, action,
// // // // // //              customer_email, customer_name, device_name, device_imei,
// // // // // //              email_status)
// // // // // //           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
// // // // // //         `, [
// // // // // //           device.id, alarm.id, alarm.severity, alarm.message, alarm.action,
// // // // // //           device.customer_email, device.customer_name,
// // // // // //           device.device_name || device.imei, device.imei,
// // // // // //           emailStatus,
// // // // // //         ]);

// // // // // //         results.push({
// // // // // //           device: device.device_name || device.imei,
// // // // // //           imei: device.imei,
// // // // // //           alert: alarm.id,
// // // // // //           severity: alarm.severity,
// // // // // //           email: device.customer_email || "none",
// // // // // //           status: emailStatus,
// // // // // //         });
// // // // // //       }
// // // // // //     }

// // // // // //     return NextResponse.json({
// // // // // //       success: true,
// // // // // //       checked: devicesResult.rows.length,
// // // // // //       alerts_sent: results.length,
// // // // // //       alerts: results,
// // // // // //     });
// // // // // //   } catch (error: any) {
// // // // // //     console.error("[ALERT CHECK ERROR]", error);
// // // // // //     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
// // // // // //   } finally {
// // // // // //     client.release();
// // // // // //   }
// // // // // // }

// // // // // // // ── GET: View alert history ──────────────────────────────────────────────────

// // // // // // export async function GET(request: NextRequest) {
// // // // // //   const client = await pool.connect();
// // // // // //   try {
// // // // // //     const { searchParams } = new URL(request.url);
// // // // // //     const limit = parseInt(searchParams.get("limit") || "50");
// // // // // //     const active = searchParams.get("active") === "true";

// // // // // //     const query = active
// // // // // //       ? `SELECT * FROM notification_log WHERE resolved_at IS NULL ORDER BY sent_at DESC LIMIT $1`
// // // // // //       : `SELECT * FROM notification_log ORDER BY sent_at DESC LIMIT $1`;

// // // // // //     const result = await client.query(query, [limit]);

// // // // // //     return NextResponse.json({
// // // // // //       success: true,
// // // // // //       data: result.rows,
// // // // // //       count: result.rows.length,
// // // // // //     });
// // // // // //   } catch (error: any) {
// // // // // //     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
// // // // // //   } finally {
// // // // // //     client.release();
// // // // // //   }
// // // // // // }

// // // // // import { NextRequest, NextResponse } from "next/server";
// // // // // import { Pool } from "pg";
// // // // // import { sendAlertEmail } from "@/lib/email";

// // // // // // ============================================================================
// // // // // // POST /api/alerts/check — Scan all GreenX devices, email all customer users
// // // // // // GET  /api/alerts/check — View recent alert history
// // // // // //
// // // // // // Cron: */5 * * * * curl -s -X POST http://localhost:3000/api/alerts/check
// // // // // // ============================================================================

// // // // // const pool = new Pool({
// // // // //   host: process.env.DB_HOST || "localhost",
// // // // //   port: parseInt(process.env.DB_PORT || "5432"),
// // // // //   database: process.env.DB_NAME || "sgt_hydroedge",
// // // // //   user: process.env.DB_USER || "sgt_admin",
// // // // //   password: process.env.DB_PASSWORD || "",
// // // // // });

// // // // // const DEFAULT_COOLDOWN = 30;

// // // // // // ── Alarm logic (mirrors GreenXHealthPanel) ──────────────────────────────────

// // // // // interface Alarm {
// // // // //   id: string;
// // // // //   severity: "critical" | "warning";
// // // // //   message: string;
// // // // //   action: string;
// // // // // }

// // // // // function getIO(records: { io_id: number; io_value: number }[], ioId: number): number | null {
// // // // //   const r = records.find((rec) => rec.io_id === ioId);
// // // // //   return r !== undefined ? r.io_value : null;
// // // // // }

// // // // // function calcOutputCurrent(records: { io_id: number; io_value: number }[]): number | null {
// // // // //   const raw = getIO(records, 9);
// // // // //   if (raw === null) return null;
// // // // //   return parseFloat((((raw * 0.001) / 83) * 1000).toFixed(1));
// // // // // }

// // // // // function computeAlarms(
// // // // //   records: { io_id: number; io_value: number }[],
// // // // //   model: string,
// // // // //   setCurrent: number | null
// // // // // ): Alarm[] {
// // // // //   const alarms: Alarm[] = [];
// // // // //   const din1 = getIO(records, 1);
// // // // //   const din2 = getIO(records, 2);
// // // // //   const din4 = getIO(records, 4);
// // // // //   const ain1A = calcOutputCurrent(records);
// // // // //   const ain2 = getIO(records, 10);
// // // // //   const ain3 = getIO(records, 11);
// // // // //   const dout1 = getIO(records, 179);
// // // // //   const isRunning = din1 === 1 && ain1A !== null && ain1A > 2;
// // // // //   const eowLabel = model === "EOW" ? "engine" : "DG set";

// // // // //   if (din1 === 0 && ain1A !== null && ain1A > 2)
// // // // //     alarms.push({ id: "abnormal_current_no_dg", severity: "critical", message: `Abnormal: current detected but ${eowLabel} is OFF`, action: "Contact Saarthi Support immediately" });

// // // // //   if (din1 === 1) {
// // // // //     if (dout1 === 1)
// // // // //       alarms.push({ id: "remote_shutdown", severity: "warning", message: "System remotely shutdown — maintenance mode active", action: "Check with maintenance team before restarting" });

// // // // //     if (ain1A !== null && ain1A < 2 && dout1 === 0)
// // // // //       alarms.push({ id: "abnormal_no_current", severity: "critical", message: `Abnormal: ${eowLabel} is ON but no output current`, action: "Contact Saarthi Support immediately" });

// // // // //     if (isRunning && ain2 !== null && ain2 < 2 && dout1 === 0 && din2 === 0)
// // // // //       alarms.push({ id: "electrolyser_water_short", severity: "critical", message: "Internal electrolyser water shortage detected", action: "Contact Saarthi Support immediately" });

// // // // //     if (model === "380KVA" || model === "625KVA" || model === "EOW") {
// // // // //       if (ain3 !== null && ain3 > 20)
// // // // //         alarms.push({ id: "main_tank_short", severity: "warning", message: "Main water tank level is low", action: "Fill the main water tank" });
// // // // //       if (isRunning && ain2 !== null && ain2 < 2 && dout1 === 0 && din4 === 0)
// // // // //         alarms.push({ id: "bubbler_water_short", severity: "critical", message: "Internal bubbler water shortage detected", action: "Contact Saarthi Support immediately" });
// // // // //     }

// // // // //     if (isRunning && setCurrent !== null && ain1A !== null) {
// // // // //       const tol = setCurrent * 0.1;
// // // // //       if (ain1A < setCurrent - tol)
// // // // //         alarms.push({ id: "under_current", severity: "warning", message: `Running under current — ${ain1A} A (set: ${setCurrent} A)`, action: "Contact Saarthi Support (+10% tolerance)" });
// // // // //       else if (ain1A > setCurrent + tol)
// // // // //         alarms.push({ id: "over_current", severity: "warning", message: `Running over current — ${ain1A} A (set: ${setCurrent} A)`, action: "Contact Saarthi Support (+10% tolerance)" });
// // // // //     }
// // // // //   }

// // // // //   return alarms;
// // // // // }

// // // // // function getDeviceModel(device: any): string {
// // // // //   if (device.asset_type === "EOW" || device.asset_name === "EOW") return "EOW";
// // // // //   const name = (device.device_name || "").toLowerCase();
// // // // //   if (name.includes("1500")) return "1500KVA";
// // // // //   if (name.includes("625")) return "625KVA";
// // // // //   return "380KVA";
// // // // // }

// // // // // // ── POST: Check all devices and send alerts ──────────────────────────────────

// // // // // export async function POST(request: NextRequest) {
// // // // //   const client = await pool.connect();
// // // // //   const results: any[] = [];

// // // // //   try {
// // // // //     // 1. Find all GreenX-eligible devices
// // // // //     const devicesResult = await client.query(`
// // // // //       SELECT 
// // // // //         d.id, d.imei, d.device_name, d.device_type, d.asset_name, d.asset_type,
// // // // //         d.customer_id,
// // // // //         c.name AS customer_name,
// // // // //         c.contact_person_name AS contact_name,
// // // // //         das.set_current,
// // // // //         das.alerts_enabled,
// // // // //         COALESCE(das.cooldown_minutes, ${DEFAULT_COOLDOWN}) AS cooldown_minutes
// // // // //       FROM devices d
// // // // //       JOIN customers c ON c.id = d.customer_id
// // // // //       LEFT JOIN device_alert_settings das ON das.device_id = d.id
// // // // //       WHERE d.device_type = 'FMC650'
// // // // //         AND (d.asset_type IN ('DG', 'EOW') OR d.asset_name IN ('DG', 'EOW'))
// // // // //         AND d.deleted_at IS NULL
// // // // //         AND COALESCE(das.alerts_enabled, TRUE) = TRUE
// // // // //     `);

// // // // //     if (devicesResult.rows.length === 0) {
// // // // //       return NextResponse.json({
// // // // //         success: true,
// // // // //         message: "No GreenX devices found",
// // // // //         checked: 0,
// // // // //         alerts_sent: 0,
// // // // //       });
// // // // //     }

// // // // //     // 2. Pre-fetch all user emails grouped by customer_id (one query, not N)
// // // // //     const customerIds = [...new Set(devicesResult.rows.map((d: any) => d.customer_id))];
// // // // //     const usersResult = await client.query(`
// // // // //       SELECT customer_id, email, full_name
// // // // //       FROM users
// // // // //       WHERE customer_id = ANY($1)
// // // // //         AND status = 'active'
// // // // //         AND deleted_at IS NULL
// // // // //         AND email IS NOT NULL
// // // // //         AND email != ''
// // // // //     `, [customerIds]);

// // // // //     // Build a lookup: customer_id → [{ email, name }]
// // // // //     const usersByCustomer: Record<string, { email: string; name: string }[]> = {};
// // // // //     for (const row of usersResult.rows) {
// // // // //       if (!usersByCustomer[row.customer_id]) {
// // // // //         usersByCustomer[row.customer_id] = [];
// // // // //       }
// // // // //       usersByCustomer[row.customer_id].push({
// // // // //         email: row.email,
// // // // //         name: row.full_name || row.email,
// // // // //       });
// // // // //     }

// // // // //     // 3. Process each device
// // // // //     for (const device of devicesResult.rows) {
// // // // //       // Get latest IO records
// // // // //       const ioResult = await client.query(`
// // // // //         SELECT DISTINCT ON (io.io_id)
// // // // //           io.io_id,
// // // // //           io.io_value
// // // // //         FROM io_records io
// // // // //         WHERE io.device_id = $1
// // // // //         ORDER BY io.io_id, io.timestamp DESC
// // // // //       `, [device.id]);

// // // // //       if (ioResult.rows.length === 0) continue;

// // // // //       const ioRecords = ioResult.rows.map((r: any) => ({
// // // // //         io_id: r.io_id,
// // // // //         io_value: parseFloat(r.io_value),
// // // // //       }));

// // // // //       // Run alarm logic
// // // // //       const model = getDeviceModel(device);
// // // // //       const alarms = computeAlarms(
// // // // //         ioRecords,
// // // // //         model,
// // // // //         device.set_current ? parseFloat(device.set_current) : null
// // // // //       );

// // // // //       if (alarms.length === 0) {
// // // // //         await client.query(`
// // // // //           UPDATE notification_log SET resolved_at = NOW()
// // // // //           WHERE device_id = $1 AND resolved_at IS NULL
// // // // //         `, [device.id]);
// // // // //         continue;
// // // // //       }

// // // // //       // Get recipient emails for this device's customer
// // // // //       const customerUsers = usersByCustomer[device.customer_id] || [];
// // // // //       const recipientEmails = customerUsers.map((u) => u.email);
// // // // //       const primaryContactName = customerUsers[0]?.name || device.contact_name || device.customer_name;

// // // // //       for (const alarm of alarms) {
// // // // //         // Check cooldown
// // // // //         const recentCheck = await client.query(`
// // // // //           SELECT id FROM notification_log
// // // // //           WHERE device_id = $1 AND alert_id = $2 AND resolved_at IS NULL
// // // // //             AND sent_at > NOW() - INTERVAL '1 minute' * $3
// // // // //           LIMIT 1
// // // // //         `, [device.id, alarm.id, device.cooldown_minutes]);

// // // // //         if (recentCheck.rows.length > 0) continue;

// // // // //         const systemName = model === "EOW" ? "GreenDrive" : "GreenX";
// // // // //         const timestamp = new Date().toISOString();
// // // // //         let emailStatus = "no_recipients";
// // // // //         let sentTo: string[] = [];
// // // // //         let ccTo: string[] = [];

// // // // //         // Send email to all customer users + CC support team
// // // // //         if (recipientEmails.length > 0) {
// // // // //           const emailResult = await sendAlertEmail({
// // // // //             to: recipientEmails,
// // // // //             // cc is auto-populated from SUPPORT_EMAILS in email.ts
// // // // //             contactName: primaryContactName,
// // // // //             customerName: device.customer_name,
// // // // //             severity: alarm.severity,
// // // // //             systemName,
// // // // //             message: alarm.message,
// // // // //             action: alarm.action,
// // // // //             deviceName: device.device_name || device.imei,
// // // // //             deviceImei: device.imei,
// // // // //             deviceModel: model,
// // // // //             timestamp,
// // // // //           });

// // // // //           emailStatus = emailResult.success ? "sent" : `error: ${emailResult.error}`;
// // // // //           sentTo = emailResult.sentTo;
// // // // //           ccTo = emailResult.ccTo;
// // // // //         } else {
// // // // //           // No users found for this customer — still send to support team only
// // // // //           const emailResult = await sendAlertEmail({
// // // // //             to: [],    // empty — support team will be in CC
// // // // //             cc: undefined, // defaults to SUPPORT_EMAILS
// // // // //             contactName: device.customer_name,
// // // // //             customerName: device.customer_name,
// // // // //             severity: alarm.severity,
// // // // //             systemName,
// // // // //             message: alarm.message,
// // // // //             action: alarm.action,
// // // // //             deviceName: device.device_name || device.imei,
// // // // //             deviceImei: device.imei,
// // // // //             deviceModel: model,
// // // // //             timestamp,
// // // // //           });

// // // // //           emailStatus = emailResult.success ? "sent_support_only" : `error: ${emailResult.error}`;
// // // // //           sentTo = emailResult.sentTo;
// // // // //           ccTo = emailResult.ccTo;
// // // // //         }

// // // // //         // Log the notification
// // // // //         await client.query(`
// // // // //           INSERT INTO notification_log
// // // // //             (device_id, alert_id, severity, message, action,
// // // // //              customer_email, customer_name, device_name, device_imei,
// // // // //              email_status)
// // // // //           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
// // // // //         `, [
// // // // //           device.id, alarm.id, alarm.severity, alarm.message, alarm.action,
// // // // //           sentTo.join(", "),
// // // // //           device.customer_name,
// // // // //           device.device_name || device.imei,
// // // // //           device.imei,
// // // // //           emailStatus,
// // // // //         ]);

// // // // //         results.push({
// // // // //           device: device.device_name || device.imei,
// // // // //           imei: device.imei,
// // // // //           alert: alarm.id,
// // // // //           severity: alarm.severity,
// // // // //           to: sentTo,
// // // // //           cc: ccTo,
// // // // //           status: emailStatus,
// // // // //         });
// // // // //       }
// // // // //     }

// // // // //     return NextResponse.json({
// // // // //       success: true,
// // // // //       checked: devicesResult.rows.length,
// // // // //       alerts_sent: results.length,
// // // // //       alerts: results,
// // // // //     });
// // // // //   } catch (error: any) {
// // // // //     console.error("[ALERT CHECK ERROR]", error);
// // // // //     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
// // // // //   } finally {
// // // // //     client.release();
// // // // //   }
// // // // // }

// // // // // // ── GET: View alert history ──────────────────────────────────────────────────

// // // // // export async function GET(request: NextRequest) {
// // // // //   const client = await pool.connect();
// // // // //   try {
// // // // //     const { searchParams } = new URL(request.url);
// // // // //     const limit = parseInt(searchParams.get("limit") || "50");
// // // // //     const active = searchParams.get("active") === "true";

// // // // //     const query = active
// // // // //       ? `SELECT * FROM notification_log WHERE resolved_at IS NULL ORDER BY sent_at DESC LIMIT $1`
// // // // //       : `SELECT * FROM notification_log ORDER BY sent_at DESC LIMIT $1`;

// // // // //     const result = await client.query(query, [limit]);

// // // // //     return NextResponse.json({
// // // // //       success: true,
// // // // //       data: result.rows,
// // // // //       count: result.rows.length,
// // // // //     });
// // // // //   } catch (error: any) {
// // // // //     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
// // // // //   } finally {
// // // // //     client.release();
// // // // //   }
// // // // // }
// // // // import { NextRequest, NextResponse } from "next/server";
// // // // import { Pool } from "pg";
// // // // import { sendAlertEmail } from "@/lib/email";

// // // // // ============================================================================
// // // // // POST /api/alerts/check — Scan all GreenX devices, email all customer users
// // // // // GET  /api/alerts/check — View recent alert history
// // // // //
// // // // // Cron: */5 * * * * curl -s -X POST http://localhost:3000/api/alerts/check
// // // // // ============================================================================

// // // // const pool = new Pool({
// // // //   host: process.env.DB_HOST || "localhost",
// // // //   port: parseInt(process.env.DB_PORT || "5432"),
// // // //   database: process.env.DB_NAME || "sgt_hydroedge",
// // // //   user: process.env.DB_USER || "sgt_admin",
// // // //   password: process.env.DB_PASSWORD || "",
// // // // });

// // // // const DEFAULT_COOLDOWN = 30;

// // // // // ── Alarm logic (mirrors GreenXHealthPanel) ──────────────────────────────────

// // // // interface Alarm {
// // // //   id: string;
// // // //   severity: "critical" | "warning";
// // // //   message: string;
// // // //   action: string;
// // // // }

// // // // function getIO(records: { io_id: number; io_value: number }[], ioId: number): number | null {
// // // //   const r = records.find((rec) => rec.io_id === ioId);
// // // //   return r !== undefined ? r.io_value : null;
// // // // }

// // // // function calcOutputCurrent(records: { io_id: number; io_value: number }[]): number | null {
// // // //   const raw = getIO(records, 9);
// // // //   if (raw === null) return null;
// // // //   return parseFloat((((raw * 0.001) / 83) * 1000).toFixed(1));
// // // // }

// // // // function computeAlarms(
// // // //   records: { io_id: number; io_value: number }[],
// // // //   model: string,
// // // //   setCurrent: number | null
// // // // ): Alarm[] {
// // // //   const alarms: Alarm[] = [];
// // // //   const din1 = getIO(records, 1);
// // // //   const din2 = getIO(records, 2);
// // // //   const din4 = getIO(records, 4);
// // // //   const ain1A = calcOutputCurrent(records);
// // // //   const ain2 = getIO(records, 10);
// // // //   const ain3 = getIO(records, 11);
// // // //   const dout1 = getIO(records, 179);
// // // //   const isRunning = din1 === 1 && ain1A !== null && ain1A > 2;
// // // //   const eowLabel = model === "EOW" ? "engine" : "DG set";

// // // //   if (din1 === 0 && ain1A !== null && ain1A > 2)
// // // //     alarms.push({ id: "abnormal_current_no_dg", severity: "critical", message: `Abnormal: current detected but ${eowLabel} is OFF`, action: "Contact Saarthi Support immediately" });

// // // //   if (din1 === 1) {
// // // //     if (dout1 === 1)
// // // //       alarms.push({ id: "remote_shutdown", severity: "warning", message: "System remotely shutdown — maintenance mode active", action: "Check with maintenance team before restarting" });

// // // //     if (ain1A !== null && ain1A < 2 && dout1 === 0)
// // // //       alarms.push({ id: "abnormal_no_current", severity: "critical", message: `Abnormal: ${eowLabel} is ON but no output current`, action: "Contact Saarthi Support immediately" });

// // // //     if (isRunning && ain2 !== null && ain2 < 2 && dout1 === 0 && din2 === 0)
// // // //       alarms.push({ id: "electrolyser_water_short", severity: "critical", message: "Internal electrolyser water shortage detected", action: "Contact Saarthi Support immediately" });

// // // //     if (model === "380KVA" || model === "625KVA" || model === "EOW") {
// // // //       if (ain3 !== null && ain3 > 20)
// // // //         alarms.push({ id: "main_tank_short", severity: "warning", message: "Main water tank level is low", action: "Fill the main water tank" });
// // // //       if (isRunning && ain2 !== null && ain2 < 2 && dout1 === 0 && din4 === 0)
// // // //         alarms.push({ id: "bubbler_water_short", severity: "critical", message: "Internal bubbler water shortage detected", action: "Contact Saarthi Support immediately" });
// // // //     }

// // // //     if (isRunning && setCurrent !== null && ain1A !== null) {
// // // //       const tol = setCurrent * 0.1;
// // // //       if (ain1A < setCurrent - tol)
// // // //         alarms.push({ id: "under_current", severity: "warning", message: `Running under current — ${ain1A} A (set: ${setCurrent} A)`, action: "Contact Saarthi Support (+10% tolerance)" });
// // // //       else if (ain1A > setCurrent + tol)
// // // //         alarms.push({ id: "over_current", severity: "warning", message: `Running over current — ${ain1A} A (set: ${setCurrent} A)`, action: "Contact Saarthi Support (+10% tolerance)" });
// // // //     }
// // // //   }

// // // //   return alarms;
// // // // }

// // // // function getDeviceModel(device: any): string {
// // // //   if (device.asset_type === "EOW" || device.asset_name === "EOW") return "EOW";
// // // //   const name = (device.device_name || "").toLowerCase();
// // // //   if (name.includes("1500")) return "1500KVA";
// // // //   if (name.includes("625")) return "625KVA";
// // // //   return "380KVA";
// // // // }

// // // // // ── POST: Check all devices and send alerts ──────────────────────────────────

// // // // export async function POST(request: NextRequest) {
// // // //   const client = await pool.connect();
// // // //   const results: any[] = [];

// // // //   // ── Test mode: ?test_to=your@email.com ──
// // // //   // Redirects ALL emails to you instead of real customers.
// // // //   // Skips cooldown so you can run it repeatedly.
// // // //   // Does NOT log to notification_log.
// // // //   const testTo = request.nextUrl.searchParams.get("test_to");
// // // //   const isTestMode = !!testTo;

// // // //   try {
// // // //     // 1. Find all GreenX-eligible devices
// // // //     const devicesResult = await client.query(`
// // // //       SELECT 
// // // //         d.id, d.imei, d.device_name, d.device_type, d.asset_name, d.asset_type,
// // // //         d.customer_id,
// // // //         c.name AS customer_name,
// // // //         c.contact_person_name AS contact_name,
// // // //         das.set_current,
// // // //         das.alerts_enabled,
// // // //         COALESCE(das.cooldown_minutes, ${DEFAULT_COOLDOWN}) AS cooldown_minutes
// // // //       FROM devices d
// // // //       JOIN customers c ON c.id = d.customer_id
// // // //       LEFT JOIN device_alert_settings das ON das.device_id = d.id
// // // //       WHERE d.device_type = 'FMC650'
// // // //         AND (d.asset_type IN ('DG', 'EOW') OR d.asset_name IN ('DG', 'EOW'))
// // // //         AND d.deleted_at IS NULL
// // // //         AND COALESCE(das.alerts_enabled, TRUE) = TRUE
// // // //     `);

// // // //     if (devicesResult.rows.length === 0) {
// // // //       return NextResponse.json({
// // // //         success: true,
// // // //         message: "No GreenX devices found",
// // // //         checked: 0,
// // // //         alerts_sent: 0,
// // // //       });
// // // //     }

// // // //     // 2. Pre-fetch all user emails grouped by customer_id (one query, not N)
// // // //     const customerIds = [...new Set(devicesResult.rows.map((d: any) => d.customer_id))];
// // // //     const usersResult = await client.query(`
// // // //       SELECT customer_id, email, full_name
// // // //       FROM users
// // // //       WHERE customer_id = ANY($1)
// // // //         AND status = 'active'
// // // //         AND deleted_at IS NULL
// // // //         AND email IS NOT NULL
// // // //         AND email != ''
// // // //     `, [customerIds]);

// // // //     // Build a lookup: customer_id → [{ email, name }]
// // // //     const usersByCustomer: Record<string, { email: string; name: string }[]> = {};
// // // //     for (const row of usersResult.rows) {
// // // //       if (!usersByCustomer[row.customer_id]) {
// // // //         usersByCustomer[row.customer_id] = [];
// // // //       }
// // // //       usersByCustomer[row.customer_id].push({
// // // //         email: row.email,
// // // //         name: row.full_name || row.email,
// // // //       });
// // // //     }

// // // //     // 3. Process each device
// // // //     for (const device of devicesResult.rows) {
// // // //       // Get latest IO records
// // // //       const ioResult = await client.query(`
// // // //         SELECT DISTINCT ON (io.io_id)
// // // //           io.io_id,
// // // //           io.io_value
// // // //         FROM io_records io
// // // //         WHERE io.device_id = $1
// // // //         ORDER BY io.io_id, io.timestamp DESC
// // // //       `, [device.id]);

// // // //       if (ioResult.rows.length === 0) continue;

// // // //       const ioRecords = ioResult.rows.map((r: any) => ({
// // // //         io_id: r.io_id,
// // // //         io_value: parseFloat(r.io_value),
// // // //       }));

// // // //       // Run alarm logic
// // // //       const model = getDeviceModel(device);
// // // //       const alarms = computeAlarms(
// // // //         ioRecords,
// // // //         model,
// // // //         device.set_current ? parseFloat(device.set_current) : null
// // // //       );

// // // //       if (alarms.length === 0) {
// // // //         if (!isTestMode) {
// // // //           await client.query(`
// // // //             UPDATE notification_log SET resolved_at = NOW()
// // // //             WHERE device_id = $1 AND resolved_at IS NULL
// // // //           `, [device.id]);
// // // //         }
// // // //         continue;
// // // //       }

// // // //       // Get recipient emails for this device's customer
// // // //       const customerUsers = usersByCustomer[device.customer_id] || [];
// // // //       const realRecipientEmails = customerUsers.map((u) => u.email);
// // // //       const primaryContactName = customerUsers[0]?.name || device.contact_name || device.customer_name;

// // // //       for (const alarm of alarms) {
// // // //         // Skip cooldown check in test mode
// // // //         if (!isTestMode) {
// // // //           const recentCheck = await client.query(`
// // // //             SELECT id FROM notification_log
// // // //             WHERE device_id = $1 AND alert_id = $2 AND resolved_at IS NULL
// // // //               AND sent_at > NOW() - INTERVAL '1 minute' * $3
// // // //             LIMIT 1
// // // //           `, [device.id, alarm.id, device.cooldown_minutes]);

// // // //           if (recentCheck.rows.length > 0) continue;
// // // //         }

// // // //         const systemName = model === "EOW" ? "GreenDrive" : "GreenX";
// // // //         const timestamp = new Date().toISOString();
// // // //         let emailStatus = "no_recipients";
// // // //         let sentTo: string[] = [];
// // // //         let ccTo: string[] = [];

// // // //         // In test mode: send to test_to only, no CC
// // // //         // In production: send to customer users + CC support
// // // //         const emailResult = await sendAlertEmail({
// // // //           to: isTestMode ? [testTo!] : realRecipientEmails,
// // // //           cc: isTestMode ? [] : undefined,  // empty CC in test mode, auto-support in prod
// // // //           contactName: primaryContactName,
// // // //           customerName: device.customer_name,
// // // //           severity: alarm.severity,
// // // //           systemName,
// // // //           message: alarm.message,
// // // //           action: alarm.action,
// // // //           deviceName: device.device_name || device.imei,
// // // //           deviceImei: device.imei,
// // // //           deviceModel: model,
// // // //           timestamp,
// // // //         });

// // // //         emailStatus = emailResult.success ? "sent" : `error: ${emailResult.error}`;
// // // //         sentTo = emailResult.sentTo;
// // // //         ccTo = emailResult.ccTo;

// // // //         // Don't log to DB in test mode
// // // //         if (!isTestMode) {
// // // //           await client.query(`
// // // //             INSERT INTO notification_log
// // // //               (device_id, alert_id, severity, message, action,
// // // //                customer_email, customer_name, device_name, device_imei,
// // // //                email_status)
// // // //             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
// // // //           `, [
// // // //             device.id, alarm.id, alarm.severity, alarm.message, alarm.action,
// // // //             realRecipientEmails.join(", "),
// // // //             device.customer_name,
// // // //             device.device_name || device.imei,
// // // //             device.imei,
// // // //             emailStatus,
// // // //           ]);
// // // //         }

// // // //         results.push({
// // // //           device: device.device_name || device.imei,
// // // //           imei: device.imei,
// // // //           customer: device.customer_name,
// // // //           alert: alarm.id,
// // // //           severity: alarm.severity,
// // // //           // In test mode, show who WOULD receive it in production
// // // //           actual_sent_to: sentTo,
// // // //           actual_cc: ccTo,
// // // //           ...(isTestMode ? {
// // // //             production_would_send_to: realRecipientEmails,
// // // //             production_would_cc: "support team (auto)",
// // // //             test_mode: true,
// // // //           } : {}),
// // // //           status: emailStatus,
// // // //         });
// // // //       }
// // // //     }

// // // //     return NextResponse.json({
// // // //       success: true,
// // // //       ...(isTestMode ? { test_mode: true, test_email: testTo } : {}),
// // // //       checked: devicesResult.rows.length,
// // // //       alerts_sent: results.length,
// // // //       alerts: results,
// // // //     });
// // // //   } catch (error: any) {
// // // //     console.error("[ALERT CHECK ERROR]", error);
// // // //     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
// // // //   } finally {
// // // //     client.release();
// // // //   }
// // // // }

// // // // // ── GET: View alert history ──────────────────────────────────────────────────

// // // // export async function GET(request: NextRequest) {
// // // //   const client = await pool.connect();
// // // //   try {
// // // //     const { searchParams } = new URL(request.url);
// // // //     const limit = parseInt(searchParams.get("limit") || "50");
// // // //     const active = searchParams.get("active") === "true";

// // // //     const query = active
// // // //       ? `SELECT * FROM notification_log WHERE resolved_at IS NULL ORDER BY sent_at DESC LIMIT $1`
// // // //       : `SELECT * FROM notification_log ORDER BY sent_at DESC LIMIT $1`;

// // // //     const result = await client.query(query, [limit]);

// // // //     return NextResponse.json({
// // // //       success: true,
// // // //       data: result.rows,
// // // //       count: result.rows.length,
// // // //     });
// // // //   } catch (error: any) {
// // // //     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
// // // //   } finally {
// // // //     client.release();
// // // //   }
// // // // }
// // // import { NextRequest, NextResponse } from "next/server";
// // // import { Pool } from "pg";
// // // import { sendAlertEmail } from "@/lib/email";

// // // // ============================================================================
// // // // POST /api/alerts/check — Scan all GreenX devices, email all customer users
// // // // GET  /api/alerts/check — View recent alert history
// // // //
// // // // Cron: */5 * * * * curl -s -X POST http://localhost:3000/api/alerts/check
// // // // ============================================================================

// // // const pool = new Pool({
// // //   host: process.env.DB_HOST || "localhost",
// // //   port: parseInt(process.env.DB_PORT || "5432"),
// // //   database: process.env.DB_NAME || "sgt_hydroedge",
// // //   user: process.env.DB_USER || "sgt_admin",
// // //   password: process.env.DB_PASSWORD || "",
// // // });

// // // const DEFAULT_COOLDOWN = 30;

// // // // ── Alarm logic (mirrors GreenXHealthPanel) ──────────────────────────────────

// // // interface Alarm {
// // //   id: string;
// // //   severity: "critical" | "warning";
// // //   message: string;
// // //   action: string;
// // // }

// // // function getIO(records: { io_id: number; io_value: number }[], ioId: number): number | null {
// // //   const r = records.find((rec) => rec.io_id === ioId);
// // //   return r !== undefined ? r.io_value : null;
// // // }

// // // function calcOutputCurrent(records: { io_id: number; io_value: number }[]): number | null {
// // //   const raw = getIO(records, 9);
// // //   if (raw === null) return null;
// // //   return parseFloat((((raw * 0.001) / 83) * 1000).toFixed(1));
// // // }

// // // function computeAlarms(
// // //   records: { io_id: number; io_value: number }[],
// // //   model: string,
// // //   setCurrent: number | null
// // // ): Alarm[] {
// // //   const alarms: Alarm[] = [];
// // //   const din1 = getIO(records, 1);
// // //   const din2 = getIO(records, 2);
// // //   const din4 = getIO(records, 4);
// // //   const ain1A = calcOutputCurrent(records);
// // //   const ain2 = getIO(records, 10);
// // //   const ain3 = getIO(records, 11);
// // //   const dout1 = getIO(records, 179);
// // //   const isRunning = din1 === 1 && ain1A !== null && ain1A > 2;
// // //   const eowLabel = model === "EOW" ? "engine" : "DG set";

// // //   if (din1 === 0 && ain1A !== null && ain1A > 2)
// // //     alarms.push({ id: "abnormal_current_no_dg", severity: "critical", message: `Abnormal: current detected but ${eowLabel} is OFF`, action: "Contact Saarthi Support immediately" });

// // //   if (din1 === 1) {
// // //     if (dout1 === 1)
// // //       alarms.push({ id: "remote_shutdown", severity: "warning", message: "System remotely shutdown — maintenance mode active", action: "Check with maintenance team before restarting" });

// // //     if (ain1A !== null && ain1A < 2 && dout1 === 0)
// // //       alarms.push({ id: "abnormal_no_current", severity: "critical", message: `Abnormal: ${eowLabel} is ON but no output current`, action: "Contact Saarthi Support immediately" });

// // //     if (isRunning && ain2 !== null && ain2 < 2 && dout1 === 0 && din2 === 0)
// // //       alarms.push({ id: "electrolyser_water_short", severity: "critical", message: "Internal electrolyser water shortage detected", action: "Contact Saarthi Support immediately" });

// // //     if (model === "380KVA" || model === "625KVA" || model === "EOW") {
// // //       if (ain3 !== null && ain3 > 20)
// // //         alarms.push({ id: "main_tank_short", severity: "warning", message: "Main water tank level is low", action: "Fill the main water tank" });
// // //       if (isRunning && ain2 !== null && ain2 < 2 && dout1 === 0 && din4 === 0)
// // //         alarms.push({ id: "bubbler_water_short", severity: "critical", message: "Internal bubbler water shortage detected", action: "Contact Saarthi Support immediately" });
// // //     }

// // //     if (isRunning && setCurrent !== null && ain1A !== null) {
// // //       const tol = setCurrent * 0.1;
// // //       if (ain1A < setCurrent - tol)
// // //         alarms.push({ id: "under_current", severity: "warning", message: `Running under current — ${ain1A} A (set: ${setCurrent} A)`, action: "Contact Saarthi Support (+10% tolerance)" });
// // //       else if (ain1A > setCurrent + tol)
// // //         alarms.push({ id: "over_current", severity: "warning", message: `Running over current — ${ain1A} A (set: ${setCurrent} A)`, action: "Contact Saarthi Support (+10% tolerance)" });
// // //     }
// // //   }

// // //   return alarms;
// // // }

// // // function getDeviceModel(device: any): string {
// // //   if (device.asset_type === "EOW" || device.asset_name === "EOW") return "EOW";
// // //   const name = (device.device_name || "").toLowerCase();
// // //   if (name.includes("1500")) return "1500KVA";
// // //   if (name.includes("625")) return "625KVA";
// // //   return "380KVA";
// // // }

// // // // ── POST: Check all devices and send alerts ──────────────────────────────────

// // // export async function POST(request: NextRequest) {
// // //   const client = await pool.connect();
// // //   const results: any[] = [];

// // //   // ── Test mode: ?test_to=your@email.com ──
// // //   // Redirects ALL emails to you instead of real customers.
// // //   // Skips cooldown so you can run it repeatedly.
// // //   // Does NOT log to notification_log.
// // //   const testTo = request.nextUrl.searchParams.get("test_to");
// // //   const filterCustomerId = request.nextUrl.searchParams.get("customer_id");
// // //   const isTestMode = !!testTo;

// // //   try {
// // //     // 1. Find GreenX-eligible devices (optionally filtered to one customer)
// // //     const queryParams: any[] = [];
// // //     let customerFilter = "";
// // //     if (filterCustomerId) {
// // //       queryParams.push(filterCustomerId);
// // //       customerFilter = `AND d.customer_id = $${queryParams.length}`;
// // //     }

// // //     const devicesResult = await client.query(`
// // //       SELECT 
// // //         d.id, d.imei, d.device_name, d.device_type, d.asset_name, d.asset_type,
// // //         d.customer_id,
// // //         c.name AS customer_name,
// // //         c.contact_person_name AS contact_name,
// // //         das.set_current,
// // //         das.alerts_enabled,
// // //         COALESCE(das.cooldown_minutes, ${DEFAULT_COOLDOWN}) AS cooldown_minutes
// // //       FROM devices d
// // //       JOIN customers c ON c.id = d.customer_id
// // //       LEFT JOIN device_alert_settings das ON das.device_id = d.id
// // //       WHERE d.device_type = 'FMC650'
// // //         AND (d.asset_type IN ('DG', 'EOW') OR d.asset_name IN ('DG', 'EOW'))
// // //         AND d.deleted_at IS NULL
// // //         AND COALESCE(das.alerts_enabled, TRUE) = TRUE
// // //         ${customerFilter}
// // //     `, queryParams);

// // //     if (devicesResult.rows.length === 0) {
// // //       return NextResponse.json({
// // //         success: true,
// // //         message: filterCustomerId
// // //           ? `No GreenX devices found for customer ${filterCustomerId}`
// // //           : "No GreenX devices found",
// // //         checked: 0,
// // //         alerts_sent: 0,
// // //       });
// // //     }

// // //     // 2. Pre-fetch all user emails grouped by customer_id (one query, not N)
// // //     const customerIds = [...new Set(devicesResult.rows.map((d: any) => d.customer_id))];
// // //     const usersResult = await client.query(`
// // //       SELECT customer_id, email, full_name
// // //       FROM users
// // //       WHERE customer_id = ANY($1)
// // //         AND status = 'active'
// // //         AND deleted_at IS NULL
// // //         AND email IS NOT NULL
// // //         AND email != ''
// // //     `, [customerIds]);

// // //     // Build a lookup: customer_id → [{ email, name }]
// // //     const usersByCustomer: Record<string, { email: string; name: string }[]> = {};
// // //     for (const row of usersResult.rows) {
// // //       if (!usersByCustomer[row.customer_id]) {
// // //         usersByCustomer[row.customer_id] = [];
// // //       }
// // //       usersByCustomer[row.customer_id].push({
// // //         email: row.email,
// // //         name: row.full_name || row.email,
// // //       });
// // //     }

// // //     // 3. Process each device
// // //     for (const device of devicesResult.rows) {
// // //       // Get latest IO records
// // //       const ioResult = await client.query(`
// // //         SELECT DISTINCT ON (io.io_id)
// // //           io.io_id,
// // //           io.io_value
// // //         FROM io_records io
// // //         WHERE io.device_id = $1
// // //         ORDER BY io.io_id, io.timestamp DESC
// // //       `, [device.id]);

// // //       if (ioResult.rows.length === 0) continue;

// // //       const ioRecords = ioResult.rows.map((r: any) => ({
// // //         io_id: r.io_id,
// // //         io_value: parseFloat(r.io_value),
// // //       }));

// // //       // Run alarm logic
// // //       const model = getDeviceModel(device);
// // //       const alarms = computeAlarms(
// // //         ioRecords,
// // //         model,
// // //         device.set_current ? parseFloat(device.set_current) : null
// // //       );

// // //       if (alarms.length === 0) {
// // //         if (!isTestMode) {
// // //           await client.query(`
// // //             UPDATE notification_log SET resolved_at = NOW()
// // //             WHERE device_id = $1 AND resolved_at IS NULL
// // //           `, [device.id]);
// // //         }
// // //         continue;
// // //       }

// // //       // Get recipient emails for this device's customer
// // //       const customerUsers = usersByCustomer[device.customer_id] || [];
// // //       const realRecipientEmails = customerUsers.map((u) => u.email);
// // //       const primaryContactName = customerUsers[0]?.name || device.contact_name || device.customer_name;

// // //       for (const alarm of alarms) {
// // //         // Skip cooldown check in test mode
// // //         if (!isTestMode) {
// // //           const recentCheck = await client.query(`
// // //             SELECT id FROM notification_log
// // //             WHERE device_id = $1 AND alert_id = $2 AND resolved_at IS NULL
// // //               AND sent_at > NOW() - INTERVAL '1 minute' * $3
// // //             LIMIT 1
// // //           `, [device.id, alarm.id, device.cooldown_minutes]);

// // //           if (recentCheck.rows.length > 0) continue;
// // //         }

// // //         const systemName = model === "EOW" ? "GreenDrive" : "GreenX";
// // //         const timestamp = new Date().toISOString();
// // //         let emailStatus = "no_recipients";
// // //         let sentTo: string[] = [];
// // //         let ccTo: string[] = [];

// // //         // In test mode: send to test_to only, no CC
// // //         // In production: send to customer users + CC support
// // //         const emailResult = await sendAlertEmail({
// // //           to: isTestMode ? [testTo!] : realRecipientEmails,
// // //           cc: isTestMode ? [] : undefined,  // empty CC in test mode, auto-support in prod
// // //           contactName: primaryContactName,
// // //           customerName: device.customer_name,
// // //           severity: alarm.severity,
// // //           systemName,
// // //           message: alarm.message,
// // //           action: alarm.action,
// // //           deviceName: device.device_name || device.imei,
// // //           deviceImei: device.imei,
// // //           deviceModel: model,
// // //           timestamp,
// // //         });

// // //         emailStatus = emailResult.success ? "sent" : `error: ${emailResult.error}`;
// // //         sentTo = emailResult.sentTo;
// // //         ccTo = emailResult.ccTo;

// // //         // Don't log to DB in test mode
// // //         if (!isTestMode) {
// // //           await client.query(`
// // //             INSERT INTO notification_log
// // //               (device_id, alert_id, severity, message, action,
// // //                customer_email, customer_name, device_name, device_imei,
// // //                email_status)
// // //             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
// // //           `, [
// // //             device.id, alarm.id, alarm.severity, alarm.message, alarm.action,
// // //             realRecipientEmails.join(", "),
// // //             device.customer_name,
// // //             device.device_name || device.imei,
// // //             device.imei,
// // //             emailStatus,
// // //           ]);
// // //         }

// // //         results.push({
// // //           device: device.device_name || device.imei,
// // //           imei: device.imei,
// // //           customer: device.customer_name,
// // //           alert: alarm.id,
// // //           severity: alarm.severity,
// // //           // In test mode, show who WOULD receive it in production
// // //           actual_sent_to: sentTo,
// // //           actual_cc: ccTo,
// // //           ...(isTestMode ? {
// // //             production_would_send_to: realRecipientEmails,
// // //             production_would_cc: "support team (auto)",
// // //             test_mode: true,
// // //           } : {}),
// // //           status: emailStatus,
// // //         });
// // //       }
// // //     }

// // //     return NextResponse.json({
// // //       success: true,
// // //       ...(isTestMode ? { test_mode: true, test_email: testTo } : {}),
// // //       ...(filterCustomerId ? { filtered_customer_id: filterCustomerId } : {}),
// // //       checked: devicesResult.rows.length,
// // //       alerts_sent: results.length,
// // //       alerts: results,
// // //     });
// // //   } catch (error: any) {
// // //     console.error("[ALERT CHECK ERROR]", error);
// // //     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
// // //   } finally {
// // //     client.release();
// // //   }
// // // }

// // // // ── GET: View alert history ──────────────────────────────────────────────────

// // // export async function GET(request: NextRequest) {
// // //   const client = await pool.connect();
// // //   try {
// // //     const { searchParams } = new URL(request.url);
// // //     const limit = parseInt(searchParams.get("limit") || "50");
// // //     const active = searchParams.get("active") === "true";

// // //     const query = active
// // //       ? `SELECT * FROM notification_log WHERE resolved_at IS NULL ORDER BY sent_at DESC LIMIT $1`
// // //       : `SELECT * FROM notification_log ORDER BY sent_at DESC LIMIT $1`;

// // //     const result = await client.query(query, [limit]);

// // //     return NextResponse.json({
// // //       success: true,
// // //       data: result.rows,
// // //       count: result.rows.length,
// // //     });
// // //   } catch (error: any) {
// // //     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
// // //   } finally {
// // //     client.release();
// // //   }
// // // }
// // import { NextRequest, NextResponse } from "next/server";
// // import { Pool } from "pg";
// // import { sendBatchAlertEmail, DeviceAlert } from "@/lib/email";

// // // ============================================================================
// // // POST /api/alerts/check — Scan devices, group alerts by customer, one email each
// // // GET  /api/alerts/check — View alert history
// // //
// // // Params:
// // //   ?test_to=you@email.com   — redirects all emails to you (test mode)
// // //   ?customer_id=uuid        — scan only one customer's devices
// // // ============================================================================

// // const pool = new Pool({
// //   host: process.env.DB_HOST || "localhost",
// //   port: parseInt(process.env.DB_PORT || "5432"),
// //   database: process.env.DB_NAME || "sgt_hydroedge",
// //   user: process.env.DB_USER || "sgt_admin",
// //   password: process.env.DB_PASSWORD || "",
// // });

// // const DEFAULT_COOLDOWN = 30;

// // // ── Alarm logic ──────────────────────────────────────────────────────────────

// // interface Alarm {
// //   id: string;
// //   severity: "critical" | "warning";
// //   message: string;
// //   action: string;
// // }

// // function getIO(records: { io_id: number; io_value: number }[], ioId: number): number | null {
// //   const r = records.find((rec) => rec.io_id === ioId);
// //   return r !== undefined ? r.io_value : null;
// // }

// // function calcOutputCurrent(records: { io_id: number; io_value: number }[]): number | null {
// //   const raw = getIO(records, 9);
// //   if (raw === null) return null;
// //   return parseFloat((((raw * 0.001) / 83) * 1000).toFixed(1));
// // }

// // function computeAlarms(
// //   records: { io_id: number; io_value: number }[],
// //   model: string,
// //   setCurrent: number | null
// // ): Alarm[] {
// //   const alarms: Alarm[] = [];
// //   const din1 = getIO(records, 1);
// //   const din2 = getIO(records, 2);
// //   const din4 = getIO(records, 4);
// //   const ain1A = calcOutputCurrent(records);
// //   const ain2 = getIO(records, 10);
// //   const ain3 = getIO(records, 11);
// //   const dout1 = getIO(records, 179);
// //   const isRunning = din1 === 1 && ain1A !== null && ain1A > 2;
// //   const eowLabel = model === "EOW" ? "engine" : "DG set";

// //   if (din1 === 0 && ain1A !== null && ain1A > 2)
// //     alarms.push({ id: "abnormal_current_no_dg", severity: "critical", message: `Abnormal: current detected but ${eowLabel} is OFF`, action: "Contact Saarthi Support immediately" });

// //   if (din1 === 1) {
// //     if (dout1 === 1)
// //       alarms.push({ id: "remote_shutdown", severity: "warning", message: "System remotely shutdown — maintenance mode active", action: "Check with maintenance team before restarting" });
// //     if (ain1A !== null && ain1A < 2 && dout1 === 0)
// //       alarms.push({ id: "abnormal_no_current", severity: "critical", message: `Abnormal: ${eowLabel} is ON but no output current`, action: "Contact Saarthi Support immediately" });
// //     if (isRunning && ain2 !== null && ain2 < 2 && dout1 === 0 && din2 === 0)
// //       alarms.push({ id: "electrolyser_water_short", severity: "critical", message: "Internal electrolyser water shortage detected", action: "Contact Saarthi Support immediately" });

// //     if (model === "380KVA" || model === "625KVA" || model === "EOW") {
// //       if (ain3 !== null && ain3 > 20)
// //         alarms.push({ id: "main_tank_short", severity: "warning", message: "Main water tank level is low", action: "Fill the main water tank" });
// //       if (isRunning && ain2 !== null && ain2 < 2 && dout1 === 0 && din4 === 0)
// //         alarms.push({ id: "bubbler_water_short", severity: "critical", message: "Internal bubbler water shortage detected", action: "Contact Saarthi Support immediately" });
// //     }

// //     if (isRunning && setCurrent !== null && ain1A !== null) {
// //       const tol = setCurrent * 0.1;
// //       if (ain1A < setCurrent - tol)
// //         alarms.push({ id: "under_current", severity: "warning", message: `Running under current — ${ain1A} A (set: ${setCurrent} A)`, action: "Contact Saarthi Support (+10% tolerance)" });
// //       else if (ain1A > setCurrent + tol)
// //         alarms.push({ id: "over_current", severity: "warning", message: `Running over current — ${ain1A} A (set: ${setCurrent} A)`, action: "Contact Saarthi Support (+10% tolerance)" });
// //     }
// //   }

// //   return alarms;
// // }

// // function getDeviceModel(device: any): string {
// //   if (device.asset_type === "EOW" || device.asset_name === "EOW") return "EOW";
// //   const name = (device.device_name || "").toLowerCase();
// //   if (name.includes("1500")) return "1500KVA";
// //   if (name.includes("625")) return "625KVA";
// //   return "380KVA";
// // }

// // // ── Collected alert for grouping ─────────────────────────────────────────────

// // interface CollectedAlert {
// //   deviceId: string;
// //   alertId: string;
// //   customerId: string;
// //   customerName: string;
// //   contactName: string;
// //   cooldownMinutes: number;
// //   alert: DeviceAlert;
// // }

// // // ── POST handler ─────────────────────────────────────────────────────────────

// // export async function POST(request: NextRequest) {
// //   const client = await pool.connect();

// //   const testTo = request.nextUrl.searchParams.get("test_to");
// //   const filterCustomerId = request.nextUrl.searchParams.get("customer_id");
// //   const isTestMode = !!testTo;

// //   try {
// //     // 1. Query devices
// //     const queryParams: any[] = [];
// //     let customerFilter = "";
// //     if (filterCustomerId) {
// //       queryParams.push(filterCustomerId);
// //       customerFilter = `AND d.customer_id = $${queryParams.length}`;
// //     }

// //     const devicesResult = await client.query(`
// //       SELECT 
// //         d.id, d.imei, d.device_name, d.device_type, d.asset_name, d.asset_type,
// //         d.customer_id,
// //         c.name AS customer_name,
// //         c.contact_person_name AS contact_name,
// //         das.set_current,
// //         das.alerts_enabled,
// //         COALESCE(das.cooldown_minutes, ${DEFAULT_COOLDOWN}) AS cooldown_minutes
// //       FROM devices d
// //       JOIN customers c ON c.id = d.customer_id
// //       LEFT JOIN device_alert_settings das ON das.device_id = d.id
// //       WHERE d.device_type = 'FMC650'
// //         AND (d.asset_type IN ('DG', 'EOW') OR d.asset_name IN ('DG', 'EOW'))
// //         AND d.deleted_at IS NULL
// //         AND COALESCE(das.alerts_enabled, TRUE) = TRUE
// //         ${customerFilter}
// //     `, queryParams);

// //     if (devicesResult.rows.length === 0) {
// //       return NextResponse.json({
// //         success: true,
// //         message: filterCustomerId
// //           ? `No GreenX devices found for customer ${filterCustomerId}`
// //           : "No GreenX devices found",
// //         checked: 0,
// //         emails_sent: 0,
// //       });
// //     }

// //     // 2. Pre-fetch user emails by customer
// //     const customerIds = [...new Set(devicesResult.rows.map((d: any) => d.customer_id))];
// //     const usersResult = await client.query(`
// //       SELECT customer_id, email, full_name
// //       FROM users
// //       WHERE customer_id = ANY($1)
// //         AND status = 'active'
// //         AND deleted_at IS NULL
// //         AND email IS NOT NULL AND email != ''
// //     `, [customerIds]);

// //     const usersByCustomer: Record<string, { email: string; name: string }[]> = {};
// //     for (const row of usersResult.rows) {
// //       if (!usersByCustomer[row.customer_id]) usersByCustomer[row.customer_id] = [];
// //       usersByCustomer[row.customer_id].push({ email: row.email, name: row.full_name || row.email });
// //     }

// //     // 3. Scan all devices, collect alerts (don't send yet)
// //     const collectedAlerts: CollectedAlert[] = [];
// //     const devicesWithNoAlerts: string[] = [];

// //     for (const device of devicesResult.rows) {
// //       const ioResult = await client.query(`
// //         SELECT DISTINCT ON (io.io_id) io.io_id, io.io_value
// //         FROM io_records io
// //         WHERE io.device_id = $1
// //         ORDER BY io.io_id, io.timestamp DESC
// //       `, [device.id]);

// //       if (ioResult.rows.length === 0) continue;

// //       const ioRecords = ioResult.rows.map((r: any) => ({
// //         io_id: r.io_id,
// //         io_value: parseFloat(r.io_value),
// //       }));

// //       const model = getDeviceModel(device);
// //       const alarms = computeAlarms(
// //         ioRecords, model,
// //         device.set_current ? parseFloat(device.set_current) : null
// //       );

// //       if (alarms.length === 0) {
// //         devicesWithNoAlerts.push(device.id);
// //         continue;
// //       }

// //       for (const alarm of alarms) {
// //         // Check cooldown (skip in test mode)
// //         if (!isTestMode) {
// //           const recentCheck = await client.query(`
// //             SELECT id FROM notification_log
// //             WHERE device_id = $1 AND alert_id = $2 AND resolved_at IS NULL
// //               AND sent_at > NOW() - INTERVAL '1 minute' * $3
// //             LIMIT 1
// //           `, [device.id, alarm.id, device.cooldown_minutes]);

// //           if (recentCheck.rows.length > 0) continue;
// //         }

// //         collectedAlerts.push({
// //           deviceId: device.id,
// //           alertId: alarm.id,
// //           customerId: device.customer_id,
// //           customerName: device.customer_name,
// //           contactName: device.contact_name || device.customer_name,
// //           cooldownMinutes: device.cooldown_minutes,
// //           alert: {
// //             deviceName: device.device_name || device.imei,
// //             deviceImei: device.imei,
// //             deviceModel: model,
// //             severity: alarm.severity,
// //             message: alarm.message,
// //             action: alarm.action,
// //           },
// //         });
// //       }
// //     }

// //     // Resolve alerts for devices with no active alarms
// //     if (!isTestMode && devicesWithNoAlerts.length > 0) {
// //       await client.query(`
// //         UPDATE notification_log SET resolved_at = NOW()
// //         WHERE device_id = ANY($1) AND resolved_at IS NULL
// //       `, [devicesWithNoAlerts]);
// //     }

// //     // 4. Group collected alerts by customer
// //     const byCustomer: Record<string, {
// //       customerName: string;
// //       contactName: string;
// //       alerts: CollectedAlert[];
// //     }> = {};

// //     for (const ca of collectedAlerts) {
// //       if (!byCustomer[ca.customerId]) {
// //         byCustomer[ca.customerId] = {
// //           customerName: ca.customerName,
// //           contactName: ca.contactName,
// //           alerts: [],
// //         };
// //       }
// //       byCustomer[ca.customerId].alerts.push(ca);
// //     }

// //     // 5. Send one email per customer
// //     const emailResults: any[] = [];
// //     const timestamp = new Date().toISOString();

// //     for (const [customerId, group] of Object.entries(byCustomer)) {
// //       const customerUsers = usersByCustomer[customerId] || [];
// //       const realRecipientEmails = customerUsers.map((u) => u.email);
// //       const primaryContactName = customerUsers[0]?.name || group.contactName;

// //       const deviceAlerts: DeviceAlert[] = group.alerts.map((ca) => ca.alert);

// //       // Send email
// //       const emailResult = await sendBatchAlertEmail({
// //         to: isTestMode ? [testTo!] : realRecipientEmails,
// //         cc: isTestMode ? [] : undefined,
// //         contactName: primaryContactName,
// //         customerName: group.customerName,
// //         alerts: deviceAlerts,
// //         timestamp,
// //       });

// //       const emailStatus = emailResult.success ? "sent" : `error: ${emailResult.error}`;

// //       // Log each alert to DB (not in test mode)
// //       if (!isTestMode) {
// //         for (const ca of group.alerts) {
// //           await client.query(`
// //             INSERT INTO notification_log
// //               (device_id, alert_id, severity, message, action,
// //                customer_email, customer_name, device_name, device_imei,
// //                email_status)
// //             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
// //           `, [
// //             ca.deviceId, ca.alertId, ca.alert.severity, ca.alert.message, ca.alert.action,
// //             realRecipientEmails.join(", "), group.customerName,
// //             ca.alert.deviceName, ca.alert.deviceImei, emailStatus,
// //           ]);
// //         }
// //       }

// //       emailResults.push({
// //         customer: group.customerName,
// //         customer_id: customerId,
// //         alerts_count: deviceAlerts.length,
// //         devices_affected: new Set(deviceAlerts.map((a) => a.deviceImei)).size,
// //         actual_sent_to: emailResult.sentTo,
// //         actual_cc: emailResult.ccTo,
// //         ...(isTestMode ? {
// //           production_would_send_to: realRecipientEmails,
// //           production_would_cc: "support team (auto)",
// //           test_mode: true,
// //         } : {}),
// //         status: emailStatus,
// //         alerts: deviceAlerts.map((a) => ({
// //           device: a.deviceName,
// //           severity: a.severity,
// //           message: a.message,
// //         })),
// //       });
// //     }

// //     return NextResponse.json({
// //       success: true,
// //       ...(isTestMode ? { test_mode: true, test_email: testTo } : {}),
// //       ...(filterCustomerId ? { filtered_customer_id: filterCustomerId } : {}),
// //       checked: devicesResult.rows.length,
// //       total_alerts: collectedAlerts.length,
// //       emails_sent: emailResults.length,
// //       emails: emailResults,
// //     });
// //   } catch (error: any) {
// //     console.error("[ALERT CHECK ERROR]", error);
// //     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
// //   } finally {
// //     client.release();
// //   }
// // }

// // // ── GET: View alert history ──────────────────────────────────────────────────

// // export async function GET(request: NextRequest) {
// //   const client = await pool.connect();
// //   try {
// //     const { searchParams } = new URL(request.url);
// //     const limit = parseInt(searchParams.get("limit") || "50");
// //     const active = searchParams.get("active") === "true";

// //     const query = active
// //       ? `SELECT * FROM notification_log WHERE resolved_at IS NULL ORDER BY sent_at DESC LIMIT $1`
// //       : `SELECT * FROM notification_log ORDER BY sent_at DESC LIMIT $1`;

// //     const result = await client.query(query, [limit]);

// //     return NextResponse.json({
// //       success: true,
// //       data: result.rows,
// //       count: result.rows.length,
// //     });
// //   } catch (error: any) {
// //     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
// //   } finally {
// //     client.release();
// //   }
// // }
// import { NextRequest, NextResponse } from "next/server";
// import { Pool } from "pg";
// import { sendBatchAlertEmail, DeviceAlert } from "@/lib/email";

// // ============================================================================
// // POST /api/alerts/check — Scan devices, group alerts by customer, one email each
// // GET  /api/alerts/check — View alert history
// //
// // Params:
// //   ?test_to=you@email.com   — redirects all emails to you (test mode)
// //   ?customer_id=uuid        — scan only one customer's devices
// //
// // Cron: */5 * * * * curl -s -X POST http://localhost:3000/api/alerts/check
// // ============================================================================

// const pool = new Pool({
//   host: process.env.DB_HOST || "localhost",
//   port: parseInt(process.env.DB_PORT || "5432"),
//   database: process.env.DB_NAME || "sgt_hydroedge",
//   user: process.env.DB_USER || "sgt_admin",
//   password: process.env.DB_PASSWORD || "",
// });

// const DEFAULT_COOLDOWN = 30;
// const HOUR_MS = 60 * 60 * 1000;

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface IoRecord { io_id: number; io_value: number; }

// interface Alarm {
//   id: string;
//   severity: "critical" | "warning";
//   message: string;
//   action: string;
// }

// interface CollectedAlert {
//   deviceId: string;
//   alertId: string;
//   customerId: string;
//   customerName: string;
//   contactName: string;
//   cooldownMinutes: number;
//   alert: DeviceAlert;
// }

// // ─── IO helpers ───────────────────────────────────────────────────────────────

// function getIO(records: IoRecord[], ioId: number): number | null {
//   const r = records.find((rec) => rec.io_id === ioId);
//   return r !== undefined ? r.io_value : null;
// }

// // FMC650: Ain.1 = (raw_mV * 0.001 / 47) * 1000
// // io_value from DB is already the raw integer (mV)
// function calcOutputCurrentFMC650(records: IoRecord[]): number | null {
//   const raw = getIO(records, 9); // IO 9 = ain.1 on FMC650
//   if (raw === null) return null;
//   const volts = raw * 0.001;
//   return parseFloat(((volts / 47) * 1000).toFixed(1));
// }

// // ─── Device model detection ───────────────────────────────────────────────────

// function getDeviceModel(device: any): string {
//   // asset_name stores "Engine on Wheels" or "DG" — check asset_name first
//   const assetName = (device.asset_name || "").trim();
//   if (assetName === "Engine on Wheels") return "EOW";

//   // Fall back to device_name for KVA model detection
//   const name = (device.device_name || "").toLowerCase();
//   if (name.includes("1500")) return "1500KVA";
//   if (name.includes("625"))  return "625KVA";
//   return "380KVA";
// }

// // ─── Sustained water short tracking (server-side, DB-backed) ─────────────────
// // Since this runs as a cron job with no in-memory state, we track the
// // "first seen short" timestamp in the DB via device_water_short_log table.
// // If the table doesn't exist yet, water alarms fall back to firing immediately.

// async function getWaterShortSince(
//   client: any,
//   deviceId: string,
//   signal: "cell" | "bubbler" | "tank"
// ): Promise<number | null> {
//   try {
//     const result = await client.query(`
//       SELECT first_seen_at FROM device_water_short_log
//       WHERE device_id = $1 AND signal = $2 AND cleared_at IS NULL
//       LIMIT 1
//     `, [deviceId, signal]);
//     if (result.rows.length === 0) return null;
//     return new Date(result.rows[0].first_seen_at).getTime();
//   } catch {
//     return null; // table may not exist yet
//   }
// }

// async function setWaterShortStart(
//   client: any,
//   deviceId: string,
//   signal: "cell" | "bubbler" | "tank"
// ): Promise<void> {
//   try {
//     await client.query(`
//       INSERT INTO device_water_short_log (device_id, signal, first_seen_at)
//       VALUES ($1, $2, NOW())
//       ON CONFLICT (device_id, signal) WHERE cleared_at IS NULL DO NOTHING
//     `, [deviceId, signal]);
//   } catch { /* table may not exist */ }
// }

// async function clearWaterShort(
//   client: any,
//   deviceId: string,
//   signal: "cell" | "bubbler" | "tank"
// ): Promise<void> {
//   try {
//     await client.query(`
//       UPDATE device_water_short_log
//       SET cleared_at = NOW()
//       WHERE device_id = $1 AND signal = $2 AND cleared_at IS NULL
//     `, [deviceId, signal]);
//   } catch { /* table may not exist */ }
// }

// function sustained(sinceMs: number | null): boolean {
//   if (sinceMs === null) return false;
//   return Date.now() - sinceMs >= HOUR_MS;
// }

// // ─── Alarm logic (matches GreenXHealthPanel exactly) ─────────────────────────
// // Spec v3 (FMC650):
// //   Din.1: 1=genset ON, 0=OFF
// //   Din.2: 0=cell water short, 1=full
// //   Din.4: 0=bubbler short, 1=full
// //   Ain.3: <20=tank full, >20=short
// //   Ain.1: (raw/47)*1000 → Amps

// async function computeAlarmsFMC650(
//   client: any,
//   records: IoRecord[],
//   model: string,
//   deviceId: string,
//   setCurrent: number | null
// ): Promise<Alarm[]> {
//   const alarms: Alarm[] = [];

//   const din1  = getIO(records, 1);
//   const din2  = getIO(records, 2);   // 0=cell short, 1=full
//   const din4  = getIO(records, 4);   // 0=bubbler short, 1=full
//   const ain1A = calcOutputCurrentFMC650(records);
//   const ain3  = getIO(records, 11);  // main tank
//   const dout1 = getIO(records, 179);

//   const isRunning   = din1 === 1 && ain1A !== null && ain1A > 2;
//   const isEOW       = model === "EOW";
//   const label       = isEOW ? "engine" : "DG set";
//   const hasMainTank = model === "380KVA" || model === "625KVA" || model === "EOW";

//   // ── Update water short timers ─────────────────────────────────────────────

//   // Cell short: din2 === 0 when running
//   if (isRunning && din2 === 0) {
//     await setWaterShortStart(client, deviceId, "cell");
//   } else {
//     await clearWaterShort(client, deviceId, "cell");
//   }

//   // Bubbler short: din4 === 0 when running, only for models with main tank
//   if (isRunning && hasMainTank && din4 === 0) {
//     await setWaterShortStart(client, deviceId, "bubbler");
//   } else {
//     await clearWaterShort(client, deviceId, "bubbler");
//   }

//   // Tank short: ain3 > 20 when running, only for models with main tank
//   if (isRunning && hasMainTank && ain3 !== null && ain3 > 20) {
//     await setWaterShortStart(client, deviceId, "tank");
//   } else {
//     await clearWaterShort(client, deviceId, "tank");
//   }

//   // ── Always check ──────────────────────────────────────────────────────────

//   if (din1 === 0 && ain1A !== null && ain1A > 2)
//     alarms.push({
//       id: "abnormal_current_off", severity: "critical",
//       message: `Abnormal: current detected but ${label} is OFF`,
//       action: "Contact Saarthi Support immediately",
//     });

//   // ── Only when din1 = ON ───────────────────────────────────────────────────

//   if (din1 === 1) {

//     // Remote shutdown
//     if (dout1 === 1)
//       alarms.push({
//         id: "remote_shutdown", severity: "warning",
//         message: "System remotely shutdown — maintenance mode active",
//         action: "Check with maintenance team before restarting",
//       });

//     // ain1 < 2 & ain3 < 20 → abnormal, no output current
//     if (ain1A !== null && ain1A < 2 && ain3 !== null && ain3 < 20 && dout1 === 0)
//       alarms.push({
//         id: "abnormal_no_current", severity: "critical",
//         message: `Abnormal: ${label} is ON but no output current`,
//         action: "Contact Saarthi Support immediately",
//       });

//     // ain1 < 2 & ain3 > 20 → system stopped due to empty tank
//     if (hasMainTank && ain1A !== null && ain1A < 2 && ain3 !== null && ain3 > 20 && dout1 === 0)
//       alarms.push({
//         id: "system_off_water_tank", severity: "critical",
//         message: `System stopped — main water tank is empty`,
//         action: "Fill the main water tank immediately",
//       });

//     // Catch-all: din1=ON & ain1 < 2 & dout1=OFF (not covered by above)
//     if (ain1A !== null && ain1A < 2 && dout1 === 0
//         && !(ain1A < 2 && ain3 !== null && ain3 < 20)
//         && !(hasMainTank && ain1A < 2 && ain3 !== null && ain3 > 20))
//       alarms.push({
//         id: "abnormal_low_current", severity: "critical",
//         message: `Abnormal: ${label} is ON but output current very low (${ain1A} A)`,
//         action: "Contact Saarthi Support immediately",
//       });

//     // ── Water alarms — 1-hour sustained required ──────────────────────────

//     // Cell body short: din2 === 0, only when running, sustained 1hr
//     if (isRunning && din2 === 0) {
//       const since = await getWaterShortSince(client, deviceId, "cell");
//       if (sustained(since))
//         alarms.push({
//           id: "electrolyser_water_short", severity: "critical",
//           message: "Internal electrolyser water shortage (sustained 1+ hour)",
//           action: "Contact Saarthi Support immediately",
//         });
//     }

//     // Bubbler short: din4 === 0, only when running, 380/625/EOW, sustained 1hr
//     if (isRunning && hasMainTank && din4 === 0) {
//       const since = await getWaterShortSince(client, deviceId, "bubbler");
//       if (sustained(since))
//         alarms.push({
//           id: "bubbler_water_short", severity: "critical",
//           message: "Internal bubbler water shortage (sustained 1+ hour)",
//           action: "Contact Saarthi Support immediately",
//         });
//     }

//     // Main tank low: ain3 > 20 & isRunning, 380/625/EOW, sustained 1hr
//     if (isRunning && hasMainTank && ain3 !== null && ain3 > 20) {
//       const since = await getWaterShortSince(client, deviceId, "tank");
//       if (sustained(since))
//         alarms.push({
//           id: "main_tank_short", severity: "warning",
//           message: "Main water tank level is low (sustained 1+ hour)",
//           action: "Fill the main water tank",
//         });
//     }

//     // ── Over/under current ────────────────────────────────────────────────

//     if (isRunning && setCurrent !== null && ain1A !== null) {
//       const tol = setCurrent * 0.1;
//       if (ain1A < setCurrent - tol)
//         alarms.push({
//           id: "under_current", severity: "warning",
//           message: `Running under current — ${ain1A} A (set: ${setCurrent} A)`,
//           action: "Contact Saarthi Support (±10% tolerance)",
//         });
//       else if (ain1A > setCurrent + tol)
//         alarms.push({
//           id: "over_current", severity: "warning",
//           message: `Running over current — ${ain1A} A (set: ${setCurrent} A)`,
//           action: "Contact Saarthi Support (±10% tolerance)",
//         });
//     }
//   }

//   return alarms;
// }

// // ─── POST handler ─────────────────────────────────────────────────────────────

// export async function POST(request: NextRequest) {
//   const client = await pool.connect();

//   const testTo           = request.nextUrl.searchParams.get("test_to");
//   const filterCustomerId = request.nextUrl.searchParams.get("customer_id");
//   const isTestMode       = !!testTo;

//   try {
//     // 1. Query devices
//     const queryParams: any[] = [];
//     let customerFilter = "";
//     if (filterCustomerId) {
//       queryParams.push(filterCustomerId);
//       customerFilter = `AND d.customer_id = $${queryParams.length}`;
//     }

//     const devicesResult = await client.query(`
//       SELECT 
//         d.id, d.imei, d.device_name, d.device_type, d.asset_name, d.asset_type,
//         d.customer_id,
//         c.name AS customer_name,
//         c.contact_person_name AS contact_name,
//         das.set_current,
//         das.alerts_enabled,
//         COALESCE(das.cooldown_minutes, ${DEFAULT_COOLDOWN}) AS cooldown_minutes
//       FROM devices d
//       JOIN customers c ON c.id = d.customer_id
//       LEFT JOIN device_alert_settings das ON das.device_id = d.id
//       WHERE d.device_type = 'FMC650'
//         AND d.asset_name IN ('DG', 'Engine on Wheels')
//         AND d.deleted_at IS NULL
//         AND COALESCE(das.alerts_enabled, TRUE) = TRUE
//         ${customerFilter}
//     `, queryParams);

//     if (devicesResult.rows.length === 0) {
//       return NextResponse.json({
//         success: true,
//         message: filterCustomerId
//           ? `No GreenX devices found for customer ${filterCustomerId}`
//           : "No GreenX devices found",
//         checked: 0,
//         emails_sent: 0,
//       });
//     }

//     // 2. Pre-fetch user emails by customer
//     const customerIds = [...new Set(devicesResult.rows.map((d: any) => d.customer_id))];
//     const usersResult = await client.query(`
//       SELECT customer_id, email, full_name
//       FROM users
//       WHERE customer_id = ANY($1)
//         AND status = 'active'
//         AND deleted_at IS NULL
//         AND email IS NOT NULL AND email != ''
//     `, [customerIds]);

//     const usersByCustomer: Record<string, { email: string; name: string }[]> = {};
//     for (const row of usersResult.rows) {
//       if (!usersByCustomer[row.customer_id]) usersByCustomer[row.customer_id] = [];
//       usersByCustomer[row.customer_id].push({ email: row.email, name: row.full_name || row.email });
//     }

//     // 3. Scan devices, collect alerts
//     const collectedAlerts: CollectedAlert[] = [];
//     const devicesWithNoAlerts: string[] = [];

//     for (const device of devicesResult.rows) {
//       const ioResult = await client.query(`
//         SELECT DISTINCT ON (io.io_id) io.io_id, io.io_value
//         FROM io_records io
//         WHERE io.device_id = $1
//         ORDER BY io.io_id, io.timestamp DESC
//       `, [device.id]);

//       if (ioResult.rows.length === 0) continue;

//       const ioRecords: IoRecord[] = ioResult.rows.map((r: any) => ({
//         io_id: r.io_id,
//         io_value: parseFloat(r.io_value),
//       }));

//       const model  = getDeviceModel(device);
//       const alarms = await computeAlarmsFMC650(
//         client, ioRecords, model, device.id,
//         device.set_current ? parseFloat(device.set_current) : null
//       );

//       if (alarms.length === 0) {
//         devicesWithNoAlerts.push(device.id);
//         continue;
//       }

//       for (const alarm of alarms) {
//         // Cooldown check (skip in test mode)
//         if (!isTestMode) {
//           const recentCheck = await client.query(`
//             SELECT id FROM notification_log
//             WHERE device_id = $1 AND alert_id = $2 AND resolved_at IS NULL
//               AND sent_at > NOW() - INTERVAL '1 minute' * $3
//             LIMIT 1
//           `, [device.id, alarm.id, device.cooldown_minutes]);

//           if (recentCheck.rows.length > 0) continue;
//         }

//         collectedAlerts.push({
//           deviceId:        device.id,
//           alertId:         alarm.id,
//           customerId:      device.customer_id,
//           customerName:    device.customer_name,
//           contactName:     device.contact_name || device.customer_name,
//           cooldownMinutes: device.cooldown_minutes,
//           alert: {
//             deviceName:  device.device_name || device.imei,
//             deviceImei:  device.imei,
//             deviceModel: model,
//             severity:    alarm.severity,
//             message:     alarm.message,
//             action:      alarm.action,
//           },
//         });
//       }
//     }

//     // Resolve no-alarm devices
//     if (!isTestMode && devicesWithNoAlerts.length > 0) {
//       await client.query(`
//         UPDATE notification_log SET resolved_at = NOW()
//         WHERE device_id = ANY($1) AND resolved_at IS NULL
//       `, [devicesWithNoAlerts]);
//     }

//     // 4. Group by customer, send one email each
//     const byCustomer: Record<string, {
//       customerName: string;
//       contactName:  string;
//       alerts:       CollectedAlert[];
//     }> = {};

//     for (const ca of collectedAlerts) {
//       if (!byCustomer[ca.customerId]) {
//         byCustomer[ca.customerId] = {
//           customerName: ca.customerName,
//           contactName:  ca.contactName,
//           alerts: [],
//         };
//       }
//       byCustomer[ca.customerId].alerts.push(ca);
//     }

//     const emailResults: any[] = [];
//     const timestamp = new Date().toISOString();

//     for (const [customerId, group] of Object.entries(byCustomer)) {
//       const customerUsers      = usersByCustomer[customerId] || [];
//       const realRecipientEmails = customerUsers.map((u) => u.email);
//       const primaryContactName = customerUsers[0]?.name || group.contactName;
//       const deviceAlerts: DeviceAlert[] = group.alerts.map((ca) => ca.alert);

//       const emailResult = await sendBatchAlertEmail({
//         to:          isTestMode ? [testTo!] : realRecipientEmails,
//         cc:          isTestMode ? [] : undefined,
//         contactName: primaryContactName,
//         customerName: group.customerName,
//         alerts:      deviceAlerts,
//         timestamp,
//       });

//       const emailStatus = emailResult.success ? "sent" : `error: ${emailResult.error}`;

//       if (!isTestMode) {
//         for (const ca of group.alerts) {
//           await client.query(`
//             INSERT INTO notification_log
//               (device_id, alert_id, severity, message, action,
//                customer_email, customer_name, device_name, device_imei,
//                email_status)
//             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
//           `, [
//             ca.deviceId, ca.alertId, ca.alert.severity,
//             ca.alert.message, ca.alert.action,
//             realRecipientEmails.join(", "), group.customerName,
//             ca.alert.deviceName, ca.alert.deviceImei, emailStatus,
//           ]);
//         }
//       }

//       emailResults.push({
//         customer:         group.customerName,
//         customer_id:      customerId,
//         alerts_count:     deviceAlerts.length,
//         devices_affected: new Set(deviceAlerts.map((a) => a.deviceImei)).size,
//         actual_sent_to:   emailResult.sentTo,
//         actual_cc:        emailResult.ccTo,
//         ...(isTestMode ? {
//           production_would_send_to: realRecipientEmails,
//           production_would_cc:      "support team (auto)",
//           test_mode: true,
//         } : {}),
//         status: emailStatus,
//         alerts: deviceAlerts.map((a) => ({
//           device:   a.deviceName,
//           severity: a.severity,
//           message:  a.message,
//         })),
//       });
//     }

//     return NextResponse.json({
//       success: true,
//       ...(isTestMode       ? { test_mode: true, test_email: testTo } : {}),
//       ...(filterCustomerId ? { filtered_customer_id: filterCustomerId } : {}),
//       checked:      devicesResult.rows.length,
//       total_alerts: collectedAlerts.length,
//       emails_sent:  emailResults.length,
//       emails:       emailResults,
//     });
//   } catch (error: any) {
//     console.error("[ALERT CHECK ERROR]", error);
//     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
//   } finally {
//     client.release();
//   }
// }

// // ─── GET: Alert history ───────────────────────────────────────────────────────

// export async function GET(request: NextRequest) {
//   const client = await pool.connect();
//   try {
//     const { searchParams } = new URL(request.url);
//     const limit  = parseInt(searchParams.get("limit") || "50");
//     const active = searchParams.get("active") === "true";

//     const query = active
//       ? `SELECT * FROM notification_log WHERE resolved_at IS NULL ORDER BY sent_at DESC LIMIT $1`
//       : `SELECT * FROM notification_log ORDER BY sent_at DESC LIMIT $1`;

//     const result = await client.query(query, [limit]);

//     return NextResponse.json({ success: true, data: result.rows, count: result.rows.length });
//   } catch (error: any) {
//     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
//   } finally {
//     client.release();
//   }
// }
import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { sendBatchAlertEmail, DeviceAlert } from "@/lib/email";

// ============================================================================
// POST /api/alerts/check — Scan GreenX devices, send grouped alerts by customer
// GET  /api/alerts/check — View alert history
//
// Recency rules:
//   - Data older than 7 days  → skip operational alarms, send "no data" alert instead
//   - Data older than 3 days  → still run alarms but flag as stale in logs
//   - No IO records at all    → send "no data" alert
//
// Params:
//   ?test_to=you@email.com   — redirects all emails to you (test mode, skips cooldown)
//   ?customer_id=uuid        — scan only one customer's devices
// ============================================================================

const pool = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME     || "sgt_hydroedge",
  user:     process.env.DB_USER     || "sgt_admin",
  password: process.env.DB_PASSWORD || "",
});

const DEFAULT_COOLDOWN  = 30;        // minutes
const HOUR_MS           = 60 * 60 * 1000;
const DAY_MS            = 24 * HOUR_MS;
const STALE_WARN_DAYS   = 3;         // flag as stale, still run alarms
const STALE_BLOCK_DAYS  = 7;         // suppress operational alarms, send no-data alert

// ─── Types ────────────────────────────────────────────────────────────────────

interface IoRecord { io_id: number; io_value: number; }

interface Alarm {
  id: string;
  severity: "critical" | "warning";
  message: string;
  action: string;
}

interface CollectedAlert {
  deviceId:        string;
  alertId:         string;
  customerId:      string;
  customerName:    string;
  contactName:     string;
  cooldownMinutes: number;
  isNoData:        boolean;
  alert:           DeviceAlert;
}

// ─── IO helpers ───────────────────────────────────────────────────────────────

function getIO(records: IoRecord[], ioId: number): number | null {
  const r = records.find((rec) => rec.io_id === ioId);
  return r !== undefined ? r.io_value : null;
}

// FMC650: (raw_mV * 0.001 / 47) * 1000
function calcCurrentFMC650(records: IoRecord[]): number | null {
  const raw = getIO(records, 9);
  if (raw === null) return null;
  return parseFloat(((raw * 0.001 / 47) * 1000).toFixed(1));
}

// ─── Device model ─────────────────────────────────────────────────────────────

function getDeviceModel(device: any): string {
  const assetName = (device.asset_name || "").trim();
  if (assetName === "EOW") return "EOW";
  const name = (device.device_name || "").toLowerCase();
  if (name.includes("1500")) return "1500KVA";
  if (name.includes("625"))  return "625KVA";
  return "380KVA";
}

// ─── Sustained water short tracking (DB-backed) ───────────────────────────────

async function getWaterShortSince(client: any, deviceId: string, signal: "cell" | "bubbler" | "tank"): Promise<number | null> {
  try {
    const r = await client.query(
      `SELECT first_seen_at FROM device_water_short_log WHERE device_id = $1 AND signal = $2 AND cleared_at IS NULL LIMIT 1`,
      [deviceId, signal]
    );
    return r.rows.length ? new Date(r.rows[0].first_seen_at).getTime() : null;
  } catch { return null; }
}

async function setWaterShortStart(client: any, deviceId: string, signal: "cell" | "bubbler" | "tank"): Promise<void> {
  try {
    await client.query(
      `INSERT INTO device_water_short_log (device_id, signal, first_seen_at) VALUES ($1, $2, NOW()) ON CONFLICT (device_id, signal) WHERE cleared_at IS NULL DO NOTHING`,
      [deviceId, signal]
    );
  } catch { /* table may not exist yet */ }
}

async function clearWaterShort(client: any, deviceId: string, signal: "cell" | "bubbler" | "tank"): Promise<void> {
  try {
    await client.query(
      `UPDATE device_water_short_log SET cleared_at = NOW() WHERE device_id = $1 AND signal = $2 AND cleared_at IS NULL`,
      [deviceId, signal]
    );
  } catch { /* table may not exist yet */ }
}

function sustained(sinceMs: number | null): boolean {
  return sinceMs !== null && Date.now() - sinceMs >= HOUR_MS;
}

// ─── FMC650 alarm logic ───────────────────────────────────────────────────────

async function computeAlarmsFMC650(
  client: any,
  records: IoRecord[],
  model: string,
  deviceId: string,
  setCurrent: number | null
): Promise<Alarm[]> {
  const alarms: Alarm[] = [];

  const din1  = getIO(records, 1);
  const din2  = getIO(records, 2);   // 0=short, 1=full
  const din4  = getIO(records, 4);   // 0=short, 1=full
  const ain1A = calcCurrentFMC650(records);
  const ain3  = getIO(records, 11);
  const dout1 = getIO(records, 179);

  const isRunning   = din1 === 1 && ain1A !== null && ain1A > 2;
  const isEOW       = model === "EOW";
  const label       = isEOW ? "engine" : "DG set";
  const hasMainTank = model === "380KVA" || model === "625KVA" || model === "EOW";

  // Update sustained timers
  if (isRunning && din2 === 0)                             await setWaterShortStart(client, deviceId, "cell");
  else                                                     await clearWaterShort(client, deviceId, "cell");
  if (isRunning && hasMainTank && din4 === 0)              await setWaterShortStart(client, deviceId, "bubbler");
  else                                                     await clearWaterShort(client, deviceId, "bubbler");
  if (isRunning && hasMainTank && ain3 !== null && ain3 > 20) await setWaterShortStart(client, deviceId, "tank");
  else                                                     await clearWaterShort(client, deviceId, "tank");

  // Always
  if (din1 === 0 && ain1A !== null && ain1A > 2)
    alarms.push({ id: "abnormal_current_off", severity: "critical",
      message: `Abnormal: current detected but ${label} is OFF`,
      action: "Contact Saarthi Support immediately" });

  if (din1 === 1) {
    if (dout1 === 1)
      alarms.push({ id: "remote_shutdown", severity: "warning",
        message: "System remotely shutdown — maintenance mode active",
        action: "Check with maintenance team before restarting" });

    if (ain1A !== null && ain1A < 2 && ain3 !== null && ain3 < 20 && dout1 === 0)
      alarms.push({ id: "abnormal_no_current", severity: "critical",
        message: `Abnormal: ${label} is ON but no output current`,
        action: "Contact Saarthi Support immediately" });

    if (hasMainTank && ain1A !== null && ain1A < 2 && ain3 !== null && ain3 > 20 && dout1 === 0)
      alarms.push({ id: "system_off_water_tank", severity: "critical",
        message: "System stopped — main water tank is empty",
        action: "Fill the main water tank immediately" });

    if (ain1A !== null && ain1A < 2 && dout1 === 0
        && !(ain1A < 2 && ain3 !== null && ain3 < 20)
        && !(hasMainTank && ain1A < 2 && ain3 !== null && ain3 > 20))
      alarms.push({ id: "abnormal_low_current", severity: "critical",
        message: `Abnormal: ${label} is ON but output current very low (${ain1A} A)`,
        action: "Contact Saarthi Support immediately" });

    // Water alarms — 1hr sustained
    if (isRunning && din2 === 0 && sustained(await getWaterShortSince(client, deviceId, "cell")))
      alarms.push({ id: "electrolyser_water_short", severity: "critical",
        message: "Internal electrolyser water shortage (sustained 1+ hour)",
        action: "Contact Saarthi Support immediately" });

    if (isRunning && hasMainTank && din4 === 0 && sustained(await getWaterShortSince(client, deviceId, "bubbler")))
      alarms.push({ id: "bubbler_water_short", severity: "critical",
        message: "Internal bubbler water shortage (sustained 1+ hour)",
        action: "Contact Saarthi Support immediately" });

    if (isRunning && hasMainTank && ain3 !== null && ain3 > 20 && sustained(await getWaterShortSince(client, deviceId, "tank")))
      alarms.push({ id: "main_tank_short", severity: "warning",
        message: "Main water tank level is low (sustained 1+ hour)",
        action: "Fill the main water tank" });

    if (isRunning && setCurrent !== null && ain1A !== null) {
      const tol = setCurrent * 0.1;
      if (ain1A < setCurrent - tol)
        alarms.push({ id: "under_current", severity: "warning",
          message: `Running under current — ${ain1A} A (set: ${setCurrent} A)`,
          action: "Contact Saarthi Support (±10% tolerance)" });
      else if (ain1A > setCurrent + tol)
        alarms.push({ id: "over_current", severity: "warning",
          message: `Running over current — ${ain1A} A (set: ${setCurrent} A)`,
          action: "Contact Saarthi Support (±10% tolerance)" });
    }
  }

  return alarms;
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const client = await pool.connect();

  const testTo           = request.nextUrl.searchParams.get("test_to");
  const filterCustomerId = request.nextUrl.searchParams.get("customer_id");
  const isTestMode       = !!testTo;

  try {
    // 1. Fetch devices
    const queryParams: any[] = [];
    let customerFilter = "";
    if (filterCustomerId) {
      queryParams.push(filterCustomerId);
      customerFilter = `AND d.customer_id = $${queryParams.length}`;
    }

    const devicesResult = await client.query(`
      SELECT
        d.id, d.imei, d.device_name, d.device_type, d.asset_name,
        d.customer_id,
        c.name AS customer_name,
        c.contact_person_name AS contact_name,
        das.set_current,
        das.alerts_enabled,
        COALESCE(das.cooldown_minutes, ${DEFAULT_COOLDOWN}) AS cooldown_minutes
      FROM devices d
      JOIN customers c ON c.id = d.customer_id
      LEFT JOIN device_alert_settings das ON das.device_id = d.id
      WHERE d.device_type = 'FMC650'
        AND d.asset_name IN ('DG', 'EOW')
        AND d.deleted_at IS NULL
        AND COALESCE(das.alerts_enabled, TRUE) = TRUE
        ${customerFilter}
    `, queryParams);

    if (devicesResult.rows.length === 0) {
      return NextResponse.json({ success: true, message: "No GreenX devices found", checked: 0, emails_sent: 0 });
    }

    // 2. Fetch user emails by customer
    const customerIds = [...new Set(devicesResult.rows.map((d: any) => d.customer_id))];
    const usersResult = await client.query(`
      SELECT customer_id, email, full_name FROM users
      WHERE customer_id = ANY($1) AND status = 'active'
        AND deleted_at IS NULL AND email IS NOT NULL AND email != ''
    `, [customerIds]);

    const usersByCustomer: Record<string, { email: string; name: string }[]> = {};
    for (const row of usersResult.rows) {
      if (!usersByCustomer[row.customer_id]) usersByCustomer[row.customer_id] = [];
      usersByCustomer[row.customer_id].push({ email: row.email, name: row.full_name || row.email });
    }

    // 3. Scan each device
    const collectedAlerts: CollectedAlert[] = [];
    const devicesWithNoAlerts: string[]     = [];

    for (const device of devicesResult.rows) {
      const model = getDeviceModel(device);

      // Fetch latest IO records with their timestamps
      const ioResult = await client.query(`
        SELECT DISTINCT ON (io.io_id) io.io_id, io.io_value, io.timestamp
        FROM io_records io
        WHERE io.device_id = $1
        ORDER BY io.io_id, io.timestamp DESC
      `, [device.id]);

      // ── Determine data freshness ──────────────────────────────────────────
      let lastSeenAt: Date | null = null;
      let dataAgeMs = Infinity;

      if (ioResult.rows.length > 0) {
        const timestamps = ioResult.rows
          .map((r: any) => new Date(r.timestamp).getTime())
          .filter((t: number) => !isNaN(t));
        if (timestamps.length > 0) {
          lastSeenAt = new Date(Math.max(...timestamps));
          dataAgeMs  = Date.now() - lastSeenAt.getTime();
        }
      }

      const isDataBlocked = dataAgeMs >= STALE_BLOCK_DAYS * DAY_MS; // 7d+
      const hasNoData     = ioResult.rows.length === 0;

      // ── No data at all OR data is 7d+ old → send no-data alert ───────────
      if (hasNoData || isDataBlocked) {
        const lastSeenStr = lastSeenAt
          ? `last data received ${Math.floor(dataAgeMs / DAY_MS)} days ago`
          : "no data ever received";

        const noDataAlarm: Alarm = {
          id:       "no_data_7d",
          severity: "warning",
          message:  `No data received for 7+ days (${lastSeenStr})`,
          action:   "Check device connectivity and SIM card — device may be offline",
        };

        // Cooldown check
        let shouldSkip = false;
        if (!isTestMode) {
          const recentCheck = await client.query(`
            SELECT id FROM notification_log
            WHERE device_id = $1 AND alert_id = $2 AND resolved_at IS NULL
              AND sent_at > NOW() - INTERVAL '1 minute' * $3
            LIMIT 1
          `, [device.id, noDataAlarm.id, device.cooldown_minutes]);
          shouldSkip = recentCheck.rows.length > 0;
        }

        if (!shouldSkip) {
          collectedAlerts.push({
            deviceId: device.id, alertId: noDataAlarm.id,
            customerId: device.customer_id, customerName: device.customer_name,
            contactName: device.contact_name || device.customer_name,
            cooldownMinutes: device.cooldown_minutes,
            isNoData: true,
            alert: {
              deviceName: device.device_name || device.imei,
              deviceImei: device.imei, deviceModel: model,
              severity: noDataAlarm.severity,
              message: noDataAlarm.message, action: noDataAlarm.action,
            },
          });
        }
        continue; // skip operational alarms for this device
      }

      // ── Data is fresh (within 7 days) — run operational alarms ───────────
      const ioRecords: IoRecord[] = ioResult.rows.map((r: any) => ({
        io_id: r.io_id, io_value: parseFloat(r.io_value),
      }));

      const alarms = await computeAlarmsFMC650(
        client, ioRecords, model, device.id,
        device.set_current ? parseFloat(device.set_current) : null
      );

      if (alarms.length === 0) {
        devicesWithNoAlerts.push(device.id);
        continue;
      }

      for (const alarm of alarms) {
        if (!isTestMode) {
          const recentCheck = await client.query(`
            SELECT id FROM notification_log
            WHERE device_id = $1 AND alert_id = $2 AND resolved_at IS NULL
              AND sent_at > NOW() - INTERVAL '1 minute' * $3
            LIMIT 1
          `, [device.id, alarm.id, device.cooldown_minutes]);
          if (recentCheck.rows.length > 0) continue;
        }

        collectedAlerts.push({
          deviceId: device.id, alertId: alarm.id,
          customerId: device.customer_id, customerName: device.customer_name,
          contactName: device.contact_name || device.customer_name,
          cooldownMinutes: device.cooldown_minutes,
          isNoData: false,
          alert: {
            deviceName: device.device_name || device.imei,
            deviceImei: device.imei, deviceModel: model,
            severity: alarm.severity, message: alarm.message, action: alarm.action,
          },
        });
      }
    }

    // Resolve no-alarm devices
    if (!isTestMode && devicesWithNoAlerts.length > 0) {
      await client.query(
        `UPDATE notification_log SET resolved_at = NOW() WHERE device_id = ANY($1) AND resolved_at IS NULL`,
        [devicesWithNoAlerts]
      );
    }

    // 4. Group by customer, send one email each
    const byCustomer: Record<string, { customerName: string; contactName: string; alerts: CollectedAlert[] }> = {};
    for (const ca of collectedAlerts) {
      if (!byCustomer[ca.customerId]) {
        byCustomer[ca.customerId] = { customerName: ca.customerName, contactName: ca.contactName, alerts: [] };
      }
      byCustomer[ca.customerId].alerts.push(ca);
    }

    const emailResults: any[] = [];
    const timestamp = new Date().toISOString();

    for (const [customerId, group] of Object.entries(byCustomer)) {
      const customerUsers       = usersByCustomer[customerId] || [];
      const realRecipientEmails = customerUsers.map((u) => u.email);
      const primaryContactName  = customerUsers[0]?.name || group.contactName;
      const deviceAlerts        = group.alerts.map((ca) => ca.alert);

      const emailResult = await sendBatchAlertEmail({
        to:          isTestMode ? [testTo!] : realRecipientEmails,
        cc:          isTestMode ? [] : undefined,
        contactName: primaryContactName,
        customerName: group.customerName,
        alerts:      deviceAlerts,
        timestamp,
      });

      const emailStatus = emailResult.success ? "sent" : `error: ${emailResult.error}`;

      if (!isTestMode) {
        for (const ca of group.alerts) {
          await client.query(`
            INSERT INTO notification_log
              (device_id, alert_id, severity, message, action,
               customer_email, customer_name, device_name, device_imei, email_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            ca.deviceId, ca.alertId, ca.alert.severity,
            ca.alert.message, ca.alert.action,
            realRecipientEmails.join(", "), group.customerName,
            ca.alert.deviceName, ca.alert.deviceImei, emailStatus,
          ]);
        }
      }

      emailResults.push({
        customer:         group.customerName,
        customer_id:      customerId,
        alerts_count:     deviceAlerts.length,
        devices_affected: new Set(deviceAlerts.map((a) => a.deviceImei)).size,
        actual_sent_to:   emailResult.sentTo,
        actual_cc:        emailResult.ccTo,
        ...(isTestMode ? {
          production_would_send_to: realRecipientEmails,
          production_would_cc: "support team (auto)",
          test_mode: true,
        } : {}),
        status: emailStatus,
        alerts: deviceAlerts.map((a) => ({ device: a.deviceName, severity: a.severity, message: a.message })),
      });
    }

    return NextResponse.json({
      success: true,
      ...(isTestMode       ? { test_mode: true, test_email: testTo } : {}),
      ...(filterCustomerId ? { filtered_customer_id: filterCustomerId } : {}),
      checked:      devicesResult.rows.length,
      total_alerts: collectedAlerts.length,
      emails_sent:  emailResults.length,
      emails:       emailResults,
    });
  } catch (error: any) {
    console.error("[ALERT CHECK ERROR]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

// ─── GET: Alert history ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const limit  = parseInt(searchParams.get("limit") || "50");
    const active = searchParams.get("active") === "true";

    const query = active
      ? `SELECT * FROM notification_log WHERE resolved_at IS NULL ORDER BY sent_at DESC LIMIT $1`
      : `SELECT * FROM notification_log ORDER BY sent_at DESC LIMIT $1`;

    const result = await client.query(query, [limit]);
    return NextResponse.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}