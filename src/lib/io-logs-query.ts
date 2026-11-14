// ============================================================================
// Shared request parsing + SQL for /api/io-logs/[deviceId] and its /export.
// ----------------------------------------------------------------------------
// Both must filter identically, otherwise the CSV would silently disagree with
// the table the user just looked at.
// ============================================================================

import { MAX_RANGE_DAYS, MAX_CONDITIONS, toRawValue } from './io-params';

export type ConditionOp = 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'neq' | 'between';
export type MatchMode = 'all' | 'any';

/** One "parameter op value" test. Values are raw DB units, not display units. */
export interface LogCondition {
  ioId: number;
  op: ConditionOp;
  value: number;
  value2: number | null;   // upper bound, 'between' only
}

const SQL_OPS: Record<Exclude<ConditionOp, 'between'>, string> = {
  lt: '<', lte: '<=', gt: '>', gte: '>=', eq: '=', neq: '<>',
};

/** The history store has no SQL, so it applies conditions with this. */
export function testCondition(c: LogCondition, n: number): boolean {
  switch (c.op) {
    case 'lt': return n < c.value;
    case 'lte': return n <= c.value;
    case 'gt': return n > c.value;
    case 'gte': return n >= c.value;
    case 'eq': return n === c.value;
    case 'neq': return n !== c.value;
    case 'between': return n >= c.value && n <= (c.value2 ?? c.value);
  }
}

/**
 * Parses `where=9:lt:0.2,1:eq:1` (io_id:op:value[:value2], display units) into
 * raw-unit conditions.
 */
function parseConditions(where: string | null): LogCondition[] | { error: string } {
  if (!where || !where.trim()) return [];
  const parts = where.split(',');
  if (parts.length > MAX_CONDITIONS) return { error: `Maximum ${MAX_CONDITIONS} conditions at once` };

  const out: LogCondition[] = [];
  for (const part of parts) {
    const [idStr, op, a, b] = part.split(':');
    const ioId = Number(idStr);
    const value = parseFloat(a);
    if (!Number.isInteger(ioId) || isNaN(value)) return { error: `Invalid condition "${part}"` };
    if (op === 'between') {
      const value2 = parseFloat(b);
      if (isNaN(value2)) return { error: `Invalid condition "${part}"` };
      out.push({
        ioId, op,
        value: toRawValue(ioId, Math.min(value, value2)),
        value2: toRawValue(ioId, Math.max(value, value2)),
      });
    } else if (op in SQL_OPS) {
      out.push({ ioId, op: op as ConditionOp, value: toRawValue(ioId, value), value2: null });
    } else {
      return { error: `Invalid condition "${part}"` };
    }
  }
  return out;
}

export interface LogQuery {
  ioIds: number[];
  start: Date;
  end: Date;
  min: number | null;
  max: number | null;
  /** Only timestamps where these hold (all or any of them) are returned. */
  conditions: LogCondition[];
  match: MatchMode;
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

  const conditions = parseConditions(sp.get('where'));
  if ('error' in conditions) return conditions;
  const match: MatchMode = sp.get('match') === 'any' ? 'any' : 'all';

  return { ioIds, start, end, min, max, conditions, match };
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

  // Each IO is its own row, so "ain.1 < 0.2 AND din.1 = 1" cannot be a plain
  // WHERE. Find the timestamps whose record satisfies the conditions, then keep
  // the requested IOs at those timestamps (all IOs of a record share one).
  if (q.conditions.length) {
    params.push([...new Set(q.conditions.map((c) => c.ioId))]);
    const idsIdx = params.length;
    const tests = q.conditions.map((c) => {
      params.push(c.ioId);
      const io = params.length;
      params.push(c.value);
      let cmp: string;
      if (c.op === 'between') {
        params.push(c.value2);
        cmp = `BETWEEN $${params.length - 1}::numeric AND $${params.length}::numeric`;
      } else {
        cmp = `${SQL_OPS[c.op]} $${params.length}::numeric`;
      }
      return `bool_or(c.io_id = $${io}::int AND c.io_value::numeric ${cmp})`;
    });
    sql += `
        AND timestamp IN (
          SELECT c.timestamp
          FROM io_records c
          WHERE c.device_id = $1
            AND c.io_id = ANY($${idsIdx}::int[])
            AND c.timestamp >= $3
            AND c.timestamp <= $4
          GROUP BY c.timestamp
          HAVING ${tests.join(q.match === 'any' ? ' OR ' : ' AND ')}
        )`;
  }
  return { sql, params };
}
