// ============================================================================
// lib/nano-fw-job.ts — the firmware update job as a pure state machine.
// ----------------------------------------------------------------------------
// No DB and no MQTT here, so every path can be tested offline. lib/nano-fw-runner
// loads a job and what the device last reported, calls stepJob, and applies the
// result.
//
//   sending   P-5300, P-5301, P-5302, P-5303 one at a time: the next goes only
//             after the device acked the last. A nack stops the job. No ack is
//             resent twice, then the job fails; nothing has started yet.
//   running   P-5304 true has gone out. It is never resent: in AwaitingSafeReboot
//             a repeat start would download again. Its ack is not waited for
//             either: a cellular unit drops MQTT for the download, so the ack
//             can arrive long after, or the first news can be P-4123.
//   updated / rolled_back / failed / timed_out   finished.
//
// Reading the device (firmware ota_manager.c):
// - The device does not check P-5301; only P-104 after the reboot proves it.
//   P-104 is reported once per connection, so a report before the reboot still
//   shows the old version, and with a reinstall of the same version only a
//   report from after a reboot means anything.
// - Silence during a download is normal, so it never fails a job by itself:
//   only the overall timeouts do.
// - "Failed" can be left over from an earlier job until a new one starts, so it
//   counts only once the start is known to have reached the device.
// ============================================================================

export type JobStatus = 'sending' | 'running' | 'updated' | 'rolled_back' | 'failed' | 'timed_out';

export interface FwJob {
  status: JobStatus;
  target_version: string;
  url: string;
  sha256: string;
  size_bytes: number;
  from_version: string | null;
  from_boot_id: string | null;
  step: number;
  command_at: number | null;     // ms, when the current command went out
  retries: number;
  started_at: number | null;     // ms, when P-5304 went out
  seen_active: boolean;
  seen_awaiting: boolean;
  ota_state: string | null;
  ota_pct: number | null;
  detail: string | null;
}

export interface FwObservation {
  now: number;
  /** The job's current command: its status in nano_commands. */
  command?: { status: string; reason: string | null; resolvedAt: number | null } | null;
  /** The newest telemetry frame. */
  frameAt: number | null;
  frameUp: number | null;
  otaState: string | null;
  otaPct: number | null;
  otaResult: string | null;
  bootId: string | null;
  /** P-104 as last reported, and when. */
  version: string | null;
  versionAt: number | null;
}

export interface JobStep {
  patch: Partial<FwJob>;
  /** Send this command, and make it the job's current one. */
  send?: { pid: string; value: string };
  /** The command being replaced had no answer. */
  supersede?: boolean;
}

export const FW_ACK_TIMEOUT_MS = 2 * 60_000;
export const FW_ACK_RETRIES = 2;
export const FW_FAILED_GRACE_MS = 3 * 60_000;    // a "Failed" this late is this job's, even with no ack
export const FW_SILENT_TIMEOUT_MS = 2 * 3600_000;
export const FW_WAIT_REBOOT_TIMEOUT_MS = 72 * 3600_000;   // the engine may run for days

export function jobSettings(job: Pick<FwJob, 'url' | 'target_version' | 'sha256' | 'size_bytes'>) {
  return [
    { pid: 'P-5300', value: job.url },
    { pid: 'P-5301', value: job.target_version },
    { pid: 'P-5302', value: job.sha256 },
    { pid: 'P-5303', value: String(job.size_bytes) },
  ];
}
export const FW_START_PID = 'P-5304';

const done = (status: JobStatus, detail: string, extra: Partial<FwJob> = {}): JobStep => ({ patch: { ...extra, status, detail } });

export function stepJob(job: FwJob, o: FwObservation): JobStep {
  if (job.status === 'sending') return stepSending(job, o);
  if (job.status === 'running') return stepRunning(job, o);
  return { patch: {} };
}

function stepSending(job: FwJob, o: FwObservation): JobStep {
  const settings = jobSettings(job);
  const current = settings[job.step];
  if (job.command_at == null) {
    return { patch: { command_at: o.now }, send: current };
  }
  const c = o.command;
  if (c?.status === 'nack') {
    return done('failed', `The device refused ${current.pid}: ${c.reason || 'no reason given'}. Nothing was started.`);
  }
  if (c?.status === 'ok') {
    const next = job.step + 1;
    if (next < settings.length) {
      return { patch: { step: next, command_at: o.now, retries: 0 }, send: settings[next] };
    }
    return {
      patch: { status: 'running', step: next, command_at: o.now, retries: 0, started_at: o.now },
      send: { pid: FW_START_PID, value: 'true' },
    };
  }
  const lost = c?.status === 'failed';      // could not even publish
  if (lost || o.now - job.command_at >= FW_ACK_TIMEOUT_MS) {
    if (job.retries >= FW_ACK_RETRIES) {
      return done('failed', `No answer from the device for ${current.pid}. Nothing was started; check it is online and try again.`);
    }
    return { patch: { retries: job.retries + 1, command_at: o.now }, send: current, supersede: !lost };
  }
  return { patch: {} };
}

