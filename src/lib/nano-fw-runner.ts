// ============================================================================
// lib/nano-fw-runner.ts — advance firmware update jobs on the server.
// ----------------------------------------------------------------------------
// Runs every few seconds from src/instrumentation.ts, whether or not any page is
// open, and picks jobs up again after an app restart. Each job is locked while
// it is stepped, so a second process or a status request cannot double-send.
// Commands go the same way as /api/nano/command: logged in nano_commands, then
// published; nano_ingest closes them from the device's t:cfg reply.
// ============================================================================

import { query, getClient } from '@/lib/db';
import { publishNanoCommand } from '@/lib/nano-mqtt';
import { FwJob, FwObservation, stepJob, FW_START_PID } from '@/lib/nano-fw-job';

const TICK_MS = 5000;
const ms = (v: any) => (v ? new Date(v).getTime() : null);

const g = globalThis as unknown as { nanoFwRunner?: NodeJS.Timeout; nanoFwRunnerErr?: string };

export function startFwRunner() {
  if (g.nanoFwRunner) return;
  g.nanoFwRunner = setInterval(() => {
    advanceFwJobs().then(
      () => { g.nanoFwRunnerErr = undefined; },
      (e) => {
        // Once per distinct error: this repeats every tick until it is fixed.
        if (g.nanoFwRunnerErr !== e.message) console.error('firmware job runner:', e.message);
        g.nanoFwRunnerErr = e.message;
      }
    );
  }, TICK_MS);
  g.nanoFwRunner.unref?.();
}

export async function advanceFwJobs(deviceId?: string) {
  const active = await query(
    `SELECT id FROM nano_fw_jobs WHERE status IN ('sending', 'running')${deviceId ? ' AND device_id = $1' : ''}`,
    deviceId ? [deviceId] : []
  );
  for (const { id } of active.rows as any[]) await advanceOne(id);
}

async function issueSet(deviceId: string, imei: string, pid: string, value: string): Promise<string> {
  const payload = { cmd: 'set', id: pid, val: pid === FW_START_PID ? true : pid === 'P-5303' ? Number(value) : value };
  const ins = await query(
    `INSERT INTO nano_commands (device_id, verb, pid, value_text, payload, issued_by, status)
     VALUES ($1, 'set', $2, $3, $4::jsonb, 'web:firmware', 'pending') RETURNING id::text AS id`,
    [deviceId, pid, value, JSON.stringify(payload)]
  );
  const id = ins.rows[0].id;
  try {
    await publishNanoCommand(imei, payload);
    await query(`UPDATE nano_commands SET status = 'sent' WHERE id::text = $1`, [id]);
  } catch (e: any) {
    await query(`UPDATE nano_commands SET status = 'failed', result_reason = $2 WHERE id::text = $1`, [id, e.message]);
  }
  return id;
}

async function advanceOne(id: string) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const r = await client.query(
      `SELECT j.*, j.step::int AS step, j.size_bytes::float8 AS size_bytes, d.imei
         FROM nano_fw_jobs j JOIN devices d ON d.id = j.device_id
        WHERE j.id = $1 AND j.status IN ('sending', 'running')
          FOR UPDATE OF j SKIP LOCKED`,
      [id]
    );
    if (r.rowCount === 0) { await client.query('COMMIT'); return; }
    const row = r.rows[0];
    const job: FwJob = {
      ...row,
      command_at: ms(row.command_at),
      started_at: ms(row.started_at),
    };

    const [cmd, state, ver] = await Promise.all([
      row.command_id
        ? query(`SELECT status, result_reason, resolved_at FROM nano_commands WHERE id::text = $1`, [row.command_id])
        : Promise.resolve({ rows: [] as any[] }),
      query(
        `SELECT s.ota_state, s.ota_progress_pct, s.ota_last_result, s.last_up, s.last_boot_id::text AS boot, f.received_at
           FROM nano_device_state s LEFT JOIN nano_frames f ON f.id = s.last_frame_id
          WHERE s.device_id = $1`,
        [row.device_id]
      ),
      query(`SELECT value_text, updated_at FROM nano_param_values WHERE device_id = $1 AND pid = 'P-104'`, [row.device_id]),
    ]);
    const c = cmd.rows[0], s = state.rows[0], v = ver.rows[0];
    const obs: FwObservation = {
      now: Date.now(),
      command: c ? { status: c.status, reason: c.result_reason, resolvedAt: ms(c.resolved_at) } : null,
      frameAt: ms(s?.received_at),
      frameUp: s?.last_up == null ? null : Number(s.last_up),
      otaState: s?.ota_state ?? null,
      otaPct: s?.ota_progress_pct ?? null,
      otaResult: s?.ota_last_result ?? null,
      bootId: s?.boot ?? null,
      version: v?.value_text ?? null,
      versionAt: ms(v?.updated_at),
    };

    const step = stepJob(job, obs);
    if (step.supersede && row.command_id) {
      await query(
        `UPDATE nano_commands SET status = 'failed', result_reason = 'no answer, sent again', resolved_at = now()
          WHERE id::text = $1 AND status IN ('pending', 'sent')`,
        [row.command_id]
      );
    }
    const patch: Record<string, unknown> = { ...step.patch };
    if (step.send) patch.command_id = await issueSet(row.device_id, row.imei, step.send.pid, step.send.value);

    const keys = Object.keys(patch);
    if (keys.length) {
      const finished = patch.status && !['sending', 'running'].includes(patch.status as string);
      const set = keys.map((k, i) => {
        // state-machine times are ms; the columns are timestamps
        const isTime = k === 'command_at' || k === 'started_at';
        return isTime ? `${k} = to_timestamp($${i + 2}::float8 / 1000)` : `${k} = $${i + 2}`;
      });
      await client.query(
        `UPDATE nano_fw_jobs SET ${set.join(', ')}, updated_at = now()${finished ? ', finished_at = now()' : ''} WHERE id = $1`,
        [id, ...keys.map((k) => patch[k])]
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
