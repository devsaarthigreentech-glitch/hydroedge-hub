// ============================================================================
// NanoV3 health analysis: frame history -> findings -> verdict
// ----------------------------------------------------------------------------
// Pure (no DB), so it can be tested offline. /api/nano/health loads the
// frames, commands, alerts and service log and calls analyseNanoHealth().
//
// Why the frames are enough: the firmware publishes a frame on every debounced
// input change (P-609 "Report on Input Change", default on), and pumps, valve,
// level sensors and engine-run are inputs. So within one boot the frame where a
// pump turns on and the frame where it turns off are both there, and the
// device's uptime (`up`, seconds) between them is how long it ran. With P-609
// off frames only come every P-602/P-603 s and the short-duration rules are
// skipped rather than reporting false overruns.
//
// Plumbing (bench notes, DD-IO-02): pump 1 fills the electrolyser loop; pump 2
// and the solenoid valve fill the bubbler and must run together. The firmware
// reports pumps and valve idle while the plant is not producing (P-4126).
// ============================================================================

export type Severity = 'critical' | 'warning' | 'info';
export type Category = 'service' | 'faulty_part' | 'config' | 'bug' | 'connectivity' | 'operation' | 'device_alert';
export type Verdict = 'healthy' | 'watch' | 'intervention' | 'no_data';

export interface HealthFrame {
  boot: string;
  up: number;                    // device uptime, s
  seq: number;
  t: number;                     // ms since epoch (device clock, else estimated)
  d: Record<string, unknown>;
}
export interface HealthCommand { verb: string; pid: string | null; value_text: string | null; status: string; result_reason: string | null; t: number; }
export interface HealthAlert { alert_id: string; ev: string | null; severity: string | null; category: string | null; condition: string | null; t: number; }
export interface ServiceEntry { id: string; t: number; author: string | null; kind: string; finding: string | null; notes: string; }

export interface Episode { start: number; end: number; durS: number; open: boolean; note?: string; }
export interface Finding {
  key: string;
  title: string;
  category: Category;
  severity: Severity;
  count: number;
  totalS: number;
  longestS: number;
  firstT: number;
  lastT: number;
  detail: string;
  action: string;
  episodes: Episode[];           // newest first, at most EPISODES_KEPT
  resolvedBy?: ServiceEntry;     // a fix logged after the last occurrence
}
export interface HealthReport {
  verdict: Verdict;
  summary: string;
  findings: Finding[];
  coverage: { frames: number; boots: number; firstT: number | null; lastT: number | null; onChange: boolean; nanoV3: boolean };
}

// ── Thresholds ──────────────────────────────────────────────────────────────
export const HEALTH_LIMITS = {
  fillMaxS: 15,                // pump 1, pump 2 or the bubbler valve on longer than this in one go
  mismatchMinS: 3,             // pump 2 and valve disagreeing this long (allows debounce skew)
  tankEmptyMinS: 300,          // main tank reading empty
  bubblerEmptyMinS: 120,
  electrolyserEmptyMinS: 120,
  noProductionMinS: 300,       // engine running, plant not producing
  lowCurrentMinS: 600,         // cell current under half the set-point while producing
  lowCurrentRatio: 0.5,
  gapS: 900,                   // no frame for this long
  repeatCritical: 3,           // a warning that happens this often becomes critical
  rebootsWarn: 5,              // reboots in the window
};
const EPISODES_KEPT = 20;

// ── Value helpers ───────────────────────────────────────────────────────────
const truthy = (v: unknown) => v === true || v === 1 || (typeof v === 'string' && v.toLowerCase() === 'true');
const has = (f: HealthFrame, pid: string) => f.d[pid] !== undefined && f.d[pid] !== null;
const on = (pid: string) => (f: HealthFrame) => truthy(f.d[pid]);
const off = (pid: string) => (f: HealthFrame) => has(f, pid) && !truthy(f.d[pid]);
const num = (f: HealthFrame, pid: string): number | null => {
  const n = Number(f.d[pid]);
  return f.d[pid] === undefined || f.d[pid] === null || !Number.isFinite(n) ? null : n;
};

