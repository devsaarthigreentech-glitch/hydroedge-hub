// ============================================================================
// API ROUTE: /api/io-logs/[deviceId]/export
// GET - Every IO record in the window as CSV (no row cap)
// ----------------------------------------------------------------------------
// Same filters as /api/io-logs/[deviceId]. Output is one row per timestamp
// (IST), one column per requested parameter, oldest first, values scaled as in
// the table.
//
// The window is read in CHUNK_MS slices and streamed out as it goes, so a month
// of data never sits in memory at once and each query stays well inside the
// pool's 15s statement_timeout.
//
// If any slice fails the stream is errored rather than ended, so the browser's
// download fails instead of saving a file that looks complete but isn't.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { archiveQuery, planLogSources } from '@/lib/archive-db';
import { parseLogQuery, buildLogSql, type LogQuery } from '@/lib/io-logs-query';
import { paramLabel, formatIOValue } from '@/lib/io-params';
import { csvRow, CSV_BOM, formatISTForCSV } from '@/lib/csv';

const CHUNK_MS = 6 * 60 * 60 * 1000;

interface Row { io_id: number; io_value: string; timestamp: Date | string }

async function fetchSlice(deviceId: string, q: LogQuery, from: Date, to: Date): Promise<Row[]> {
  const { sql, params } = buildLogSql(deviceId, q, from, to);
  const ordered = sql + ' ORDER BY timestamp ASC';
  const sources = planLogSources(deviceId, from, to);

  const runs: Promise<{ rows: Row[] }>[] = [];
  if (sources.primary) runs.push(query(ordered, params));
  if (sources.archive) {
    runs.push(
      archiveQuery(ordered, params).catch((err: any) => {
        throw new Error(`archive database unreachable: ${err.message}`);
      }) as Promise<{ rows: Row[] }>
    );
  }
  const results = await Promise.all(runs);
  const rows = results.flatMap((r) => r.rows);
  if (results.length > 1) {
    rows.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
  return rows;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ deviceId: string }> }
) {
  const { deviceId } = await context.params;
  const q = parseLogQuery(request.nextUrl.searchParams);
  if ('error' in q) {
    return NextResponse.json({ success: false, error: q.error }, { status: 400 });
  }

  const encoder = new TextEncoder();
  let cursor = q.start.getTime();
  const endMs = q.end.getTime();
  let started = false;

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        if (!started) {
          started = true;
          controller.enqueue(encoder.encode(
            CSV_BOM + csvRow(['Timestamp (IST)', ...q.ioIds.map(paramLabel)])
          ));
          return;
        }
        if (cursor > endMs) {
          controller.close();
          return;
        }

        // Slices are inclusive at both ends, so step 1 ms past each one.
        const from = new Date(cursor);
        const to = new Date(Math.min(cursor + CHUNK_MS - 1, endMs));
        cursor = to.getTime() + 1;

        const rows = await fetchSlice(deviceId, q, from, to);

        // Rows are ASC, so a timestamp's values are contiguous. A record never
        // spans two slices because all its IOs share one timestamp.
        let out = '';
        let curTs: number | null = null;
        let vals = new Map<number, string>();
        const flush = () => {
          if (curTs === null) return;
          out += csvRow([formatISTForCSV(new Date(curTs)), ...q.ioIds.map((id) => vals.get(id) ?? '')]);
        };
        for (const r of rows) {
          const ts = new Date(r.timestamp).getTime();
          if (ts !== curTs) {
            flush();
            curTs = ts;
            vals = new Map();
          }
          vals.set(r.io_id, formatIOValue(r.io_id, String(r.io_value)));
        }
        flush();

        if (out) controller.enqueue(encoder.encode(out));
      } catch (err: any) {
        console.error('IO Logs export error:', err);
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="io-logs-${deviceId}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
