import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { currentDivisorFor } from "@/lib/dg-metrics";

// ============================================================================
// GET /api/analytics/dg/trend — recent run status and output current, bucketed
// ----------------------------------------------------------------------------
// Feeds the strip chart on the DG digital twin. /api/telemetry-history does not
// carry Ain.1 or Din.1, and the twin only needs a few hours of two signals, so
// this reads exactly those two io_ids. Each lookup is one (device_id, io_id,
// timestamp) range, which idx_io_records_device_io_ts serves.
//
// Params:
//   ?device_id=uuid   required
//   ?hours=6          window, 1..24, default 6
//
// Response: buckets of `bucket_min` minutes, oldest first:
//   { t, amps (avg Ain.1 in amps, null if no sample), on (1 if Din.1 was 1 at
//     any sample in the bucket, 0 if only 0s, null if no sample) }
// ============================================================================

const SQL = `
WITH a AS (
  SELECT to_timestamp(floor(extract(epoch FROM timestamp) / $4) * $4) AS t,
         AVG(io_value::numeric) / $5 AS amps
    FROM io_records
   WHERE device_id = $1 AND io_id = 9 AND timestamp > $2 AND timestamp <= $3
   GROUP BY 1
), d AS (
  SELECT to_timestamp(floor(extract(epoch FROM timestamp) / $4) * $4) AS t,
         MAX(io_value::numeric) AS on
    FROM io_records
   WHERE device_id = $1 AND io_id = 1 AND timestamp > $2 AND timestamp <= $3
   GROUP BY 1
)
SELECT COALESCE(a.t, d.t) AS t, a.amps, d.on
  FROM a FULL OUTER JOIN d ON a.t = d.t
 ORDER BY 1`;

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const deviceId = sp.get("device_id");
  if (!deviceId) {
    return NextResponse.json({ success: false, error: "device_id is required" }, { status: 400 });
  }
  const hours = Math.min(24, Math.max(1, Number(sp.get("hours")) || 6));
  // About 72 points across the window, never finer than a minute.
  const bucketSec = Math.max(60, Math.round((hours * 3600) / 72 / 60) * 60);

  try {
    const dev = await query("SELECT device_type FROM devices WHERE id = $1", [deviceId]);
    if (dev.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Device not found" }, { status: 404 });
    }
    const end = new Date();
    const start = new Date(end.getTime() - hours * 3600 * 1000);
    const r = await query(SQL, [deviceId, start, end, bucketSec, currentDivisorFor(dev.rows[0].device_type)]);
    return NextResponse.json({
      success: true,
      hours,
      bucket_min: bucketSec / 60,
      start: start.toISOString(),
      end: end.toISOString(),
      points: r.rows.map((x: any) => ({
        t: new Date(x.t).toISOString(),
        amps: x.amps === null ? null : parseFloat(Number(x.amps).toFixed(2)),
        on: x.on === null ? null : Number(x.on) > 0 ? 1 : 0,
      })),
    });
  } catch (error: any) {
    console.error("[dg-trend]", error?.message || error);
    return NextResponse.json({ success: false, error: "Failed to load trend" }, { status: 500 });
  }
}
