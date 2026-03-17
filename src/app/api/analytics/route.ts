// // import { NextRequest, NextResponse } from "next/server";
// // import { query } from "@/lib/db";

// // export async function GET(request: NextRequest) {
// //   const { searchParams } = new URL(request.url);
// //   const device_id = searchParams.get("device_id");
// //   const days = parseInt(searchParams.get("days") || "1");

// //   if (!device_id) {
// //     return NextResponse.json({ error: "device_id required" }, { status: 400 });
// //   }

// //   try {
// //     // Get daily mileage — IO 105 is vehicle.mileage (cumulative odometer in km)
// //     // We take MAX - MIN per day to get distance travelled that day
// //     const mileageQuery = `
// //       SELECT 
// //         DATE(timestamp AT TIME ZONE 'Asia/Kolkata') as day,
// //         MAX(io_value::numeric) as max_mileage,
// //         MIN(io_value::numeric) as min_mileage,
// //         MAX(io_value::numeric) - MIN(io_value::numeric) as daily_distance_meters
// //       FROM io_records
// //       WHERE device_id = $1
// //         AND io_id = 16
// //         AND timestamp >= NOW() - ($2 * INTERVAL '1 day')
// //         AND io_value::numeric > 0
// //       GROUP BY DATE(timestamp AT TIME ZONE 'Asia/Kolkata')
// //       ORDER BY day DESC
// //     `;

// //     // Get daily fuel consumed — IO 392 (FMB150) or IO 405 (FMC650)
// //     // Also cumulative, so MAX - MIN per day
// //     const fuelQuery = `
// //       SELECT 
// //         DATE(timestamp AT TIME ZONE 'Asia/Kolkata') as day,
// //         MAX(io_value::numeric) as max_fuel,
// //         MIN(io_value::numeric) as min_fuel,
// //         ROUND((MAX(io_value::numeric) - MIN(io_value::numeric)) * 0.1, 2) as daily_fuel
// //       FROM io_records
// //       WHERE device_id = $1
// //         AND io_id = 107
// //         AND timestamp >= NOW() - ($2 * INTERVAL '1 day')
// //         AND io_value::numeric > 0
// //       GROUP BY DATE(timestamp AT TIME ZONE 'Asia/Kolkata')
// //       ORDER BY day DESC
// //     `;

// //     const [mileageResult, fuelResult] = await Promise.all([
// //         query(mileageQuery, [device_id, days]),
// //         query(fuelQuery, [device_id, days]),
// //       ]);

// //     // Merge by day and calculate fuel average
// //     const mileageMap = new Map(
// //       mileageResult.rows.map((r) => [r.day.toISOString().split("T")[0], r])
// //     );
// //     const fuelMap = new Map(
// //       fuelResult.rows.map((r) => [r.day.toISOString().split("T")[0], r])
// //     );

// //     // Get all unique days
// //     const allDays = new Set([...mileageMap.keys(), ...fuelMap.keys()]);

// //     const dailyData = Array.from(allDays)
// //       .sort()
// //       .reverse()
// //       .map((day) => {
// //         const mileage = mileageMap.get(day);
// //         const fuel = fuelMap.get(day);
// //         const distanceMeters = parseFloat(mileage?.daily_distance_meters || 0);
// //         const distance = parseFloat((distanceMeters / 1000).toFixed(2));
// //         const fuelConsumed = parseFloat(fuel?.daily_fuel || 0);
// //         // Fuel average = km per litre
// //         const fuelAverage =
// //           fuelConsumed > 0 ? parseFloat((distance / fuelConsumed).toFixed(2)) : null;

// //         return {
// //           day,
// //           distance_km: distance,
// //           fuel_litres: fuelConsumed,
// //           fuel_average_kmpl: fuelAverage, // km per litre
// //         };
// //       });

// //     // Totals
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
//   const start_date = searchParams.get("start_date"); // e.g. "2025-03-01"
//   const end_date = searchParams.get("end_date");     // e.g. "2025-03-17"

