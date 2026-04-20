// // // import { NextRequest, NextResponse } from "next/server";
// // // import { query } from "@/lib/db";

// // // export async function GET(request: NextRequest) {
// // //   const { searchParams } = new URL(request.url);
// // //   const device_id = searchParams.get("device_id");
// // //   const days = parseInt(searchParams.get("days") || "1");

// // //   if (!device_id) {
// // //     return NextResponse.json({ error: "device_id required" }, { status: 400 });
// // //   }

// // //   try {
// // //     // Get daily mileage — IO 105 is vehicle.mileage (cumulative odometer in km)
// // //     // We take MAX - MIN per day to get distance travelled that day
// // //     const mileageQuery = `
// // //       SELECT 
// // //         DATE(timestamp AT TIME ZONE 'Asia/Kolkata') as day,
// // //         MAX(io_value::numeric) as max_mileage,
// // //         MIN(io_value::numeric) as min_mileage,
// // //         MAX(io_value::numeric) - MIN(io_value::numeric) as daily_distance_meters
// // //       FROM io_records
// // //       WHERE device_id = $1
// // //         AND io_id = 16
// // //         AND timestamp >= NOW() - ($2 * INTERVAL '1 day')
// // //         AND io_value::numeric > 0
// // //       GROUP BY DATE(timestamp AT TIME ZONE 'Asia/Kolkata')
// // //       ORDER BY day DESC
// // //     `;

// // //     // Get daily fuel consumed — IO 392 (FMB150) or IO 405 (FMC650)
// // //     // Also cumulative, so MAX - MIN per day
// // //     const fuelQuery = `
// // //       SELECT 
// // //         DATE(timestamp AT TIME ZONE 'Asia/Kolkata') as day,
// // //         MAX(io_value::numeric) as max_fuel,
// // //         MIN(io_value::numeric) as min_fuel,
// // //         ROUND((MAX(io_value::numeric) - MIN(io_value::numeric)) * 0.1, 2) as daily_fuel
// // //       FROM io_records
// // //       WHERE device_id = $1
// // //         AND io_id = 107
// // //         AND timestamp >= NOW() - ($2 * INTERVAL '1 day')
// // //         AND io_value::numeric > 0
// // //       GROUP BY DATE(timestamp AT TIME ZONE 'Asia/Kolkata')
// // //       ORDER BY day DESC
// // //     `;

// // //     const [mileageResult, fuelResult] = await Promise.all([
// // //         query(mileageQuery, [device_id, days]),
// // //         query(fuelQuery, [device_id, days]),
// // //       ]);

// // //     // Merge by day and calculate fuel average
// // //     const mileageMap = new Map(
// // //       mileageResult.rows.map((r) => [r.day.toISOString().split("T")[0], r])
// // //     );
// // //     const fuelMap = new Map(
// // //       fuelResult.rows.map((r) => [r.day.toISOString().split("T")[0], r])
// // //     );

// // //     // Get all unique days
// // //     const allDays = new Set([...mileageMap.keys(), ...fuelMap.keys()]);

// // //     const dailyData = Array.from(allDays)
// // //       .sort()
// // //       .reverse()
// // //       .map((day) => {
// // //         const mileage = mileageMap.get(day);
// // //         const fuel = fuelMap.get(day);
// // //         const distanceMeters = parseFloat(mileage?.daily_distance_meters || 0);
// // //         const distance = parseFloat((distanceMeters / 1000).toFixed(2));
// // //         const fuelConsumed = parseFloat(fuel?.daily_fuel || 0);
// // //         // Fuel average = km per litre
// // //         const fuelAverage =
// // //           fuelConsumed > 0 ? parseFloat((distance / fuelConsumed).toFixed(2)) : null;

// // //         return {
// // //           day,
// // //           distance_km: distance,
// // //           fuel_litres: fuelConsumed,
// // //           fuel_average_kmpl: fuelAverage, // km per litre
// // //         };
// // //       });