/** Frames grouped by boot, each in uptime order; boots in time order. */
function byBoot(frames: HealthFrame[]): HealthFrame[][] {
  const m = new Map<string, HealthFrame[]>();
  for (const f of frames) {
    if (!m.has(f.boot)) m.set(f.boot, []);
    m.get(f.boot)!.push(f);
  }
  const boots = Array.from(m.values()).map((b) => b.sort((a, c) => a.up - c.up || a.seq - c.seq));
  return boots.sort((a, b) => a[0].t - b[0].t);
}

/**
 * Stretches where `pred` holds. A state lasts until the next frame (any change
 * would have produced one), so an episode ends at the first frame where it no
 * longer holds; at the end of a boot it is "open" (ended by a reboot or power
 * loss, or still going on the newest frame).
 */
function episodes(boots: HealthFrame[][], pred: (f: HealthFrame) => boolean, minS: number,
                  note?: (frames: HealthFrame[]) => string | undefined): Episode[] {
  const out: Episode[] = [];
  for (const b of boots) {
    let i = 0;
    while (i < b.length) {
      if (!pred(b[i])) { i++; continue; }
      const s = i;
      while (i < b.length && pred(b[i])) i++;
      const open = i >= b.length;
      const endF = open ? b[b.length - 1] : b[i];
      const durS = endF.up - b[s].up;
      if (durS >= minS) {
        out.push({ start: b[s].t, end: endF.t, durS, open, note: note?.(b.slice(s, open ? b.length : i + 1)) });
      }
    }
  }
  return out;
}

