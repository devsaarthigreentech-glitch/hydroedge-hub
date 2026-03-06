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
    // ── Step 1: Get ignition events (IO 239) ordered by time ─────────────────
    // io_value = 1 → ignition ON, io_value = 0 → ignition OFF
    const ignitionResult = await query(
      `SELECT
         timestamp,
         io_value::int AS ignition
       FROM io_records
       WHERE device_id = $1
         AND io_id = 239
         AND timestamp >= NOW() - ($2 * INTERVAL '1 day')
       ORDER BY timestamp ASC`,
      [device_id, days]
    );

    const ignitionEvents = ignitionResult.rows;

    if (ignitionEvents.length === 0) {
      return NextResponse.json({
        success: true,
        trips: [],
        summary: {
          total_trips: 0,
          total_distance_km: 0,
          total_duration_min: 0,
          avg_trip_distance_km: 0,
          avg_trip_duration_min: 0,
          longest_trip_km: 0,
        },
      });
    }

    // ── Step 2: Pair ignition ON → OFF into trip windows ─────────────────────
    const tripWindows: { start: Date; end: Date }[] = [];
    let tripStart: Date | null = null;

    for (const ev of ignitionEvents) {
      const ts = new Date(ev.timestamp);
      if (ev.ignition === 1 && !tripStart) {
        tripStart = ts;
      } else if (ev.ignition === 0 && tripStart) {
        // Minimum trip duration: 1 minute (filter noise)
        const durationMs = ts.getTime() - tripStart.getTime();
        if (durationMs >= 60_000) {
          tripWindows.push({ start: tripStart, end: ts });
        }
        tripStart = null;
      }
    }

    // Handle still-active trip (ignition ON, no OFF event yet)
    if (tripStart) {
      const lastEvent = new Date(ignitionEvents[ignitionEvents.length - 1].timestamp);
      const durationMs = lastEvent.getTime() - tripStart.getTime();
      if (durationMs >= 60_000) {
        tripWindows.push({ start: tripStart, end: lastEvent });
      }
    }

    // ── Step 3: For each trip window, get GPS points and calculate distance ──
    const trips = await Promise.all(
      tripWindows.map(async (window, idx) => {
        // Get GPS points in this window, filtered for quality
        const gpsResult = await query(
          `SELECT
             latitude, longitude, speed, timestamp
           FROM gps_records
           WHERE device_id = $1
             AND timestamp BETWEEN $2 AND $3
             AND latitude  BETWEEN -90  AND 90
             AND longitude BETWEEN -180 AND 180
             AND speed     BETWEEN 0    AND 300
             AND satellites >= 3
           ORDER BY timestamp ASC`,
          [device_id, window.start.toISOString(), window.end.toISOString()]
        );

        const points = gpsResult.rows;

        // ── Haversine distance calculation ───────────────────────────────────
        let distanceKm = 0;
        let maxSpeedKmh = 0;
        let speedSum = 0;
        let speedCount = 0;

        for (let i = 1; i < points.length; i++) {
          const prev = points[i - 1];
          const curr = points[i];

          // Haversine formula
          const R = 6371; // Earth radius in km
          const dLat = ((curr.latitude - prev.latitude) * Math.PI) / 180;
          const dLon = ((curr.longitude - prev.longitude) * Math.PI) / 180;
          const lat1 = (prev.latitude * Math.PI) / 180;
          const lat2 = (curr.latitude * Math.PI) / 180;

          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const segmentKm = R * c;

          // Filter out GPS jumps > 5km between consecutive points (bad data)
          if (segmentKm < 5) {
            distanceKm += segmentKm;
          }

          // Speed stats
          const spd = parseFloat(curr.speed) || 0;
          if (spd > maxSpeedKmh) maxSpeedKmh = spd;
          if (spd > 0) {
            speedSum += spd;
            speedCount++;
          }
        }

        const durationMin = Math.round(
          (window.end.getTime() - window.start.getTime()) / 60_000
        );
        const avgSpeedKmh =
          speedCount > 0 ? parseFloat((speedSum / speedCount).toFixed(1)) : 0;

        // Start/end location (first and last GPS point)
        const startPoint = points[0] || null;
        const endPoint = points[points.length - 1] || null;

        return {
          trip_number: idx + 1,
          start_time: window.start.toISOString(),
          end_time: window.end.toISOString(),
          duration_min: durationMin,
          distance_km: parseFloat(distanceKm.toFixed(2)),
          avg_speed_kmh: avgSpeedKmh,
          max_speed_kmh: parseFloat(maxSpeedKmh.toFixed(1)),
          gps_points: points.length,
          start_coords: startPoint
            ? { lat: startPoint.latitude, lon: startPoint.longitude }
            : null,
          end_coords: endPoint
            ? { lat: endPoint.latitude, lon: endPoint.longitude }
            : null,
        };
      })
    );

    // ── Step 4: Summary ───────────────────────────────────────────────────────
    const validTrips = trips.filter((t) => t.distance_km > 0);
    const totalDistance = validTrips.reduce((s, t) => s + t.distance_km, 0);
    const totalDuration = trips.reduce((s, t) => s + t.duration_min, 0);
    const longestTrip = Math.max(...validTrips.map((t) => t.distance_km), 0);

    return NextResponse.json({
      success: true,
      trips,
      summary: {
        total_trips: trips.length,
        total_distance_km: parseFloat(totalDistance.toFixed(2)),
        total_duration_min: totalDuration,
        avg_trip_distance_km:
          validTrips.length > 0
            ? parseFloat((totalDistance / validTrips.length).toFixed(2))
            : 0,
        avg_trip_duration_min:
          trips.length > 0
            ? Math.round(totalDuration / trips.length)
            : 0,
        longest_trip_km: parseFloat(longestTrip.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("Trips API error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}