// // //     // Totals
// // //     const totalDistance = dailyData.reduce((sum, d) => sum + d.distance_km, 0);
// // //     const totalFuel = dailyData.reduce((sum, d) => sum + d.fuel_litres, 0);
// // //     const overallAverage =
// // //       totalFuel > 0 ? parseFloat((totalDistance / totalFuel).toFixed(2)) : null;

// // //     return NextResponse.json({
// // //       success: true,
// // //       data: dailyData,
// // //       summary: {
// // //         total_distance_km: parseFloat(totalDistance.toFixed(2)),
// // //         total_fuel_litres: parseFloat(totalFuel.toFixed(2)),
// // //         overall_fuel_average_kmpl: overallAverage,
// // //         days_with_data: dailyData.length,
// // //       },
// // //     });
// // //   } catch (error) {
// // //     console.error("Analytics API error:", error);
// // //     return NextResponse.json({ error: String(error) }, { status: 500 });
// // //   }
// // // }
// // import { NextRequest, NextResponse } from "next/server";
// // import { query } from "@/lib/db";

// // export async function GET(request: NextRequest) {
// //   const { searchParams } = new URL(request.url);
// //   const device_id = searchParams.get("device_id");
// //   const days = parseInt(searchParams.get("days") || "1");
// //   const start_date = searchParams.get("start_date"); // e.g. "2025-03-01"
// //   const end_date = searchParams.get("end_date");     // e.g. "2025-03-17"

// //   if (!device_id) {
// //     return NextResponse.json({ error: "device_id required" }, { status: 400 });
// //   }

// //   // Build the time filter clause depending on which params were provided
// //   const useCustomRange = start_date && end_date;

// //   // For custom range: filter by date in IST
// //   // For preset days: use the existing rolling window
// //   const timeFilter = useCustomRange
// //     ? `DATE(timestamp AT TIME ZONE 'Asia/Kolkata') BETWEEN $2 AND $3`
// //     : `timestamp >= NOW() - ($2 * INTERVAL '1 day')`;

// //   // Params change shape based on mode
// //   const mileageParams = useCustomRange
// //     ? [device_id, start_date, end_date]
// //     : [device_id, days];

// //   const fuelParams = useCustomRange
// //     ? [device_id, start_date, end_date]
// //     : [device_id, days];

// //   try {
// //     const mileageQuery = `
// //       SELECT 
// //         DATE(timestamp AT TIME ZONE 'Asia/Kolkata') as day,
// //         MAX(io_value::numeric) as max_mileage,
// //         MIN(io_value::numeric) as min_mileage,
// //         MAX(io_value::numeric) - MIN(io_value::numeric) as daily_distance_meters
// //       FROM io_records
// //       WHERE device_id = $1
// //         AND io_id = 16
// //         AND ${timeFilter}
// //         AND io_value::numeric > 0
// //       GROUP BY DATE(timestamp AT TIME ZONE 'Asia/Kolkata')
// //       ORDER BY day DESC
// //     `;

// //     const fuelQuery = `
// //       SELECT 
// //         DATE(timestamp AT TIME ZONE 'Asia/Kolkata') as day,
// //         MAX(io_value::numeric) as max_fuel,
// //         MIN(io_value::numeric) as min_fuel,
// //         ROUND((MAX(io_value::numeric) - MIN(io_value::numeric)) * 0.1, 2) as daily_fuel
// //       FROM io_records
// //       WHERE device_id = $1
// //         AND io_id = 107
// //         AND ${timeFilter}
// //         AND io_value::numeric > 0
// //       GROUP BY DATE(timestamp AT TIME ZONE 'Asia/Kolkata')
// //       ORDER BY day DESC
// //     `;

// //     const [mileageResult, fuelResult] = await Promise.all([
// //       query(mileageQuery, mileageParams),
// //       query(fuelQuery, fuelParams),
// //     ]);

