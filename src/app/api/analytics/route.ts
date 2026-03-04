import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const device_id = searchParams.get("device_id");
  const days = parseInt(searchParams.get("days") || "7");

  if (!device_id) {
    return NextResponse.json({ error: "device_id required" }, { status: 400 });
  }

  try {
    // Get daily mileage — IO 105 is vehicle.mileage (cumulative odometer in km)
    // We take MAX - MIN per day to get distance travelled that day
    const mileageQuery = `
      SELECT 
        DATE(timestamp AT TIME ZONE 'Asia/Kolkata') as day,
        MAX(value::numeric) as max_mileage,
        MIN(value::numeric) as min_mileage,
        MAX(value::numeric) - MIN(value::numeric) as daily_distance
      FROM io_records
      WHERE device_id = $1
        AND io_id = 105
        AND timestamp >= NOW() - ($2 * INTERVAL '1 day')
        AND value::numeric > 0
      GROUP BY DATE(timestamp AT TIME ZONE 'Asia/Kolkata')
      ORDER BY day DESC
    `;

    // Get daily fuel consumed — IO 392 (FMB150) or IO 405 (FMC650)
    // Also cumulative, so MAX - MIN per day
    const fuelQuery = `
      SELECT 
        DATE(timestamp AT TIME ZONE 'Asia/Kolkata') as day,
        MAX(value::numeric) as max_fuel,
        MIN(value::numeric) as min_fuel,
        ROUND((MAX(value::numeric) - MIN(value::numeric)) * 0.1, 2) as daily_fuel
      FROM io_records
      WHERE device_id = $1
        AND io_id IN (392, 405)
        AND timestamp >= NOW() - ($2 * INTERVAL '1 day')
        AND value::numeric > 0
      GROUP BY DATE(timestamp AT TIME ZONE 'Asia/Kolkata')
      ORDER BY day DESC
    `;

    const [mileageResult, fuelResult] = await Promise.all([
        query(mileageQuery, [device_id, days]),
        query(fuelQuery, [device_id, days]),
      ]);

    // Merge by day and calculate fuel average
    const mileageMap = new Map(
      mileageResult.rows.map((r) => [r.day.toISOString().split("T")[0], r])
    );
    const fuelMap = new Map(
      fuelResult.rows.map((r) => [r.day.toISOString().split("T")[0], r])
    );

    // Get all unique days
    const allDays = new Set([...mileageMap.keys(), ...fuelMap.keys()]);

    const dailyData = Array.from(allDays)
      .sort()
      .reverse()
      .map((day) => {
        const mileage = mileageMap.get(day);
        const fuel = fuelMap.get(day);
        const distance = parseFloat(mileage?.daily_distance || 0);
        const fuelConsumed = parseFloat(fuel?.daily_fuel || 0);
        // Fuel average = km per litre
        const fuelAverage =
          fuelConsumed > 0 ? parseFloat((distance / fuelConsumed).toFixed(2)) : null;

        return {
          day,
          distance_km: parseFloat(distance.toFixed(2)),
          fuel_litres: fuelConsumed,
          fuel_average_kmpl: fuelAverage, // km per litre
        };
      });

    // Totals
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