function stepRunning(job: FwJob, o: FwObservation): JobStep {
  const started = job.started_at ?? o.now;
  if (o.command?.status === 'nack') {
    return done('failed', `The device refused to start: ${o.command.reason || 'no reason given'}`);
  }
  if (o.command?.status === 'failed') {
    return done('failed', 'Could not send the start command. Nothing was started; try again.');
  }

  const patch: Partial<FwJob> = {};
  const fresh = o.frameAt != null && o.frameAt > started;
  const state = fresh ? o.otaState : null;
  let seenActive = job.seen_active;
  let seenAwaiting = job.seen_awaiting;
  if (state === 'Downloading' || state === 'Verifying' || state === 'AwaitingSafeReboot') {
    seenActive = true;
    if (state === 'AwaitingSafeReboot') seenAwaiting = true;
    patch.seen_active = seenActive;
    patch.seen_awaiting = seenAwaiting;
    patch.ota_state = state;
    patch.ota_pct = state === 'Downloading' ? (o.otaPct ?? job.ota_pct) : null;
  }

  // Did the unit restart since the job began, and is P-104 from after that?
  const rebooted = !!o.bootId && !!job.from_boot_id && o.bootId !== job.from_boot_id;
  const bootStart = o.frameAt != null ? o.frameAt - (o.frameUp ?? 0) * 1000 : null;
  const versionAfterStart = o.version != null && o.versionAt != null && o.versionAt > started;
  const versionAfterBoot = rebooted && versionAfterStart && bootStart != null && o.versionAt! >= bootStart;

  if (o.version === job.target_version && (versionAfterBoot || (versionAfterStart && job.from_version !== job.target_version))) {
    return done('updated', `Updated to ${job.target_version}`, { ...patch, ota_state: null, ota_pct: null });
  }
  if (versionAfterBoot && o.version !== job.target_version) {
    const on = o.version || 'an unknown version';
    return seenAwaiting
      ? done('rolled_back', `Rolled back: the new image did not come online, so the device went back to ${on}.`, patch)
      : done('failed', `The device restarted and is still on ${on}: the update was interrupted, or the new image rolled back. Update again.`, patch);
  }

  if (state === 'Failed') {
    const acked = o.command?.status === 'ok' && o.command.resolvedAt != null && o.frameAt! > o.command.resolvedAt;
    if (seenActive || acked || o.now - started >= FW_FAILED_GRACE_MS) {
      return done('failed', `The device reports: ${o.otaResult || 'failed, no reason given'}`, patch);
    }
  }

  const limit = seenAwaiting ? FW_WAIT_REBOOT_TIMEOUT_MS : FW_SILENT_TIMEOUT_MS;
  if (o.now - started >= limit) {
    return done('timed_out', seenAwaiting
      ? `Still waiting for a safe reboot after ${Math.round(limit / 3600_000)} h. It will install at the next engine stop or held stop; firmware version will show it.`
      : `No result after ${Math.round(limit / 3600_000)} h. Check the device is online and read its firmware version before trying again.`, patch);
  }
  return { patch };
}

/** Why a new job must not start, or null. Silence on a device mid-job is covered by the states. */
export function refuseStart(d: { online: boolean | null; lastSeenAt: number | null; otaState: string | null; isV3: boolean; now: number }): string | null {
  if (!d.isV3) return 'This device is not reporting NanoV3 firmware';
  const silentMs = d.lastSeenAt == null ? Infinity : d.now - d.lastSeenAt;
  if (d.online === false || silentMs > 15 * 60_000) return 'The device is offline';
  if (d.otaState === 'Downloading' || d.otaState === 'Verifying') return `The device is busy with an update (${d.otaState})`;
  if (d.otaState === 'AwaitingSafeReboot') return 'The device has an update waiting for a safe reboot; starting again would download it again';
  return null;
}

/** The plain-language line on the card. */
export function jobLabel(job: Pick<FwJob, 'status' | 'step' | 'ota_state' | 'ota_pct' | 'detail' | 'target_version'>): string {
  switch (job.status) {
    case 'sending': return `Sending settings (${Math.min(job.step + 1, 4)} of 4)`;
    case 'running':
      if (job.ota_state === 'Downloading') return `Downloading${job.ota_pct != null ? ` ${job.ota_pct}%` : ''}`;
      if (job.ota_state === 'Verifying') return 'Verifying';
      if (job.ota_state === 'AwaitingSafeReboot') return 'Waiting for safe reboot (engine off or stop held)';
      return 'Started: a unit on cellular goes quiet while it downloads';
    case 'updated': return job.detail || `Updated to ${job.target_version}`;
    default: return job.detail || job.status;
  }
}