//   if (!device_id) {
//     return NextResponse.json({ error: "device_id required" }, { status: 400 });
//   }

//   // Build the time filter clause depending on which params were provided
//   const useCustomRange = start_date && end_date;

//   // For custom range: filter by date in IST
//   // For preset days: use the existing rolling window
//   const timeFilter = useCustomRange
//     ? `DATE(timestamp AT TIME ZONE 'Asia/Kolkata') BETWEEN $2 AND $3`
//     : `timestamp >= NOW() - ($2 * INTERVAL '1 day')`;

//   // Params change shape based on mode
//   const mileageParams = useCustomRange
//     ? [device_id, start_date, end_date]
//     : [device_id, days];

//   const fuelParams = useCustomRange
//     ? [device_id, start_date, end_date]
//     : [device_id, days];

//   try {
//     const mileageQuery = `
//       SELECT 
//         DATE(timestamp AT TIME ZONE 'Asia/Kolkata') as day,
//         MAX(io_value::numeric) as max_mileage,
//         MIN(io_value::numeric) as min_mileage,
//         MAX(io_value::numeric) - MIN(io_value::numeric) as daily_distance_meters
//       FROM io_records
//       WHERE device_id = $1
//         AND io_id = 16
//         AND ${timeFilter}
//         AND io_value::numeric > 0
//       GROUP BY DATE(timestamp AT TIME ZONE 'Asia/Kolkata')
//       ORDER BY day DESC
//     `;

//     const fuelQuery = `
//       SELECT 
//         DATE(timestamp AT TIME ZONE 'Asia/Kolkata') as day,
//         MAX(io_value::numeric) as max_fuel,
//         MIN(io_value::numeric) as min_fuel,
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
//       query(mileageQuery, mileageParams),
//       query(fuelQuery, fuelParams),
//     ]);

//     // Merge by day and calculate fuel average
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
//         const distance = parseFloat(((distanceMeters / 1000)* 1.03).toFixed(2));
//         const fuelConsumed = parseFloat(fuel?.daily_fuel || 0);
//         const fuelAverage =
//           fuelConsumed > 0 ? parseFloat((distance / fuelConsumed).toFixed(2)) : null;

//         return {
//           day,
//           distance_km: distance,
//           fuel_litres: fuelConsumed,
//           fuel_average_kmpl: fuelAverage,
//         };
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

  // When datetimes are provided, use a direct BETWEEN on the timestamp column.
  // PostgreSQL will correctly interpret the +05:30 timezone offset.
  // This also benefits from the plain timestamp index — no DATE() cast needed.
  const useCustomRange = !!(start_datetime && end_datetime);

  const timeFilter = useCustomRange
    ? `timestamp BETWEEN $2::timestamptz AND $3::timestamptz`
    : `timestamp >= NOW() - ($2 * INTERVAL '1 day')`;

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
        AND io_id = 16
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

    const [mileageResult, fuelResult] = await Promise.all([
      query(mileageQuery, params([])),
      query(fuelQuery, params([])),
    ]);

    const mileageMap = new Map(
      mileageResult.rows.map((r) => [r.day.toISOString().split("T")[0], r])
    );
    const fuelMap = new Map(
      fuelResult.rows.map((r) => [r.day.toISOString().split("T")[0], r])
    );

    const allDays = new Set([...mileageMap.keys(), ...fuelMap.keys()]);

    const dailyData = Array.from(allDays)
      .sort()
      .reverse()
      .map((day) => {
        const mileage = mileageMap.get(day);
        const fuel = fuelMap.get(day);
        const distanceMeters = parseFloat(mileage?.daily_distance_meters || 0);
        // +3% correction factor
        const distance = parseFloat(((distanceMeters / 1000) * 1.03).toFixed(2));
        const fuelConsumed = parseFloat(fuel?.daily_fuel || 0);
        const fuelAverage =
          fuelConsumed > 0 ? parseFloat((distance / fuelConsumed).toFixed(2)) : null;
        return { day, distance_km: distance, fuel_litres: fuelConsumed, fuel_average_kmpl: fuelAverage };
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