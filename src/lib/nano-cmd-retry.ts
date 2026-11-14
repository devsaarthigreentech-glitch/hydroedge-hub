// ============================================================================
// lib/nano-cmd-retry.ts — send unanswered commands again when the unit is back.
// ----------------------------------------------------------------------------
// /api/nano/command publishes a command once. A unit that is unpowered or out
// of coverage (typically: engine off) never receives it, and the row stayed
// "sent" for ever. This runs every few seconds from src/instrumentation.ts and
// publishes such a command again once the unit has been heard from since the
// last attempt, until the unit answers.
//
// What is resent: set, stop and start, from the web or typed. They put the
// unit in a state, so sending one twice is harmless, and nano_ingest closes
// the row only when the unit reports the commanded value.
//
// What is not:
// - get / getall / rs485: a read or a bus probe answered hours later is no use.
// - reboot: a restart arriving long after it was asked for would be a surprise.
// - anything issued by the firmware update job, and P-5304 from any source: the
//   job has its own retry rules, and a repeated start downloads the image again.
//
// Only the newest open command per parameter is kept. An older one for the
// same parameter is closed as replaced, so a Stop followed by a Run does not
// replay the Stop.
//
// Pure decision (decideRetry) apart from the DB and MQTT, so it can be tested
// offline.
// ============================================================================

import { query } from '@/lib/db';
import { publishNanoCommand } from '@/lib/nano-mqtt';

const TICK_MS = 10_000;

export const RETRY_VERBS = ['set', 'stop', 'start'];
export const RETRY_FIRST_WAIT_MS = 60_000;          // give the normal answer a chance
export const RETRY_GAP_MS = 60_000;                 // between attempts while the unit is online
export const RETRY_ONLINE_MS = 3 * 60_000;          // a frame this recent = the unit is there
export const RETRY_EXPIRE_MS = 7 * 24 * 3600_000;
export const RETRY_MAX_ATTEMPTS = 30;

export interface OpenCommand {
  sentAt: number;              // ms, first publish
  lastSentAt: number | null;   // ms, latest publish
  attempts: number;
}

export type RetryDecision = 'wait' | 'resend' | 'expire' | 'give_up';

/** What to do with one open command, given when the unit was last heard from. */
export function decideRetry(c: OpenCommand, lastHeardAt: number | null, now: number): RetryDecision {
  if (now - c.sentAt >= RETRY_EXPIRE_MS) return 'expire';
  if (c.attempts >= RETRY_MAX_ATTEMPTS) return 'give_up';
  const last = c.lastSentAt ?? c.sentAt;
  if (now - last < (c.attempts <= 1 ? RETRY_FIRST_WAIT_MS : RETRY_GAP_MS)) return 'wait';
  if (lastHeardAt == null || now - lastHeardAt > RETRY_ONLINE_MS) return 'wait';   // not there: keep it
  // Heard from since the last attempt: either it has just come back, or that
  // attempt was lost on the way.
  return lastHeardAt > last ? 'resend' : 'wait';
}

const g = globalThis as unknown as { nanoCmdRetry?: NodeJS.Timeout; nanoCmdRetryErr?: string; nanoCmdRetryBusy?: boolean };

export function startCmdRetry() {
  if (g.nanoCmdRetry) return;
  g.nanoCmdRetry = setInterval(() => {
    if (g.nanoCmdRetryBusy) return;
    g.nanoCmdRetryBusy = true;
    retryOpenCommands().then(
      () => { g.nanoCmdRetryErr = undefined; },
      (e) => {
        // Once per distinct error: this repeats every tick until it is fixed.
        if (g.nanoCmdRetryErr !== e.message) console.error('command retry:', e.message);
        g.nanoCmdRetryErr = e.message;
      }
    ).finally(() => { g.nanoCmdRetryBusy = false; });
  }, TICK_MS);
  g.nanoCmdRetry.unref?.();
}

const ms = (v: any) => (v ? new Date(v).getTime() : null);

export async function retryOpenCommands() {
  // An older open command for the same parameter is replaced by the newest.
  await query(
    `UPDATE nano_commands c
        SET status = 'failed', result_reason = 'replaced by a newer command before the device answered', resolved_at = now()
      WHERE c.status = 'sent' AND c.verb = ANY($1)
        AND COALESCE(c.issued_by, '') <> 'web:firmware'
        AND EXISTS (SELECT 1 FROM nano_commands n
                     WHERE n.device_id = c.device_id AND n.pid = c.pid
                       AND n.verb = ANY($1) AND n.sent_at > c.sent_at
                       AND n.status IN ('pending', 'sent', 'ok'))`,
    [RETRY_VERBS]
  );

  const open = await query(
    `SELECT c.id::text AS id, c.payload, c.sent_at, c.last_sent_at, c.attempts::int AS attempts,
            d.imei, f.received_at AS heard_at
       FROM nano_commands c
       JOIN devices d ON d.id = c.device_id AND d.deleted_at IS NULL
       LEFT JOIN nano_device_state s ON s.device_id = c.device_id
       LEFT JOIN nano_frames f ON f.id = s.last_frame_id
      WHERE c.status = 'sent' AND c.verb = ANY($1)
        AND c.pid <> 'P-5304'
        AND COALESCE(c.issued_by, '') <> 'web:firmware'
        AND COALESCE(c.value_text, '') <> '***'
      ORDER BY c.sent_at`,
    [RETRY_VERBS]
  );

  const now = Date.now();
  for (const r of open.rows as any[]) {
    const what = decideRetry(
      { sentAt: ms(r.sent_at)!, lastSentAt: ms(r.last_sent_at), attempts: r.attempts },
      ms(r.heard_at), now
    );
    if (what === 'wait') continue;
    if (what === 'expire' || what === 'give_up') {
      await query(
        `UPDATE nano_commands SET status = 'failed', result_reason = $2, resolved_at = now()
          WHERE id::text = $1 AND status = 'sent'`,
        [r.id, what === 'expire'
          ? 'No answer in 7 days: the device did not come back online, or kept refusing silently'
          : `No answer after ${RETRY_MAX_ATTEMPTS} attempts while the device was online`]
      );
      continue;
    }
    const payload = typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload;
    // Claim the attempt first, so a second process cannot send it as well.
    const claimed = await query(
      `UPDATE nano_commands SET attempts = attempts + 1, last_sent_at = now()
        WHERE id::text = $1 AND status = 'sent' AND attempts = $2`,
      [r.id, r.attempts]
    );
    if (claimed.rowCount === 0) continue;
    try {
      await publishNanoCommand(r.imei, payload);
    } catch {
      // Broker unreachable: the row stays open and is tried again next time.
    }
  }
}
