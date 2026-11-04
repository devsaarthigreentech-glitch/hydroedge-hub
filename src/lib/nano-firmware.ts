// ============================================================================
// lib/nano-firmware.ts — check an uploaded NanoV3 .bin before accepting it.
// ----------------------------------------------------------------------------
// Pure (no DB, no disk), so it can be tested offline. ESP-IDF image layout:
//   byte  0        0xE9 image magic
//   bytes 12-13    chip id, little endian (9 = ESP32-S3)
//   bytes 32-35    esp_app_desc magic 0xABCD5432, little endian
//   bytes 48-79    version, NUL-terminated
//   bytes 80-111   project name, NUL-terminated
// A build from firmware f3f46ea on has version = NANO_V3_FW_VERSION (3.0.3).
// Older bins carry a git-describe string, so whoever uploads one types the
// version. That is the value P-104 will report after the update, which is how
// success is judged.
// ============================================================================

import { createHash } from 'crypto';

export const FW_APP_SLOT_BYTES = 0x280000;     // partition table: 2,621,440
export const FW_URL_MAX = 95;                  // registry strings, P-5300
const FW_PROJECT = 'nano_v3';
const FW_CHIP_ESP32S3 = 9;
const APP_DESC_MAGIC = 0xabcd5432;
const VERSION_RE = /^\d+\.\d+\.\d+$/;

export type FirmwareCheck =
  | { ok: true; version: string; sha256: string; size: number }
  | { ok: false; error: string; needsVersion?: boolean };

const cString = (b: Buffer) => {
  const end = b.indexOf(0);
  return b.subarray(0, end < 0 ? b.length : end).toString('latin1');
};

export function checkFirmwareImage(buf: Buffer, typedVersion?: string | null): FirmwareCheck {
  if (buf.length < 112) return { ok: false, error: 'File is too short to be a firmware image' };
  if (buf.length > FW_APP_SLOT_BYTES) {
    return { ok: false, error: `${buf.length} bytes is larger than the ${FW_APP_SLOT_BYTES} byte app slot` };
  }
  if (buf[0] !== 0xe9) return { ok: false, error: 'Not an ESP32 app image (first byte is not 0xE9)' };
  const chip = buf.readUInt16LE(12);
  if (chip !== FW_CHIP_ESP32S3) return { ok: false, error: `Built for chip id ${chip}; the Nano is an ESP32-S3 (9)` };
  if (buf.readUInt32LE(32) !== APP_DESC_MAGIC) {
    return { ok: false, error: 'No app description in the image: is this the app .bin, not the bootloader or a merged image?' };
  }
  const project = cString(buf.subarray(80, 112));
  if (project !== FW_PROJECT) return { ok: false, error: `Project is "${project}"; expected "${FW_PROJECT}"` };

  const inImage = cString(buf.subarray(48, 80));
  const typed = (typedVersion || '').trim();
  let version: string;
  if (VERSION_RE.test(inImage)) {
    if (typed && typed !== inImage) {
      return { ok: false, error: `The image says version ${inImage}, not ${typed}` };
    }
    version = inImage;
  } else {
    if (!typed) {
      return { ok: false, needsVersion: true, error: `The image's version is "${inImage}". Type the version it reports as P-104 (like 3.0.1).` };
    }
    if (!VERSION_RE.test(typed)) return { ok: false, needsVersion: true, error: 'Version must look like 3.0.1' };
    version = typed;
  }
  return { ok: true, version, sha256: createHash('sha256').update(buf).digest('hex'), size: buf.length };
}

/** Where devices fetch a firmware: plain http on the droplet (see FIRMWARE.md). */
export function firmwareUrl(token: string): string {
  const base = (process.env.FIRMWARE_PUBLIC_BASE || 'http://143.244.135.19:8080').replace(/\/+$/, '');
  return `${base}/fw/${token}.bin`;
}

export function firmwareDir(): string {
  return process.env.FIRMWARE_DIR || '/var/lib/sgt-firmware';
}