// //     // Merge by day and calculate fuel average
// //     const mileageMap = new Map(
// //       mileageResult.rows.map((r) => [r.day.toISOString().split("T")[0], r])
// //     );
// //     const fuelMap = new Map(
// //       fuelResult.rows.map((r) => [r.day.toISOString().split("T")[0], r])
// //     );

// //     const allDays = new Set([...mileageMap.keys(), ...fuelMap.keys()]);

// //     const dailyData = Array.from(allDays)
// //       .sort()
// //       .reverse()
// //       .map((day) => {
// //         const mileage = mileageMap.get(day);
// //         const fuel = fuelMap.get(day);
// //         const distanceMeters = parseFloat(mileage?.daily_distance_meters || 0);
// //         const distance = parseFloat(((distanceMeters / 1000)* 1.03).toFixed(2));
// //         const fuelConsumed = parseFloat(fuel?.daily_fuel || 0);
// //         const fuelAverage =
// //           fuelConsumed > 0 ? parseFloat((distance / fuelConsumed).toFixed(2)) : null;

// //         return {
// //           day,
// //           distance_km: distance,
// //           fuel_litres: fuelConsumed,
// //           fuel_average_kmpl: fuelAverage,
// //         };
// //       });

// //     const totalDistance = dailyData.reduce((sum, d) => sum + d.distance_km, 0);
// //     const totalFuel = dailyData.reduce((sum, d) => sum + d.fuel_litres, 0);
// //     const overallAverage =
// //       totalFuel > 0 ? parseFloat((totalDistance / totalFuel).toFixed(2)) : null;

// //     return NextResponse.json({
// //       success: true,
// //       data: dailyData,
// //       summary: {
// //         total_distance_km: parseFloat(totalDistance.toFixed(2)),
// //         total_fuel_litres: parseFloat(totalFuel.toFixed(2)),
// //         overall_fuel_average_kmpl: overallAverage,
// //         days_with_data: dailyData.length,
// //       },
// //     });
// //   } catch (error) {
// //     console.error("Analytics API error:", error);
// //     return NextResponse.json({ error: String(error) }, { status: 500 });
// //   }
// // }
// import { NextRequest, NextResponse } from "next/server";
// import { query } from "@/lib/db";

// export async function GET(request: NextRequest) {
//   const { searchParams } = new URL(request.url);
//   const device_id = searchParams.get("device_id");
//   const days = parseInt(searchParams.get("days") || "1");
//   const start_datetime = searchParams.get("start_datetime"); // ISO e.g. "2025-03-01T09:00:00+05:30"
//   const end_datetime = searchParams.get("end_datetime");     // ISO e.g. "2025-03-17T17:30:00+05:30"

//   if (!device_id) {
//     return NextResponse.json({ error: "device_id required" }, { status: 400 });
//   }

//   // Look up device type to determine correct mileage IO ID
//   const deviceResult = await query(
//     `SELECT device_type FROM devices WHERE id = $1 AND deleted_at IS NULL`,
//     [device_id]
//   );

//   if (deviceResult.rows.length === 0) {
//     return NextResponse.json({ error: "Device not found" }, { status: 404 });
//   }

//   const deviceType = deviceResult.rows[0].device_type;
//   const mileageIOId = deviceType === "FMC650" ? 216 : 16;

//   // When datetimes are provided, use a direct BETWEEN on the timestamp column.
//   // PostgreSQL will correctly interpret the +05:30 timezone offset.
//   // This also benefits from the plain timestamp index — no DATE() cast needed.
//   const useCustomRange = !!(start_datetime && end_datetime);

//   const timeFilter = useCustomRange
//     ? `timestamp BETWEEN $2::timestamptz AND $3::timestamptz`
//     : `timestamp >= NOW() - ($2 * INTERVAL '1 day')`;

