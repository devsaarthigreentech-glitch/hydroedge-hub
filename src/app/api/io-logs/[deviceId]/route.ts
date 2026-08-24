// // ============================================================================
// // API ROUTE: /api/io-logs/[deviceId]
// // GET - Fetch IO records filtered by io_id(s) and time range
// // ============================================================================

// import { NextRequest, NextResponse } from 'next/server';
// import { query } from '@/lib/db';

// export async function GET(
//   request: NextRequest,
//   context: { params: Promise<{ deviceId: string }> }
// ) {
//   try {
//     const { deviceId } = await context.params;
//     const searchParams = request.nextUrl.searchParams;

//     const ioIdsParam = searchParams.get('io_ids');   // comma-separated: "1,216,24"
//     const startTime = searchParams.get('start');      // ISO string (UTC)
//     const endTime = searchParams.get('end');          // ISO string (UTC)

//     if (!ioIdsParam) {
//       return NextResponse.json(
//         { success: false, error: 'io_ids parameter is required' },
//         { status: 400 }
//       );
//     }

//     if (!startTime || !endTime) {
//       return NextResponse.json(
//         { success: false, error: 'start and end parameters are required' },
//         { status: 400 }
//       );
//     }

//     const ioIds = ioIdsParam.split(',').map(Number).filter(n => !isNaN(n));

//     if (ioIds.length === 0) {
//       return NextResponse.json(
//         { success: false, error: 'No valid io_ids provided' },
//         { status: 400 }
//       );
//     }

//     if (ioIds.length > 10) {
//       return NextResponse.json(
//         { success: false, error: 'Maximum 10 IO parameters at once' },
//         { status: 400 }
//       );
//     }

//     // Validate time range isn't too wide (max 7 days)
//     const start = new Date(startTime);
//     const end = new Date(endTime);
//     const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

//     if (diffDays > 7) {
//       return NextResponse.json(
//         { success: false, error: 'Time range cannot exceed 7 days' },
//         { status: 400 }
//       );
//     }

//     const sql = `
//       SELECT io_id, io_value, timestamp
//       FROM io_records
//       WHERE device_id = $1
//         AND io_id = ANY($2::int[])
//         AND timestamp >= $3
//         AND timestamp <= $4
//         AND timestamp > '2025-01-01'
//       ORDER BY timestamp DESC
//       LIMIT 1000
//     `;

//     const result = await query(sql, [deviceId, ioIds, startTime, endTime]);

//     return NextResponse.json({
//       success: true,
//       data: result.rows,
//       count: result.rowCount,
//     });

//   } catch (error: any) {
//     console.error('IO Logs fetch error:', error);
//     return NextResponse.json(
//       { success: false, error: 'Failed to fetch IO logs', message: error.message },
//       { status: 500 }
//     );
//   }
// }
// ============================================================================
// API ROUTE: /api/io-logs/[deviceId]
// GET - Fetch IO records filtered by io_id(s) and time range
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { archiveQuery, planLogSources } from '@/lib/archive-db';

// Kept as a constant because the merge below re-applies it: two sources each
// capped at N, concatenated, re-sorted, then trimmed back to N.
const ROW_LIMIT = 1000;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await context.params;
    const searchParams = request.nextUrl.searchParams;

    const ioIdsParam = searchParams.get('io_ids');   // comma-separated: "1,216,24"
    const startTime = searchParams.get('start');      // ISO string (UTC)
    const endTime = searchParams.get('end');          // ISO string (UTC)

    if (!ioIdsParam) {
      return NextResponse.json(
        { success: false, error: 'io_ids parameter is required' },
        { status: 400 }
      );
    }

    if (!startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: 'start and end parameters are required' },
        { status: 400 }
      );
    }

    const ioIds = ioIdsParam.split(',').map(Number).filter(n => !isNaN(n));

    if (ioIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid io_ids provided' },
        { status: 400 }
      );
    }

    if (ioIds.length > 10) {
      return NextResponse.json(
        { success: false, error: 'Maximum 10 IO parameters at once' },
        { status: 400 }
      );
    }

    // Validate time range isn't too wide (max 7 days)
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays > 7) {
      return NextResponse.json(
        { success: false, error: 'Time range cannot exceed 7 days' },
        { status: 400 }
      );
    }

    // const sql = `
    //   SELECT io_id, io_value, timestamp
    //   FROM io_records
    //   WHERE device_id = $1
    //     AND io_id = ANY($2::int[])
    //     AND timestamp >= $3
    //     AND timestamp <= $4
    //     AND timestamp > '2025-01-01'
    //   ORDER BY timestamp DESC
    //   LIMIT 1000
    // `;

    // const result = await query(sql, [deviceId, ioIds, startTime, endTime]);

    const minVal = searchParams.get('min');
    const maxVal = searchParams.get('max');

    let sql = `
      SELECT io_id, io_value, timestamp
      FROM io_records
      WHERE device_id = $1
        AND io_id = ANY($2::int[])
        AND timestamp >= $3
        AND timestamp <= $4
        AND timestamp > '2025-01-01'
    `;

    const sqlParams: any[] = [deviceId, ioIds, startTime, endTime];
    let paramIdx = 5;

    if (minVal !== null && minVal !== '') {
      sql += ` AND io_value::numeric >= $${paramIdx}`;
      sqlParams.push(parseFloat(minVal));
      paramIdx++;
    }

    if (maxVal !== null && maxVal !== '') {
      sql += ` AND io_value::numeric <= $${paramIdx}`;
      sqlParams.push(parseFloat(maxVal));
      paramIdx++;
    }

    sql += ` ORDER BY timestamp DESC LIMIT ${ROW_LIMIT}`;

    // ── Which database holds this window? ─────────────────────────────────
    // Early raw history for a few devices lives on the archive box and was never
    // imported here (see src/lib/archive-db.ts). For everything else, and for
    // every device not explicitly listed, this resolves to production alone and
    // behaves exactly as it did before.
    const sources = planLogSources(deviceId, start, end);

    const runs: Promise<{ rows: any[] }>[] = [];
    if (sources.primary) runs.push(query(sql, sqlParams));
    if (sources.archive) {
      runs.push(
        // Fail loudly rather than returning the production half on its own. A
        // silently truncated log looks like "no data in that period", which is
        // indistinguishable from a real gap — and there IS a real gap around the
        // cutover, so the two must not be allowed to blur.
        archiveQuery(sql, sqlParams).catch((err: any) => {
          throw new Error(`archive database unreachable: ${err.message}`);
        })
      );
    }

    const results = await Promise.all(runs);

    // Each side is already DESC and capped at ROW_LIMIT, so the true top
    // ROW_LIMIT of the union is guaranteed to be inside the concatenation.
    const rows =
      results.length === 1
        ? results[0].rows
        : results
            .flatMap((r) => r.rows)
            .sort(
              (a, b) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            )
            .slice(0, ROW_LIMIT);

    return NextResponse.json({
      success: true,
      data: rows,
      count: rows.length,
      // Lets us tell the two paths apart in production without adding logging.
      sources: [
        ...(sources.primary ? ['primary'] : []),
        ...(sources.archive ? ['archive'] : []),
      ],
    });

  } catch (error: any) {
    console.error('IO Logs fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch IO logs', message: error.message },
      { status: 500 }
    );
  }
}