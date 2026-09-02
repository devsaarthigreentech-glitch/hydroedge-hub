import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  fetchDgEngine, fetchDgOutput, fetchDgHealth, fetchDgMovement,
  buildDgDaily, istDaysBetween,
  DgEngine, DgOutput, DgHealth, DgMovement,
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
//
// ── Partial results are a feature ────────────────────────────────────────────
// The four signal groups are queried independently and settled independently.
// io_records is 46 GB on a 1 vCPU host, so any one of them can be slow; when
// that happens the response still carries the groups that succeeded and names
// the ones that did not in `degraded`. The previous single-statement version
// returned "Error: timeout exceeded" and nothing else, which threw away the
// engine run time — the one number the tab exists to show.
//
// ── Safety net for the headline number ───────────────────────────────────────
// Engine hours also live in device_daily_summary (migration 001), maintained by
// scripts/rollup-daily-summary.js — one indexed lookup instead of a raw scan.
// It is read first and kept in hand, then the live engine query runs anyway,
// because the rollup carries no start count or run lengths.
//
// So this is a FALLBACK, not a fast path: if the live engine scan times out, the
// tab still shows run time from the rollup instead of a dash. The actual cure
// for slowness is the composite index in db/migrations/002 — see the note in
// dg-metrics.ts.
//
// Params:
//   ?device_id=uuid                       required
//   ?days=7                               rolling window, default 1
//   ?start_datetime=...&end_datetime=...  explicit ISO range (with offset)
//   ?only=movement                        skip the io_records work entirely —
//                                         used by the Map tab, which needs the
//                                         position check and nothing else
//   ?live=1                               bypass the rollup, scan raw
// ============================================================================

/** Per-group budget. Comfortably under the app pool's 15s statement_timeout. */
const GROUP_TIMEOUT_MS = 12_000;

/**
 * Settle one signal group, converting a failure into a named reason instead of
 * letting it reject the whole response. The timeout is belt-and-braces: the
 * pool's statement_timeout should fire first, but a connection that never comes
 * back from the pool at all is not covered by it.
 */
