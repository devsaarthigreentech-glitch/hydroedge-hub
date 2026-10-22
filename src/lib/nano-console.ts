// ============================================================================
// lib/nano-console.ts — turn a typed command into a Nano /cmd request.
// ----------------------------------------------------------------------------
// Accepts what an engineer would type on the device console or in an SMS, so
// nobody has to learn the JSON:
//
//   cfg set P-5021 24V        set P-5021 24V        SET p_5021 24V
//   get P-5021                getall                reboot
//   stop                      start
//
// "cfg " is optional, case does not matter for the verb and P-ID, and the
// value keeps its case and may contain spaces (an APN, a Wi-Fi name). Quotes
// around the value are dropped.
// ============================================================================

export type ConsoleCommand =
  | { verb: 'set'; pid: string; value: string }
  | { verb: 'get'; pid: string }
  | { verb: 'getall' | 'reboot' | 'stop' | 'start' };

/** The firmware's command parser keeps at most 47 characters of a value and
 *  silently drops the rest, so a longer value is refused here instead. */
export const NANO_VALUE_MAX = 47;

export const CONSOLE_EXAMPLES = ['set P-5021 24V', 'get P-5021', 'getall', 'reboot'];

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

  if (verb === 'getall' || verb === 'reboot' || verb === 'stop' || verb === 'start') {
    if (rest.length) return { error: `${verb} takes nothing after it` };
    return { verb };
  }

  return { error: `Unknown command "${word}". Try: ${CONSOLE_EXAMPLES.join(' · ')}` };
}