//   const params = (extra: unknown[]) =>
//     useCustomRange
//       ? [device_id, start_datetime, end_datetime, ...extra]
//       : [device_id, days, ...extra];

//   try {
//     const mileageQuery = `
//       SELECT
//         DATE(timestamp AT TIME ZONE 'Asia/Kolkata') as day,
//         MAX(io_value::numeric) - MIN(io_value::numeric) as daily_distance_meters
//       FROM io_records
//       WHERE device_id = $1
//         AND io_id = ${mileageIOId}
//         AND ${timeFilter}
//         AND io_value::numeric > 0
//       GROUP BY DATE(timestamp AT TIME ZONE 'Asia/Kolkata')
//       ORDER BY day DESC
//     `;

//     const fuelQuery = `
//       SELECT
//         DATE(timestamp AT TIME ZONE 'Asia/Kolkata') as day,
//         ROUND((MAX(io_value::numeric) - MIN(io_value::numeric)) * 0.1, 2) as daily_fuel
//       FROM io_records
//       WHERE device_id = $1
//         AND io_id = 107
//         AND ${timeFilter}
//         AND io_value::numeric > 0
//       GROUP BY DATE(timestamp AT TIME ZONE 'Asia/Kolkata')
//       ORDER BY day DESC
//     `;

//     const [mileageResult, fuelResult] = await Promise.all([
//       query(mileageQuery, params([])),
//       query(fuelQuery, params([])),
//     ]);

//     const mileageMap = new Map(
//       mileageResult.rows.map((r) => [r.day.toISOString().split("T")[0], r])
//     );
//     const fuelMap = new Map(
//       fuelResult.rows.map((r) => [r.day.toISOString().split("T")[0], r])
//     );

//     const allDays = new Set([...mileageMap.keys(), ...fuelMap.keys()]);

//     const dailyData = Array.from(allDays)
//       .sort()
//       .reverse()
//       .map((day) => {
//         const mileage = mileageMap.get(day);
//         const fuel = fuelMap.get(day);
//         const distanceMeters = parseFloat(mileage?.daily_distance_meters || 0);
//         // +3% correction factor
//         const distance = parseFloat(((distanceMeters / 1000) * 1.03).toFixed(2));
//         const fuelConsumed = parseFloat(fuel?.daily_fuel || 0);
//         const fuelAverage =
//           fuelConsumed > 0 ? parseFloat((distance / fuelConsumed).toFixed(2)) : null;
//         return { day, distance_km: distance, fuel_litres: fuelConsumed, fuel_average_kmpl: fuelAverage };
//       });

//     const totalDistance = dailyData.reduce((sum, d) => sum + d.distance_km, 0);
//     const totalFuel = dailyData.reduce((sum, d) => sum + d.fuel_litres, 0);
//     const overallAverage =
//       totalFuel > 0 ? parseFloat((totalDistance / totalFuel).toFixed(2)) : null;

