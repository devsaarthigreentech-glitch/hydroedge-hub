import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { query } from "@/lib/db";
import {
  computeDgMetrics, computeDgMovement, istDaysBetween,
  DG_MOVED_KM, LOAD_THRESHOLD_A,
} from "@/lib/dg-metrics";

// ============================================================================
// GET /api/analytics/dg — engine analytics for a stationary diesel generator
// ----------------------------------------------------------------------------
// The vehicle analytics endpoints (/api/analytics, /trips, /idle) answer
// questions a genset cannot have: distance travelled, km/L, trips, idle fuel
// wasted. This one answers what a DG actually has — run time, starts, time
// under load, output current — plus a position check, because the only thing
// distance means for a DG is "has somebody moved it".
//
// Deliberately no fuel figure: these units have no CAN adapter on the genset
// controller, and IO 18 on an FMB1YX without one is an accelerometer axis.
// See CAN_ADAPTER_IO_MAP in src/app/api/telemetry/[deviceId]/route.ts.
//
// Params (mirrors /api/analytics so the tab's range picker works unchanged):
//   ?device_id=uuid                       required
//   ?days=7                               rolling window, default 1
//   ?start_datetime=...&end_datetime=...  explicit ISO range (with offset)
// ============================================================================

// ── Why a separate pool ─────────────────────────────────────────────────────
// The app pool in @/lib/db caps every statement at 15s, which is right for the
// interactive queries it normally serves. A 14-day window of io_records for one
// device is a few hundred thousand rows on a 1 vCPU host and can sit just past
// that ceiling — and a timeout here returns an error where the old tab returned
// (wrong) numbers, which reads as a regression. Small and separate so a slow
// analytics window cannot occupy connections the rest of the app needs.
// Hot-reload guard, same reasoning as the singleton in @/lib/db: without it
// every code change in dev leaks another pool against the production host.
const globalForDg = globalThis as unknown as { dgAnalyticsPool: Pool | undefined };

const pool =
  globalForDg.dgAnalyticsPool ??
  (() => {
    const p = new Pool({
      host:     process.env.DB_HOST     || "localhost",
      port:     parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME     || "sgt_hydroedge",
      user:     process.env.DB_USER     || "postgres",
      password: process.env.DB_PASSWORD,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
      keepAlive: true,
      statement_timeout: 60_000,
      query_timeout:     60_000,
      idle_in_transaction_session_timeout: 30_000,
    });
    p.setMaxListeners(50);
    p.on("error", (err) => console.error("❌ DG analytics pool error:", err));
    return p;
  })();

if (process.env.NODE_ENV !== "production") globalForDg.dgAnalyticsPool = pool;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get("device_id");
  const startParam = searchParams.get("start_datetime");
  const endParam = searchParams.get("end_datetime");
  const days = parseInt(searchParams.get("days") || "1");

  if (!deviceId) {
    return NextResponse.json({ error: "device_id required" }, { status: 400 });
  }

  // Explicit range wins; otherwise a rolling window ending now.
  let startAt: Date;
  let endAt: Date;
  if (startParam && endParam) {
    startAt = new Date(startParam);
    endAt = new Date(endParam);
    if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
      return NextResponse.json({ error: "start_datetime / end_datetime are not valid dates" }, { status: 400 });
    }
    if (startAt >= endAt) {
      return NextResponse.json({ error: "start_datetime must be before end_datetime" }, { status: 400 });
    }
  } else {
    if (!Number.isInteger(days) || days < 1 || days > 400) {
      return NextResponse.json({ error: "days must be between 1 and 400" }, { status: 400 });
    }
    endAt = new Date();
    startAt = new Date(endAt.getTime() - days * 24 * 60 * 60 * 1000);
  }

  try {
    const deviceResult = await query(
      `SELECT device_type, asset_name, set_ain1_raw, last_latitude, last_longitude, last_location_time
         FROM devices WHERE id = $1 AND deleted_at IS NULL`,
      [deviceId]
    );
    if (deviceResult.rows.length === 0) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }
    const device = deviceResult.rows[0];

    const windowDays = istDaysBetween(startAt, endAt);

    // Independent queries — the position check must not delay the engine numbers.
    // Both go to the long-timeout pool; only the small device lookup above uses
    // the shared app pool.
    const [metrics, movement] = await Promise.all([
      computeDgMetrics(pool, deviceId, device.device_type, startAt, endAt, windowDays),
      computeDgMovement(pool, deviceId, startAt, endAt),
    ]);

    // Setpoint is stored as a raw Ain.1 reading; amps are for display only.
    const divisorRaw = device.set_ain1_raw != null ? parseFloat(device.set_ain1_raw) : null;
    const setAmps =
      divisorRaw !== null && !isNaN(divisorRaw)
        ? parseFloat((divisorRaw / (device.device_type === "FMC650" ? 47 : 83)).toFixed(1))
        : null;

    // Hours the window spans, so "data availability" is honest for a part-day
    // range rather than always being measured against a full day.
    const windowHours = Math.max(1, Math.round((endAt.getTime() - startAt.getTime()) / 3_600_000));

    const utilisationPct =
      metrics.engineOnHours > 0 ? Math.round((metrics.engineOnHours / windowHours) * 100) : 0;

    // Running but not producing. The single most useful thing this tab can say
    // about a genset, and the reason loadHours is tracked separately at all.
    const loadRatio =
      metrics.engineOnHours > 0 ? metrics.loadHours / metrics.engineOnHours : null;

    return NextResponse.json({
      success: true,
      window: {
        start: startAt.toISOString(),
        end: endAt.toISOString(),
        hours: windowHours,
        days: windowDays,
      },
      summary: {
        engine_on_hours: metrics.engineOnHours,
        load_hours: metrics.loadHours,
        starts: metrics.starts,
        longest_run_hours: metrics.longestRunHours,
        avg_amps: metrics.avgAmps,
        peak_amps: metrics.peakAmps,
        set_amps: setAmps,
        utilisation_pct: utilisationPct,
        load_ratio: loadRatio === null ? null : parseFloat(loadRatio.toFixed(2)),
        hours_with_data: metrics.hoursWithData,
        data_availability_pct: Math.min(100, Math.round((metrics.hoursWithData / windowHours) * 100)),
        supply_min_v: metrics.supplyMinV,
        supply_avg_v: metrics.supplyAvgV,
        battery_min_v: metrics.batteryMinV,
        gsm_avg_pct: metrics.gsmAvgPct,
      },
      movement: {
        spread_km: movement.spreadKm,
        fixes: movement.fixes,
        moved: movement.moved,
        threshold_km: DG_MOVED_KM,
        last_latitude: device.last_latitude,
        last_longitude: device.last_longitude,
        last_location_time: device.last_location_time,
      },
      daily: metrics.daily,
      meta: {
        load_threshold_a: LOAD_THRESHOLD_A,
        fuel: "unavailable — no CAN adapter on the genset controller",
      },
    });
  } catch (error) {
    console.error("DG analytics API error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
