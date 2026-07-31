// ============================================================================
// ASSET TYPE SERIES — client-side mirror of the server naming rules
// ============================================================================
//
// The authoritative map lives in src/app/api/devices/[deviceId]/route.ts
// (ASSET_CODE_MAP). This file exists so the Edit and Info tabs can SHOW the
// series a device belongs to without duplicating the logic in each component.
//
// This is display-only. The series code is never sent to the API — the server
// derives it from asset_name and draws the number from a Postgres sequence.
// If a series is added or renamed here, update ASSET_CODE_MAP to match.

export interface AssetSeries {
  /** Value stored in devices.asset_name — the naming gate keys off this. */
  value: string;
  /** Human label shown in dropdowns. */
  label: string;
  /** Two-letter code embedded in the device name (SGT-<code>-MMYY-####). */
  code: string;
  /** Product line this series maps to, blank when the series has no brand. */
  brand: string;
  /** Postgres sequence the number is drawn from. */
  sequence: string;
  /** Whether ticking Tested enables system health monitoring for this asset. */
  healthMonitoring: boolean;
}

export const ASSET_SERIES: AssetSeries[] = [
  { value: "EOW",        label: "Engine on Wheels",     code: "GD", brand: "GreenDrive", sequence: "device_seq_gd", healthMonitoring: true },
  { value: "DG",         label: "DG (Diesel Generator)", code: "GX", brand: "GreenX",     sequence: "device_seq_gx", healthMonitoring: true },
  { value: "Marine",     label: "Marine",                code: "GM", brand: "",           sequence: "device_seq_mr", healthMonitoring: false },
  { value: "Industrial", label: "Industrial",            code: "GI", brand: "",           sequence: "device_seq_in", healthMonitoring: false },
];

/** Look up the series for an asset_name value. Returns null for unset/unknown. */
export function getAssetSeries(assetName?: string | null): AssetSeries | null {
  if (!assetName) return null;
  return ASSET_SERIES.find((a) => a.value === assetName) ?? null;
}

/** Friendly label for an asset_name value, falling back to the raw value. */
export function getAssetLabel(assetName?: string | null): string {
  if (!assetName) return "—";
  return getAssetSeries(assetName)?.label ?? assetName;
}