const fmtS = (s: number) => (s < 120 ? `${Math.round(s)} s` : s < 7200 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1)} h`);

function finding(key: string, eps: Episode[], base: Omit<Finding, 'key' | 'count' | 'totalS' | 'longestS' | 'firstT' | 'lastT' | 'episodes' | 'severity'> & { severity: Severity | ((n: number) => Severity) }): Finding | null {
  if (!eps.length) return null;
  const sorted = [...eps].sort((a, b) => b.start - a.start);
  const sev = typeof base.severity === 'function' ? base.severity(eps.length) : base.severity;
  return {
    ...base, key, severity: sev,
    count: eps.length,
    totalS: eps.reduce((n, e) => n + e.durS, 0),
    longestS: Math.max(...eps.map((e) => e.durS)),
    firstT: sorted[sorted.length - 1].start,
    lastT: sorted[0].start,
    episodes: sorted.slice(0, EPISODES_KEPT),
  };
}
const repeat = (n: number): Severity => (n >= HEALTH_LIMITS.repeatCritical ? 'critical' : 'warning');

// ── Analysis ────────────────────────────────────────────────────────────────
export function analyseNanoHealth(input: {
  frames: HealthFrame[];
  commands?: HealthCommand[];
  alerts?: HealthAlert[];
  service?: ServiceEntry[];
  onChange?: boolean;            // P-609 as last reported; undefined = assume default (on)
}): HealthReport {
  const L = HEALTH_LIMITS;
  const frames = input.frames;
  const boots = byBoot(frames);
  const onChange = input.onChange !== false;
  const nanoV3 = frames.some((f) => has(f, 'P-4114') || has(f, 'P-4110'));
  const F: Array<Finding | null> = [];

  if (nanoV3 && onChange) {
    // Electrolyser fill: pump 1 on too long. Still reading empty at the end =
    // water is not arriving, or arriving and not being seen (flooding risk).
    F.push(finding('pump1_overrun', episodes(boots, on('P-4110'), L.fillMaxS + 1, (fr) => {
      const last = fr[fr.length - 1];
      return off('P-4098')(last) || fr.every(off('P-4098')) ? 'electrolyser still read empty' : undefined;
    }), {
      title: `Electrolyser fill pump (pump 1) ran over ${L.fillMaxS} s`,
      category: 'faulty_part', severity: repeat,
      detail: 'A fill normally stops within seconds. A long run while the electrolyser still reads empty means water is not getting there (pump, hose, air lock, empty main tank) or the level sensor is not seeing it, which can over-flood the electrolyser.',
      action: 'Check the electrolyser level sensor (P-4098) and its wiring, then the pump 1 delivery and hose. Look for water where it should not be.',
    }));
    F.push(finding('pump2_overrun', episodes(boots, on('P-4111'), L.fillMaxS + 1), {
      title: `Bubbler pump (pump 2) ran over ${L.fillMaxS} s`,
      category: 'faulty_part', severity: repeat,
      detail: 'The bubbler top-up should be short. A long run points at the bubbler level sensor or a pump that is not delivering.',
      action: 'Check the bubbler level sensor (P-4097), pump 2 delivery and the bubbler hose.',
    }));
    F.push(finding('valve_overrun', episodes(boots, on('P-4112'), L.fillMaxS + 1), {
      title: `Bubbler solenoid valve open over ${L.fillMaxS} s`,
      category: 'faulty_part', severity: repeat,
      detail: 'The valve should only be open for the length of a bubbler top-up.',
      action: 'Check the solenoid valve for sticking open, and the bubbler level sensor (P-4097).',
    }));
    // Pump 2 and the valve must start and stop together.
    F.push(finding('bubbler_mismatch', episodes(boots, (f) => has(f, 'P-4111') && has(f, 'P-4112') && truthy(f.d['P-4111']) !== truthy(f.d['P-4112']),
      L.mismatchMinS, (fr) => (truthy(fr[0].d['P-4111']) ? 'pump 2 ran with the valve shut' : 'valve open with pump 2 stopped')), {
      title: 'Bubbler pump and solenoid valve out of step',
      category: 'faulty_part', severity: repeat,
      detail: 'Pump 2 and the bubbler valve should switch on and off together. A pump against a shut valve, or an open valve with no pump, means a failed valve or pump, or a wiring / status-line fault.',
      action: 'Run a bubbler top-up and watch both. Check the valve coil, pump 2, and their status lines to the Nano.',
    }));
  }

  if (nanoV3) {
    // Remote stop (HHO shut down), with the likeliest cause.
    const stopCmds = (input.commands || []).filter((c) => c.verb === 'stop');
    const cause = (fr: HealthFrame[]) => {
      if (fr.some(on('P-4139'))) return 'low-water stop';
      if (fr.some(on('P-4120'))) return 'thermal lockout';
      if (fr.some(on('P-4138'))) return 'battery system mismatch';
      const t0 = fr[0].t;
      if (stopCmds.some((c) => Math.abs(c.t - t0) < 120000)) return 'remote stop command';
      if (off('P-4113')(fr[0])) return 'engine off';
      return 'cause not reported';
    };
    const stops = episodes(boots, on('P-4114'), 0, cause);
    const unexplained = stops.filter((e) => e.note === 'cause not reported');
    F.push(finding('remote_stop', stops.filter((e) => e.note !== 'cause not reported'), {
      title: 'Remote shutdowns',
      category: 'operation', severity: 'info',
      detail: 'Each time the Nano held the stop line. "engine off" is the normal hold while the engine is stopped; the other causes have their own findings.',
      action: 'No action on its own; see the related findings.',
    }));
    F.push(finding('remote_stop_unexplained', unexplained, {
      title: 'Remote shutdown with no reported cause',
      category: 'bug', severity: repeat,
      detail: 'The stop line was held while the engine was running and no low-water, thermal, battery or commanded stop was reported.',
      action: 'Send the frames around these times to firmware support; check the remote-stop wiring for a short.',
    }));
    F.push(finding('low_water_stop', episodes(boots, on('P-4139'), 0), {
      title: 'Low-water stop (main tank ran dry)',
      category: 'service', severity: repeat,
      detail: 'HHO production was stopped because the main tank read dry for longer than P-5041.',
      action: 'Refill the main water tank. If it keeps happening, check for leaks and the main level sensor (P-4096).',
    }));
    F.push(finding('main_tank_empty', episodes(boots, off('P-4096'), L.tankEmptyMinS), {
      title: 'Main water tank empty',
      category: 'service', severity: 'warning',
      detail: `The main tank read empty for ${fmtS(L.tankEmptyMinS)} or more.`,
      action: 'Refill the main tank. If it was full, check the main level sensor (P-4096).',
    }));
    F.push(finding('bubbler_empty', episodes(boots, off('P-4097'), L.bubblerEmptyMinS), {
      title: 'Bubbler empty',
      category: 'service', severity: repeat,
      detail: `The bubbler read empty for ${fmtS(L.bubblerEmptyMinS)} or more without being topped up.`,
      action: 'Check the bubbler level, pump 2 and the valve; check the bubbler level sensor (P-4097).',
    }));
    F.push(finding('electrolyser_empty', episodes(boots, off('P-4098'), L.electrolyserEmptyMinS), {
      title: 'Electrolyser empty',
      category: 'service', severity: repeat,
      detail: `The electrolyser read empty for ${fmtS(L.electrolyserEmptyMinS)} or more.`,
      action: 'Check the main tank and pump 1; check the electrolyser level sensor (P-4098).',
    }));
    F.push(finding('thermal_lockout', episodes(boots, on('P-4120'), 0, (fr) => {
      const peak = Math.max(...fr.map((f) => num(f, 'P-4118') ?? -Infinity));
      return Number.isFinite(peak) ? `peak ${peak.toFixed(1)} °C` : undefined;
    }), {
      title: 'Thermal lockout (electrolyser over-temperature)',
      category: 'faulty_part', severity: 'critical',
      detail: 'Production was locked out because the electrolyser was too hot.',
      action: 'Check the electrolyte level and concentration, cooling and airflow, and the temperature sensor reading against a thermometer.',
    }));
    F.push(finding('jacket_fault', episodes(boots, on('P-4122'), 0), {
      title: 'Heating jacket fault',
      category: 'faulty_part', severity: 'warning',
      detail: 'The heating jacket reported a fault.',
      action: 'Check the heating jacket, its fuse and wiring.',
    }));
    F.push(finding('temp_sensor_missing', episodes(boots, off('P-4119'), 0), {
      title: 'Electrolyser temperature sensor not answering',
      category: 'faulty_part', severity: 'warning',
      detail: 'The PT100 sensor was not detected, so over-temperature protection is blind.',
      action: 'Check the PT100 probe and its connector and wiring.',
    }));
    F.push(finding('battery_mismatch', episodes(boots, on('P-4138'), 0), {
      title: 'Battery system voltage does not match the setting',
      category: 'config', severity: 'warning',
      detail: 'The measured supply does not fit the configured battery system (P-5021).',
      action: 'Set P-5021 to the vehicle\'s system voltage (12 V or 24 V) in Config.',
    }));
    F.push(finding('no_production', episodes(boots, (f) => on('P-4113')(f) && off('P-4126')(f), L.noProductionMinS), {
      title: 'Engine running but no HHO production',
      category: 'faulty_part', severity: repeat,
      detail: `The engine was running and the cell drew no current for ${fmtS(L.noProductionMinS)} or more.`,
      action: 'Check the cell fuse and power wiring, the RCS set-point (P-802) and whether a stop was holding.',
    }));
    F.push(finding('low_current', episodes(boots, (f) => {
      const a = num(f, 'P-4075'), sp = num(f, 'P-802');
      return on('P-4126')(f) && a !== null && sp !== null && sp >= 1 && a < sp * L.lowCurrentRatio;
    }, L.lowCurrentMinS), {
      title: 'Cell current far below the set-point',
      category: 'service', severity: 'warning',
      detail: `While producing, the cell drew less than ${Math.round(L.lowCurrentRatio * 100)}% of the RCS set-point for ${fmtS(L.lowCurrentMinS)} or more.`,
      action: 'Check the electrolyte concentration and level, the cell connections, and the RCS.',
    }));
    F.push(finding('ota_failed', episodes(boots, (f) => /fail|error/i.test(String(f.d['P-4125'] ?? '')), 0,
      (fr) => String(fr[0].d['P-4125'])), {
      title: 'Firmware update failed',
      category: 'bug', severity: 'warning',
      detail: 'An over-the-air update reported a failure.',
      action: 'Check the OTA URL / size / SHA-256 (P-5300..P-5303) and retry; report the result text to firmware support.',
    }));
  }

  // Reboots and data gaps apply to every generation.
  const reboots: Episode[] = boots.slice(1).map((b) => ({ start: b[0].t, end: b[0].t, durS: 0, open: false, note: `uptime ${b[0].up} s at first frame` }));
  F.push(finding('reboots', reboots, {
    title: 'Device restarts',
    category: 'bug', severity: (n) => (n >= L.rebootsWarn ? 'warning' : 'info'),
    detail: 'Each new boot seen in the window. A few are normal (ignition, updates, commanded reboots); many point at a power supply problem or a firmware crash.',
    action: 'If frequent: check the supply and ground, and compare the times with commanded reboots and OTA updates.',
  }));
  const gaps: Episode[] = [];
  const all = [...frames].sort((a, b) => a.t - b.t);
  for (let i = 1; i < all.length; i++) {
    const s = (all[i].t - all[i - 1].t) / 1000;
    if (s >= L.gapS) gaps.push({ start: all[i - 1].t, end: all[i].t, durS: s, open: false });
  }
  F.push(finding('data_gap', gaps, {
    title: 'No data received',
    category: 'connectivity', severity: 'info',
    detail: `Gaps of ${fmtS(L.gapS)} or more between frames: the unit was off, or out of coverage with a full buffer.`,
    action: 'Normal while the vehicle is parked and powered off. Long gaps while running: check the antenna and SIM.',
  }));

  // Device alerts, one finding per alert id.
  const alertGroups = new Map<string, HealthAlert[]>();
  for (const a of input.alerts || []) {
    if (a.ev && !/^(set|raised)$/i.test(a.ev)) continue;
    if (!alertGroups.has(a.alert_id)) alertGroups.set(a.alert_id, []);
    alertGroups.get(a.alert_id)!.push(a);
  }
  alertGroups.forEach((list, id) => {
    const sevText = (list[0].severity || '').toLowerCase();
    const sev: Severity = /crit|high|alarm|severe/.test(sevText) ? 'critical' : /warn|med/.test(sevText) ? 'warning' : 'info';
    F.push(finding(`alert:${id}`, list.map((a) => ({ start: a.t, end: a.t, durS: 0, open: false })), {
      title: `Device alert ${id}${list[0].condition ? `: ${list[0].condition}` : ''}`,
      category: 'device_alert', severity: sev,
      detail: `Raised by the device${list[0].category ? ` (${list[0].category})` : ''}.`,
      action: 'See the Alerts tab for the full event history.',
    }));
  });

  // Commands the device refused: usually a setting that does not fit.
  const nacks = (input.commands || []).filter((c) => c.status === 'nack');
  F.push(finding('command_rejected', nacks.map((c) => ({ start: c.t, end: c.t, durS: 0, open: false, note: `${c.verb} ${c.pid ?? ''} ${c.value_text ?? ''}: ${c.result_reason ?? 'rejected'}`.replace(/\s+/g, ' ') })), {
    title: 'Commands rejected by the device',
    category: 'config', severity: 'info',
    detail: 'The device refused these settings or commands.',
    action: 'Read the reason on each; correct the value in Config.',
  }));

  // A fix logged after the last occurrence settles the finding.
  const service = [...(input.service || [])].sort((a, b) => b.t - a.t);
  const findings = (F.filter(Boolean) as Finding[]).map((f) => {
    const fix = service.find((s) => s.finding === f.key && s.t >= f.lastT);
    return fix ? { ...f, resolvedBy: fix } : f;
  });
  const rank: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
  findings.sort((a, b) => Number(!!a.resolvedBy) - Number(!!b.resolvedBy) || rank[a.severity] - rank[b.severity] || b.lastT - a.lastT);

  const open = findings.filter((f) => !f.resolvedBy);
  const crit = open.filter((f) => f.severity === 'critical');
  const warn = open.filter((f) => f.severity === 'warning');
  let verdict: Verdict, summary: string;
  if (!frames.length) {
    verdict = 'no_data'; summary = 'No frames in this period.';
  } else if (crit.length) {
    verdict = 'intervention'; summary = `Needs intervention: ${crit.map((f) => f.title.toLowerCase()).join('; ')}.`;
  } else if (warn.length) {
    verdict = 'watch'; summary = `Keep an eye on: ${warn.map((f) => f.title.toLowerCase()).join('; ')}.`;
  } else {
    verdict = 'healthy'; summary = 'No faults or abnormal patterns found.';
  }
  if (frames.length && nanoV3 && !onChange) summary += ' P-609 (report on input change) is off, so pump and valve timing was not checked.';
  if (frames.length && !nanoV3) summary += ' Gen 2 unit: only restarts, data gaps, alerts and commands are checked.';

  return {
    verdict, summary, findings,
    coverage: {
      frames: frames.length, boots: boots.length,
      firstT: all.length ? all[0].t : null, lastT: all.length ? all[all.length - 1].t : null,
      onChange, nanoV3,
    },
  };
}
