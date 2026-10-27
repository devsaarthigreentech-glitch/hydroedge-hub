// ============================================================================
// lib/nano-console.ts — turn a typed command into a Nano /cmd request.
// ----------------------------------------------------------------------------
// Accepts what an engineer would type on the device console or in an SMS, so
// nobody has to learn the JSON:
//
//   cfg set P-5021 24V        set P-5021 24V        SET p_5021 24V
//   get P-5021                getall                reboot
//   stop                      start
//   rs485 scan 1 20           rs485 read 0 10 1 4
//
// "cfg " is optional, case does not matter for the verb and P-ID, and the
// value keeps its case and may contain spaces (an APN, a Wi-Fi name). Quotes
// around the value are dropped.
// ============================================================================

export type ConsoleCommand =
  | { verb: 'set'; pid: string; value: string }
  | { verb: 'get'; pid: string }
  | { verb: 'rs485'; value: string }
  | { verb: 'getall' | 'reboot' | 'stop' | 'start' };

/** The firmware's command parser keeps at most 47 characters of a value and
 *  silently drops the rest, so a longer value is refused here instead. */
export const NANO_VALUE_MAX = 47;

export const CONSOLE_EXAMPLES = ['set P-5021 24V', 'get P-5021', 'getall', 'reboot', 'rs485 scan 1 20', 'rs485 read 0 10 1 4'];

const RS485_USAGE = 'rs485 scan [lo] [hi]  or  rs485 read <start> <count> [slave] [fc]';

// Decimal or 0x hex, as the firmware reads it.
function modbusNum(s: string): number | null {
  if (!/^(0x[0-9a-f]+|\d+)$/i.test(s)) return null;
  return s.toLowerCase().startsWith('0x') ? parseInt(s, 16) : parseInt(s, 10);
}

/** Remote RS485 / Modbus probe: only scan and read (the firmware refuses
 *  anything else). The firmware re-checks everything; this just catches typos
 *  before a round trip. Arguments are sent as typed, single-spaced. */
function parseRs485(args: string[]): ConsoleCommand | { error: string } {
  const sub = (args[0] || '').toLowerCase();
  const nums = args.slice(1).map(modbusNum);
  const bad = args.slice(1).find((_, i) => nums[i] === null);
  if (bad !== undefined) return { error: `"${bad}" is not a number (decimal or 0x hex)` };
  if (sub === 'scan') {
    if (nums.length > 2) return { error: 'rs485 scan takes at most lo and hi, e.g. rs485 scan 1 20' };
    const [lo = 1, hi = 16] = nums as number[];
    if (lo < 1 || hi > 247 || lo > hi) return { error: 'scan addresses must be 1..247, lo <= hi' };
    if (hi - lo + 1 > 32) return { error: 'scan covers at most 32 addresses' };
  } else if (sub === 'read') {
    if (nums.length < 2 || nums.length > 4) return { error: 'rs485 read needs <start> <count> [slave] [fc], e.g. rs485 read 0 10 1 4' };
    const [, count, slave, fc] = nums as number[];
    if (count < 1 || count > 16) return { error: 'count must be 1..16' };
    if (slave !== undefined && (slave < 1 || slave > 247)) return { error: 'slave must be 1..247' };
    if (fc !== undefined && fc !== 3 && fc !== 4) return { error: 'fc must be 3 (holding) or 4 (input)' };
  } else {
    return { error: `Only scan and read are allowed remotely: ${RS485_USAGE}` };
  }
  const value = [sub, ...args.slice(1)].join(' ');
  if (value.length > NANO_VALUE_MAX) return { error: `rs485 arguments are ${value.length} characters; at most ${NANO_VALUE_MAX}` };
  return { verb: 'rs485', value };
}

function normalisePid(raw: string): string | null {
  const m = /^p[-_]?(\d{2,5})$/i.exec(raw.trim());
  return m ? `P-${m[1]}` : null;
}

export function parseConsoleCommand(text: string): ConsoleCommand | { error: string } {
  const line = (text || '').trim().replace(/^cfg\s+/i, '');
  if (!line) return { error: 'Type a command, e.g. set P-5021 24V' };

  const [word, ...rest] = line.split(/\s+/);
  const verb = word.toLowerCase();

  if (verb === 'set') {
    const m = /^set\s+(\S+)\s+([\s\S]+)$/i.exec(line);
    if (!m) return { error: 'set needs a P-ID and a value, e.g. set P-5021 24V' };
    const pid = normalisePid(m[1]);
    if (!pid) return { error: `"${m[1]}" is not a P-ID (expected something like P-5021)` };
    let value = m[2].trim();
    if (value.length >= 2 && /^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    if (!value) return { error: 'set needs a value' };
    if (value.length > NANO_VALUE_MAX) {
      return { error: `Value is ${value.length} characters; the device accepts at most ${NANO_VALUE_MAX}` };
    }
    return { verb: 'set', pid, value };
  }

  if (verb === 'get') {
    if (rest.length !== 1) return { error: 'get needs one P-ID, e.g. get P-5021' };
    const pid = normalisePid(rest[0]);
    if (!pid) return { error: `"${rest[0]}" is not a P-ID (expected something like P-5021)` };
    return { verb: 'get', pid };
  }

  if (verb === 'rs485') return parseRs485(rest);

  if (verb === 'getall' || verb === 'reboot' || verb === 'stop' || verb === 'start') {
    if (rest.length) return { error: `${verb} takes nothing after it` };
    return { verb };
  }

  return { error: `Unknown command "${word}". Try: ${CONSOLE_EXAMPLES.join(' · ')}` };
}
