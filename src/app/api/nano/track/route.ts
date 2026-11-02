// ============================================================================
// API ROUTE: /api/nano/track?device_id=<uuid>&hours=24
// ----------------------------------------------------------------------------
// GPS track for one Nano device over the last `hours` (1..168), for the MAP
// tab. Reads the `gps` JSON of nano_frames ({fix, sat, lat, lon}) and keeps
// only frames with a lock (fix > 0) — nano_ingest.py stores the raw object for
// every frame, so a no-lock frame still carries lat/lon of 0 or stale values.
//
// The track is thinned before it is sent: a point closer than MIN_STEP_M to
// the last kept one is dropped (a parked unit reports the same spot every
// ~30 s, plus GNSS jitter), then strided down to MAX_POINTS. The last point
// always survives so the marker sits on the newest fix.
//
// Also returns the live GPS state (nano_device_state: current fix / sats) and,
// when the window has no fix at all, the most recent fix in the last 30 days
// so the map can still say where the unit was last seen.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

const MAX_FRAMES = 30000;
const MAX_POINTS = 3000;
const MIN_STEP_M = 10;

// Only cast fix when it is a plain number — older firmware has sent booleans.
const HAS_FIX = `CASE WHEN (gps->>'fix') ~ '^[0-9]+(\\.[0-9]+)?$' THEN (gps->>'fix')::numeric > 0 ELSE false END`;

function metres(a: [number, number], b: [number, number]) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function validPos(lat: number, lon: number) {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && !(lat === 0 && lon === 0);
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const deviceId = sp.get('device_id');
    let hours = parseInt(sp.get('hours') || '24');
    if (!deviceId) {
      return NextResponse.json({ success: false, error: 'device_id is required' }, { status: 400 });
    }
    if (!Number.isFinite(hours) || hours < 1) hours = 24;
    if (hours > 168) hours = 168;

    const [fr, st] = await Promise.all([
      query(
        `SELECT COALESCE(ts_utc, received_at) AS t, gps->>'lat' AS lat, gps->>'lon' AS lon, gps->>'sat' AS sat
           FROM nano_frames
          WHERE device_id = $1 AND received_at >= now() - $2::interval
            AND gps IS NOT NULL AND ${HAS_FIX}
          ORDER BY id DESC
          LIMIT ${MAX_FRAMES}`,
        [deviceId, `${hours} hours`]
      ),
      query(
        `SELECT gps_fix, gps_sat, last_lat, last_lon, last_ts_utc, updated_at
           FROM nano_device_state WHERE device_id = $1`,
        [deviceId]
      ),
    ]);

    // Oldest first for drawing; frames came newest first off the index.
    const raw = fr.rows
      .map((r: any) => ({ lat: Number(r.lat), lon: Number(r.lon), t: new Date(r.t).getTime(), sat: r.sat == null ? null : Number(r.sat) }))
      .filter((p) => validPos(p.lat, p.lon))
      .reverse();

    let kept: typeof raw = [];
    let distanceM = 0;
    for (const p of raw) {
      const prev = kept[kept.length - 1];
      if (!prev) { kept.push(p); continue; }
      const step = metres([prev.lat, prev.lon], [p.lat, p.lon]);
      if (step >= MIN_STEP_M) { kept.push(p); distanceM += step; }
    }
    // The newest fix always ends the track, even if it barely moved.
    const newest = raw[raw.length - 1];
    if (newest && kept[kept.length - 1] !== newest) kept.push(newest);

    if (kept.length > MAX_POINTS) {
      const stride = Math.ceil(kept.length / MAX_POINTS);
      const last = kept[kept.length - 1];
      kept = kept.filter((_, i) => i % stride === 0);
      if (kept[kept.length - 1] !== last) kept.push(last);
    }

    // How far the unit strayed from where it is now — "did it move" at a glance.
    let spreadM = 0;
    if (newest) {
      for (const p of kept) spreadM = Math.max(spreadM, metres([newest.lat, newest.lon], [p.lat, p.lon]));
    }

    const sats = raw.map((p) => p.sat).filter((s): s is number => s != null && Number.isFinite(s));

    // No fix in the window: fall back to the last fix in the past 30 days.
    let lastFix: { lat: number; lon: number; t: number; sat: number | null } | null = newest || null;
    if (!lastFix) {
      const lf = await query(
        `SELECT COALESCE(ts_utc, received_at) AS t, gps->>'lat' AS lat, gps->>'lon' AS lon, gps->>'sat' AS sat
           FROM nano_frames
          WHERE device_id = $1 AND received_at >= now() - interval '30 days'
            AND gps IS NOT NULL AND ${HAS_FIX}
          ORDER BY id DESC
          LIMIT 1`,
        [deviceId]
      );
      const r = lf.rows[0];
      if (r && validPos(Number(r.lat), Number(r.lon))) {
        lastFix = { lat: Number(r.lat), lon: Number(r.lon), t: new Date(r.t).getTime(), sat: r.sat == null ? null : Number(r.sat) };
      }
    }

    const s = st.rows[0];
    return NextResponse.json({
      success: true,
      data: {
        hours,
        truncated: fr.rowCount === MAX_FRAMES,
        points: kept.map((p) => [p.lat, p.lon, p.t]),
        last_fix: lastFix,
        live: s
          ? { fix: s.gps_fix, sat: s.gps_sat, lat: s.last_lat == null ? null : Number(s.last_lat), lon: s.last_lon == null ? null : Number(s.last_lon), ts: s.last_ts_utc || s.updated_at }
          : null,
        stats: {
          fixes: raw.length,
          distance_km: distanceM / 1000,
          spread_m: spreadM,
          first_t: raw[0]?.t ?? null,
          last_t: newest?.t ?? null,
          avg_sat: sats.length ? sats.reduce((a, b) => a + b, 0) / sats.length : null,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching nano track:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch nano track', message: error.message },
      { status: 500 }
    );
  }
}
