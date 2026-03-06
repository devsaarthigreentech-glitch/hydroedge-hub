import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const device_id = searchParams.get("device_id");
  const days = parseInt(searchParams.get("days") || "1");

  if (!device_id) {
    return NextResponse.json({ error: "device_id required" }, { status: 400 });
  }

  try {
    // ── Get GPS records with speed + ignition state joined ───────────────────
    // Strategy: join gps_records with the most recent ignition IO at each timestamp
    // We use a lateral join to get ignition state at each GPS point
    const result = await query(
      `WITH gps_with_ignition AS (
         SELECT
           g.timestamp,
           g.speed,
           g.latitude,
           g.longitude,
           -- Get the most recent ignition value at or before this GPS point
           (
             SELECT io_value::int
             FROM io_records ir
             WHERE ir.device_id = g.device_id
               AND ir.io_id = 239
               AND ir.timestamp <= g.timestamp
             ORDER BY ir.timestamp DESC
             LIMIT 1
           ) AS ignition_state,
           LAG(g.timestamp) OVER (ORDER BY g.timestamp) AS prev_timestamp,
           LAG(g.speed)     OVER (ORDER BY g.timestamp) AS prev_speed
         FROM gps_records g
         WHERE g.device_id = $1
           AND g.timestamp >= NOW() - ($2 * INTERVAL '1 day')
           AND g.latitude  BETWEEN -90  AND 90
           AND g.longitude BETWEEN -180 AND 180
         ORDER BY g.timestamp ASC
       ),
       -- Mark idle segments: ignition ON, speed = 0
       idle_segments AS (
         SELECT
           timestamp,
           prev_timestamp,
           speed,
           ignition_state,
           latitude,
           longitude,
           EXTRACT(EPOCH FROM (timestamp - prev_timestamp)) / 60.0 AS gap_minutes,
           CASE
             WHEN ignition_state = 1 AND speed = 0 THEN 1
             ELSE 0
           END AS is_idle
         FROM gps_with_ignition
         WHERE prev_timestamp IS NOT NULL
       ),
       -- Group consecutive idle points into idle events
       idle_groups AS (
         SELECT
           *,
           SUM(CASE WHEN is_idle = 0 THEN 1 ELSE 0 END)
             OVER (ORDER BY timestamp) AS grp
         FROM idle_segments
       ),
       -- Aggregate each idle group
       idle_events AS (
         SELECT
           MIN(prev_timestamp)                         AS idle_start,
           MAX(timestamp)                              AS idle_end,
           SUM(gap_minutes)                            AS total_idle_minutes,
           MIN(latitude)                               AS latitude,
           MIN(longitude)                              AS longitude,
           COUNT(*)                                    AS point_count
         FROM idle_groups
         WHERE is_idle = 1
         GROUP BY grp
         HAVING SUM(gap_minutes) >= 5   -- Only idle events >= 5 minutes
       )
       SELECT
         idle_start,
         idle_end,
         ROUND(total_idle_minutes::numeric, 1)  AS idle_minutes,
         latitude,
         longitude
       FROM idle_events
       ORDER BY idle_start ASC`,
      [device_id, days]
    );

    const idleEvents = result.rows;

    // ── Daily aggregation ─────────────────────────────────────────────────────
    const dailyMap = new Map<string, { idle_minutes: number; events: number }>();

    for (const ev of idleEvents) {
      const day = new Date(ev.idle_start)
        .toLocaleDateString("en-CA"); // YYYY-MM-DD
      const existing = dailyMap.get(day) || { idle_minutes: 0, events: 0 };
      dailyMap.set(day, {
        idle_minutes: existing.idle_minutes + parseFloat(ev.idle_minutes),
        events: existing.events + 1,
      });
    }

    const dailyIdle = Array.from(dailyMap.entries())
      .sort(([a], [b]) => b.localeCompare(a)) // newest first
      .map(([day, data]) => ({
        day,
        idle_minutes: parseFloat(data.idle_minutes.toFixed(1)),
        idle_events: data.events,
        idle_hours: parseFloat((data.idle_minutes / 60).toFixed(2)),
      }));

    // ── Summary ───────────────────────────────────────────────────────────────
    const totalIdleMin = idleEvents.reduce(
      (s, e) => s + parseFloat(e.idle_minutes),
      0
    );

    // Estimate fuel wasted idling: ~0.8L/hour for a typical diesel truck at idle
    const IDLE_FUEL_RATE_LPH = 0.8;
    const fuelWasted = parseFloat(
      ((totalIdleMin / 60) * IDLE_FUEL_RATE_LPH).toFixed(2)
    );
    const co2Wasted = parseFloat((fuelWasted * 2.68).toFixed(2));

    return NextResponse.json({
      success: true,
      idle_events: idleEvents.map((e) => ({
        start: e.idle_start,
        end: e.idle_end,
        duration_min: parseFloat(e.idle_minutes),
        location: { lat: e.latitude, lon: e.longitude },
      })),
      daily: dailyIdle,
      summary: {
        total_idle_events: idleEvents.length,
        total_idle_minutes: parseFloat(totalIdleMin.toFixed(1)),
        total_idle_hours: parseFloat((totalIdleMin / 60).toFixed(2)),
        estimated_fuel_wasted_litres: fuelWasted,
        estimated_co2_wasted_kg: co2Wasted,
        avg_idle_duration_min:
          idleEvents.length > 0
            ? parseFloat((totalIdleMin / idleEvents.length).toFixed(1))
            : 0,
      },
    });
  } catch (error) {
    console.error("Idle API error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}