async function settle<T>(name: string, work: Promise<T>): Promise<{ value: T | null; failed?: string }> {
  let timer: NodeJS.Timeout | undefined;
  try {
    const value = await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${name} timed out after ${GROUP_TIMEOUT_MS / 1000}s`)), GROUP_TIMEOUT_MS);
      }),
    ]);
    return { value };
  } catch (err: any) {
    console.warn(`[dg-analytics] ${name} failed: ${err?.message || err}`);
    return { value: null, failed: `${name}: ${err?.message || "failed"}` };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Engine hours per day from the rollup. Returns null when the rollup does not
 * cover the whole window — a missing row means "not rolled up yet", never
 * "nothing happened", so a partial read would under-report with nothing in the
 * response to reveal it. Same coverage gate as serveFromSummary in
 * /api/analytics.
 */
async function engineFromSummary(deviceId: string, days: string[]): Promise<DgEngine | null> {
  try {
    const r = await query(
      `SELECT day, engine_on_hours, is_partial
         FROM device_daily_summary
        WHERE device_id = $1 AND day = ANY($2::date[])`,
      [deviceId, days]
    );
    if (r.rows.length < days.length) return null;
    // A day still in progress will change on the next refresh; for the current
    // day that is expected and fine, but a stale partial row for an older day
    // would quietly under-report, so any partial row for a past day disqualifies.
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    if (r.rows.some((row: any) => row.is_partial && String(row.day).slice(0, 10) < today)) return null;

    const daily = new Map<string, { hours: number; starts: number }>();
    let total = 0;
    for (const row of r.rows) {
      const day = String(row.day).slice(0, 10);
      const hours = parseFloat(String(row.engine_on_hours ?? 0)) || 0;
      total += hours;
      // The rollup does not carry a start count; the strip shows a dash rather
      // than a fabricated zero, and the live path fills it in when used.
      daily.set(day, { hours: parseFloat(hours.toFixed(2)), starts: 0 });
    }
    return {
      engineOnHours: parseFloat(total.toFixed(2)),
      starts: 0,
      longestRunHours: 0,
      daily,
    };
  } catch {
    // Table missing on an install that never ran migration 001 — go live.
    return null;
  }
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const deviceId = sp.get("device_id");
  const startParam = sp.get("start_datetime");
  const endParam = sp.get("end_datetime");
  const days = parseInt(sp.get("days") || "1");
  const onlyMovement = sp.get("only") === "movement";
  const forceLive = sp.get("live") === "1";

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
    const degraded: string[] = [];

    // ── Map tab path: the position check on its own ─────────────────────────
    // Scanning io_records to draw a marker would be pure waste, and it is what
    // made the map inherit the analytics timeout.
    if (onlyMovement) {
      const mv = await settle("movement", fetchDgMovement({ query }, deviceId, startAt, endAt));
      if (mv.failed) degraded.push(mv.failed);
      return NextResponse.json({
        success: true,
        window: { start: startAt.toISOString(), end: endAt.toISOString() },
        movement: movementPayload(mv.value, device),
        ...(degraded.length ? { degraded } : {}),
      });
    }

    // ── Engine hours: rollup first, live only if it cannot answer ───────────
    let engine: DgEngine | null = null;
    let engineSource: "daily_summary" | "live" = "live";
    if (!forceLive) {
      engine = await engineFromSummary(deviceId, windowDays);
      if (engine) engineSource = "daily_summary";
    }

    // The rollup has no start count or run lengths, so the live engine query
    // still runs — but if IT is the group that times out, the summary numbers
    // above are already in hand and the tab keeps its headline figure.
    const [liveEngine, output, health, movement] = await Promise.all([
      settle("engine", fetchDgEngine({ query }, deviceId, startAt, endAt)),
      settle("output", fetchDgOutput({ query }, deviceId, device.device_type, startAt, endAt)),
      settle("health", fetchDgHealth({ query }, deviceId, startAt, endAt)),
      settle("movement", fetchDgMovement({ query }, deviceId, startAt, endAt)),
    ]);

    if (liveEngine.value) {
      engine = liveEngine.value;
      engineSource = "live";
    } else if (!engine) {
      // Neither path produced engine numbers — this is the one group whose
      // absence is worth naming loudly, since it is the point of the tab.
      degraded.push(liveEngine.failed || "engine: unavailable");
    }
    if (output.failed) degraded.push(output.failed);
    if (health.failed) degraded.push(health.failed);
    if (movement.failed) degraded.push(movement.failed);

    const o: DgOutput | null = output.value;
    const h: DgHealth | null = health.value;
    const daily = buildDgDaily(windowDays, engine, o);

    // Setpoint is stored as a raw Ain.1 reading; amps are for display only.
    const rawSet = device.set_ain1_raw != null ? parseFloat(device.set_ain1_raw) : null;
    const setAmps =
      rawSet !== null && !isNaN(rawSet)
        ? parseFloat((rawSet / (device.device_type === "FMC650" ? 47 : 83)).toFixed(1))
        : null;

    // Hours the window spans, so "data availability" is honest for a part-day
    // range rather than always being measured against a full day.
    const windowHours = Math.max(1, Math.round((endAt.getTime() - startAt.getTime()) / 3_600_000));

    const engineOnHours = engine?.engineOnHours ?? null;
    const loadHours = o?.loadHours ?? null;

    // Running but not producing — the most useful thing this tab can say, and
    // the reason load time is tracked apart from run time at all. Only computed
    // when BOTH groups answered; half the pair would give a false ratio.
    const loadRatio =
      engineOnHours !== null && loadHours !== null && engineOnHours > 0
        ? parseFloat((loadHours / engineOnHours).toFixed(2))
        : null;

    return NextResponse.json({
      success: true,
      window: {
        start: startAt.toISOString(),
        end: endAt.toISOString(),
        hours: windowHours,
        days: windowDays,
      },
      summary: {
        engine_on_hours: engineOnHours,
        load_hours: loadHours,
        starts: engine?.starts ?? null,
        longest_run_hours: engine?.longestRunHours ?? null,
        avg_amps: o?.avgAmps ?? null,
        peak_amps: o?.peakAmps ?? null,
        set_amps: setAmps,
        utilisation_pct:
          engineOnHours !== null ? Math.round((engineOnHours / windowHours) * 100) : null,
        load_ratio: loadRatio,
        hours_with_data: h?.hoursWithData ?? null,
        data_availability_pct:
          h ? Math.min(100, Math.round((h.hoursWithData / windowHours) * 100)) : null,
        supply_min_v: h?.supplyMinV ?? null,
        supply_avg_v: h?.supplyAvgV ?? null,
        battery_min_v: h?.batteryMinV ?? null,
        gsm_avg_pct: h?.gsmAvgPct ?? null,
      },
      movement: movementPayload(movement.value, device),
      daily,
      meta: {
        load_threshold_a: LOAD_THRESHOLD_A,
        engine_source: engineSource,
        fuel: "unavailable — no CAN adapter on the genset controller",
      },
      ...(degraded.length ? { degraded } : {}),
    });
  } catch (error: any) {
    console.error("DG analytics API error:", error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

function movementPayload(mv: DgMovement | null, device: any) {
  return {
    spread_km: mv?.spreadKm ?? null,
    fixes: mv?.fixes ?? 0,
    moved: mv?.moved ?? false,
    threshold_km: DG_MOVED_KM,
    last_latitude: device.last_latitude,
    last_longitude: device.last_longitude,
    last_location_time: device.last_location_time,
  };
}