//     return NextResponse.json({
//       success: true,
//       data: dailyData,
//       summary: {
//         total_distance_km: parseFloat(totalDistance.toFixed(2)),
//         total_fuel_litres: parseFloat(totalFuel.toFixed(2)),
//         overall_fuel_average_kmpl: overallAverage,
//         days_with_data: dailyData.length,
//       },
//     });
//   } catch (error) {
//     console.error("Analytics API error:", error);
//     return NextResponse.json({ error: String(error) }, { status: 500 });
//   }
// }
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const device_id = searchParams.get("device_id");
  const days = parseInt(searchParams.get("days") || "1");
  const start_datetime = searchParams.get("start_datetime"); // ISO e.g. "2025-03-01T09:00:00+05:30"
  const end_datetime = searchParams.get("end_datetime");     // ISO e.g. "2025-03-17T17:30:00+05:30"

  if (!device_id) {
    return NextResponse.json({ error: "device_id required" }, { status: 400 });
  }

  // Look up device type to determine correct mileage IO ID
  const deviceResult = await query(
    `SELECT device_type FROM devices WHERE id = $1 AND deleted_at IS NULL`,
    [device_id]
  );

  if (deviceResult.rows.length === 0) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  const deviceType = deviceResult.rows[0].device_type;
  const mileageIOId = deviceType === "FMC650" ? 216 : 16;
  const isFMB150 = deviceType === "FMB150";

  // When datetimes are provided, use a direct BETWEEN on the timestamp column.
  // PostgreSQL will correctly interpret the +05:30 timezone offset.
  // This also benefits from the plain timestamp index — no DATE() cast needed.
  const useCustomRange = !!(start_datetime && end_datetime);

  const timeFilter = useCustomRange
    ? `timestamp BETWEEN $2::timestamptz AND $3::timestamptz`
    : `timestamp >= NOW() - ($2 * INTERVAL '1 day')`;

  // Same filter but with `f.` prefix for queries that alias io_records as `f`
  const timeFilterF = useCustomRange
    ? `f.timestamp BETWEEN $2::timestamptz AND $3::timestamptz`
    : `f.timestamp >= NOW() - ($2 * INTERVAL '1 day')`;

  const params = (extra: unknown[]) =>
    useCustomRange
      ? [device_id, start_datetime, end_datetime, ...extra]
      : [device_id, days, ...extra];

  try {
    const mileageQuery = `
      SELECT
        DATE(timestamp AT TIME ZONE 'Asia/Kolkata') as day,
        MAX(io_value::numeric) - MIN(io_value::numeric) as daily_distance_meters
      FROM io_records
      WHERE device_id = $1
        AND io_id = ${mileageIOId}
        AND ${timeFilter}
        AND io_value::numeric > 0
      GROUP BY DATE(timestamp AT TIME ZONE 'Asia/Kolkata')
      ORDER BY day DESC
    `;

    const fuelQuery = `
      SELECT
        DATE(timestamp AT TIME ZONE 'Asia/Kolkata') as day,
        ROUND((MAX(io_value::numeric) - MIN(io_value::numeric)) * 0.1, 2) as daily_fuel
      FROM io_records
      WHERE device_id = $1
        AND io_id = 107
        AND ${timeFilter}
        AND io_value::numeric > 0
      GROUP BY DATE(timestamp AT TIME ZONE 'Asia/Kolkata')
      ORDER BY day DESC
    `;

    // CAN fuel rate (io_id=18) method — only used for FMB150 devices.
    // Per day: avg L/h across engine-ON records (io_value < 60000 sentinel),
    //          times engine-on hours (sum of gaps between consecutive engine-ON
    //          records, capped at 300s to ignore long outages).
    const canFuelQuery = `
      WITH engine_on AS (
        SELECT
          timestamp,
          DATE(timestamp AT TIME ZONE 'Asia/Kolkata') as day
        FROM io_records
        WHERE device_id = $1
          AND io_id = 1
          AND io_value::numeric = 1
          AND ${timeFilter}
      ),
      engine_intervals AS (
        SELECT
          day,
          EXTRACT(EPOCH FROM (
            LEAD(timestamp) OVER (PARTITION BY day ORDER BY timestamp) - timestamp
          )) as interval_secs
        FROM engine_on
      ),
      engine_hours AS (
        SELECT
          day,
          SUM(interval_secs) / 3600.0 as engine_on_hours
        FROM engine_intervals
        WHERE interval_secs > 0 AND interval_secs <= 300
        GROUP BY day
      ),
      fuel_rate AS (
        SELECT
          DATE(f.timestamp AT TIME ZONE 'Asia/Kolkata') as day,
          AVG(f.io_value::numeric * 0.1) as avg_lph,
          COUNT(*) as readings
        FROM io_records f
        JOIN io_records d
          ON f.device_id = d.device_id
         AND f.timestamp = d.timestamp
         AND d.io_id = 1
         AND d.io_value::numeric = 1
        WHERE f.device_id = $1
          AND f.io_id = 18
          AND f.io_value::numeric < 60000
          AND ${timeFilterF}
        GROUP BY DATE(f.timestamp AT TIME ZONE 'Asia/Kolkata')
      )
      SELECT
        COALESCE(h.day, r.day) as day,
        ROUND((COALESCE(h.engine_on_hours, 0) * COALESCE(r.avg_lph, 0))::numeric, 2) as daily_fuel,
        r.readings
      FROM engine_hours h
      FULL OUTER JOIN fuel_rate r ON h.day = r.day
      ORDER BY day DESC
    `;

    const queryPromises: Promise<{ rows: Array<Record<string, unknown>> }>[] = [
      query(mileageQuery, params([])),
      query(fuelQuery, params([])),
    ];

    if (isFMB150) {
      queryPromises.push(query(canFuelQuery, params([])));
    }

    const results = await Promise.all(queryPromises);
    const mileageResult = results[0];
    const fuelResult = results[1];
    const canFuelResult = isFMB150 ? results[2] : null;

    const mileageMap = new Map(
      mileageResult.rows.map((r) => [(r.day as Date).toISOString().split("T")[0], r])
    );
    const fuelMap = new Map(
      fuelResult.rows.map((r) => [(r.day as Date).toISOString().split("T")[0], r])
    );
    // Only include CAN-rate days that actually have io_id=18 readings
    // (readings > 0). Otherwise we'd overwrite valid fuel-level data with zeros.
    const canFuelMap = new Map(
      (canFuelResult?.rows ?? [])
        .filter((r) => {
          const readings = parseInt(String(r.readings ?? 0));
          return readings > 0;
        })
        .map((r) => [(r.day as Date).toISOString().split("T")[0], r])
    );

    const allDays = new Set([
      ...mileageMap.keys(),
      ...fuelMap.keys(),
      ...canFuelMap.keys(),
    ]);

    const dailyData = Array.from(allDays)
      .sort()
      .reverse()
      .map((day) => {
        const mileage = mileageMap.get(day);
        const fuel = fuelMap.get(day);
        const canFuel = canFuelMap.get(day);

        const distanceMeters = parseFloat(String(mileage?.daily_distance_meters ?? 0));
        // +3% correction factor
        const distance = parseFloat(((distanceMeters / 1000) * 1.03).toFixed(2));

        // Prefer CAN fuel rate method when available (FMB150 with io_id=18 data).
        // Fall back to fuel-level-drop method (io_id=107) otherwise.
        const canFuelConsumed = canFuel ? parseFloat(String(canFuel.daily_fuel ?? 0)) : 0;
        const levelFuelConsumed = parseFloat(String(fuel?.daily_fuel ?? 0));
        const fuelConsumed = canFuelConsumed > 0 ? canFuelConsumed : levelFuelConsumed;

        const fuelAverage =
          fuelConsumed > 0 ? parseFloat((distance / fuelConsumed).toFixed(2)) : null;

        return {
          day,
          distance_km: distance,
          fuel_litres: fuelConsumed,
          fuel_average_kmpl: fuelAverage,
        };
      });

    const totalDistance = dailyData.reduce((sum, d) => sum + d.distance_km, 0);
    const totalFuel = dailyData.reduce((sum, d) => sum + d.fuel_litres, 0);
    const overallAverage =
      totalFuel > 0 ? parseFloat((totalDistance / totalFuel).toFixed(2)) : null;

    return NextResponse.json({
      success: true,
      data: dailyData,
      summary: {
        total_distance_km: parseFloat(totalDistance.toFixed(2)),
        total_fuel_litres: parseFloat(totalFuel.toFixed(2)),
        overall_fuel_average_kmpl: overallAverage,
        days_with_data: dailyData.length,
      },
    });
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}