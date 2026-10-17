// ============================================================================
// Shared request parsing + SQL for /api/io-logs/[deviceId] and its /export.
// ----------------------------------------------------------------------------
// Both must filter identically, otherwise the CSV would silently disagree with
// the table the user just looked at.
// ============================================================================

import { MAX_RANGE_DAYS } from './io-params';

export interface LogQuery {
  ioIds: number[];
  start: Date;
  end: Date;
  min: number | null;
  max: number | null;
}

/** Parses and validates the search params. Returns an error message on failure. */
export function parseLogQuery(sp: URLSearchParams): LogQuery | { error: string } {
  const ioIdsParam = sp.get('io_ids');   // comma-separated: "1,216,24"
  const startTime = sp.get('start');      // ISO string (UTC)
  const endTime = sp.get('end');          // ISO string (UTC)

  if (!ioIdsParam) return { error: 'io_ids parameter is required' };
  if (!startTime || !endTime) return { error: 'start and end parameters are required' };

  const ioIds = ioIdsParam.split(',').map(Number).filter(n => !isNaN(n));
  if (ioIds.length === 0) return { error: 'No valid io_ids provided' };
  if (ioIds.length > 10) return { error: 'Maximum 10 IO parameters at once' };

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return { error: 'start and end must be valid dates' };
  if (end <= start) return { error: '"To" must be after "From"' };

  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > MAX_RANGE_DAYS) return { error: `Time range cannot exceed ${MAX_RANGE_DAYS} days` };

  const num = (v: string | null) => (v === null || v.trim() === '' ? null : parseFloat(v));
  const min = num(sp.get('min'));
  const max = num(sp.get('max'));
  if ((min !== null && isNaN(min)) || (max !== null && isNaN(max))) {
    return { error: 'min and max must be numbers' };
  }

  return { ioIds, start, end, min, max };
}

/**
 * SQL for one window, inclusive at both ends ($3 <= timestamp <= $4). Callers
 * append ORDER BY / LIMIT.
 */
export function buildLogSql(
  deviceId: string, q: LogQuery, start: Date, end: Date
): { sql: string; params: any[] } {
  let sql = `
      SELECT io_id, io_value, timestamp
      FROM io_records
      WHERE device_id = $1
        AND io_id = ANY($2::int[])
        AND timestamp >= $3
        AND timestamp <= $4
        AND timestamp > '2025-01-01'
    `;
  const params: any[] = [deviceId, q.ioIds, start.toISOString(), end.toISOString()];

  if (q.min !== null) {
    params.push(q.min);
    sql += ` AND io_value::numeric >= $${params.length}`;
  }
  if (q.max !== null) {
    params.push(q.max);
    sql += ` AND io_value::numeric <= $${params.length}`;
  }
  return { sql, params };
}
