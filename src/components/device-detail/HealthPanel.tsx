"use client";

import { useState, useRef } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";

// ─── Constants ────────────────────────────────────────────────────────────────

const HOUR_MS        = 60 * 60 * 1000;
const DAY_MS         = 24 * HOUR_MS;
const STALE_WARN_MS  = 3  * DAY_MS;   // show "data may be outdated" warning
const STALE_BLOCK_MS = 7  * DAY_MS;   // suppress all alarms, show "no data" banner

// ─── Types ────────────────────────────────────────────────────────────────────

interface TelemetryParam {
  name: string;
  value: string;
  raw_value?: string;
  unit?: string;
  category?: string;
  io_id?: number;
  timestamp?: string;
}

interface GreenXHealthPanelProps {
  deviceId: string;
  deviceType: string;   // "FMC650" | "FMB150"
  deviceModel: string;  // "380KVA" | "625KVA" | "1500KVA" | "EOW" | "MINI"
  telemetry: TelemetryParam[];
}

interface Alarm {
  id: string;
  severity: "critical" | "warning";
  message: string;
  action: string;
}

interface FMC650Timers {
  cellShortSince:    number | null;
  bubblerShortSince: number | null;
  tankShortSince:    number | null;
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const C = {
  white: "#ffffff", pageBg: "#f8fafc", surfaceBg: "#f1f5f9",
  border: "#e2e8f0", borderLight: "#f1f5f9",
  textPrimary: "#0f172a", textSecond: "#64748b", textTertiary: "#94a3b8",
  greenDot: "#16a34a", greenText: "#15803d", greenBg: "#f0fdf4", greenBorder: "#bbf7d0",
  redDot: "#dc2626", redText: "#b91c1c", redBg: "#fef2f2", redBorder: "#fecaca",
  redTitle: "#7f1d1d", redAction: "#991b1b",
  amberDot: "#d97706", amberText: "#b45309", amberBg: "#fffbeb", amberBorder: "#fde68a",
  amberTitle: "#78350f", amberAction: "#92400e",
  grayDot: "#94a3b8", grayText: "#64748b",
  blueBg: "#eff6ff", blueBorder: "#bfdbfe", blueText: "#1d4ed8",
};

// ─── Signal helpers ───────────────────────────────────────────────────────────

function getIO(telemetry: TelemetryParam[], ioId: number): number | null {
  const p = telemetry.find((t) => t.io_id === ioId);
  if (!p) return null;
  const v = parseFloat(p.value);
  return isNaN(v) ? null : v;
}

function getRawIO(telemetry: TelemetryParam[], ioId: number): number | null {
  const p = telemetry.find((t) => t.io_id === ioId);
  if (!p) return null;
  const raw = p.raw_value ?? p.value;
  const v = parseFloat(raw);
  return isNaN(v) ? null : v;
}

function calcCurrentFMC650(telemetry: TelemetryParam[]): number | null {
  const raw = getRawIO(telemetry, 9);
  if (raw === null) return null;
  return parseFloat(((raw * 0.001 / 47) * 1000).toFixed(1));
}

function calcCurrentFMB150(telemetry: TelemetryParam[]): number | null {
  const raw = getRawIO(telemetry, 6);
  if (raw === null) return null;
  return parseFloat((raw * 0.001 / 83).toFixed(2));
}

// Returns the most recent timestamp across all telemetry params
function getLatestTimestamp(telemetry: TelemetryParam[]): Date | null {
  const timestamps = telemetry
    .map((t) => t.timestamp)
    .filter(Boolean)
    .map((ts) => new Date(ts!).getTime())
    .filter((t) => !isNaN(t));
  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps));
}

function formatTimeAgo(date: Date): string {
  const diffMs   = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / DAY_MS);
  const diffHrs  = Math.floor(diffMs / HOUR_MS);
  const diffMins = Math.floor(diffMs / 60000);
  if (diffDays  > 0) return `${diffDays}d ago`;
  if (diffHrs   > 0) return `${diffHrs}h ago`;
  if (diffMins  > 0) return `${diffMins}m ago`;
  return "just now";
}

// ─── Sustained timer helper ───────────────────────────────────────────────────

function sustained(sinceMs: number | null): boolean {
  if (sinceMs === null) return false;
  return Date.now() - sinceMs >= HOUR_MS;
}

// ─── FMC650 alarm logic ───────────────────────────────────────────────────────

function computeAlarmsFMC650(
  telemetry: TelemetryParam[],
  model: string,
  setCurrent: number | null,
  timers: FMC650Timers
): Alarm[] {
  const alarms: Alarm[] = [];

  const din1  = getIO(telemetry, 1);
  const din2  = getIO(telemetry, 2);   // 0=short, 1=full
  const din4  = getIO(telemetry, 4);   // 0=short, 1=full
  const ain1A = calcCurrentFMC650(telemetry);
  const ain3  = getIO(telemetry, 11);
  const dout1 = getIO(telemetry, 179);

  const isRunning   = din1 === 1 && ain1A !== null && ain1A > 2;
  const isEOW       = model === "EOW";
  const label       = isEOW ? "engine" : "DG set";
  const hasMainTank = model === "380KVA" || model === "625KVA" || model === "EOW";

  // Always
  if (din1 === 0 && ain1A !== null && ain1A > 2)
    alarms.push({ id: "abnormal_current_off", severity: "critical",
      message: `Abnormal: current detected but ${label} is OFF`,
      action: "Contact Saarthi Support immediately" });

  if (din1 === 1) {
    if (dout1 === 1)
      alarms.push({ id: "remote_shutdown", severity: "warning",
        message: "System remotely shutdown — maintenance mode active",
        action: "Check with maintenance team before restarting" });

    // ain1 < 2 & ain3 < 20 → abnormal no current
    if (ain1A !== null && ain1A < 2 && ain3 !== null && ain3 < 20 && dout1 === 0)
      alarms.push({ id: "abnormal_no_current", severity: "critical",
        message: `Abnormal: ${label} is ON but no output current`,
        action: "Contact Saarthi Support immediately" });

    // ain1 < 2 & ain3 > 20 → stopped due to empty tank
    if (hasMainTank && ain1A !== null && ain1A < 2 && ain3 !== null && ain3 > 20 && dout1 === 0)
      alarms.push({ id: "system_off_water_tank", severity: "critical",
        message: "System stopped — main water tank is empty",
        action: "Fill the main water tank immediately" });

    // Catch-all low current
    if (ain1A !== null && ain1A < 2 && dout1 === 0
        && !(ain1A < 2 && ain3 !== null && ain3 < 20)
        && !(hasMainTank && ain1A < 2 && ain3 !== null && ain3 > 20))
      alarms.push({ id: "abnormal_low_current", severity: "critical",
        message: `Abnormal: ${label} is ON but output current very low (${ain1A} A)`,
        action: "Contact Saarthi Support immediately" });

    // Water alarms — 1hr sustained
    if (isRunning && din2 === 0 && sustained(timers.cellShortSince))
      alarms.push({ id: "electrolyser_water_short", severity: "critical",
        message: "Internal electrolyser water shortage (sustained 1+ hour)",
        action: "Contact Saarthi Support immediately" });

    if (isRunning && hasMainTank && din4 === 0 && sustained(timers.bubblerShortSince))
      alarms.push({ id: "bubbler_water_short", severity: "critical",
        message: "Internal bubbler water shortage (sustained 1+ hour)",
        action: "Contact Saarthi Support immediately" });

    if (isRunning && hasMainTank && ain3 !== null && ain3 > 20 && sustained(timers.tankShortSince))
      alarms.push({ id: "main_tank_short", severity: "warning",
        message: "Main water tank level is low (sustained 1+ hour)",
        action: "Fill the main water tank" });

    // Over/under current
    if (isRunning && setCurrent !== null && ain1A !== null) {
      const tol = setCurrent * 0.1;
      if (ain1A < setCurrent - tol)
        alarms.push({ id: "under_current", severity: "warning",
          message: `Running under current — ${ain1A} A (set: ${setCurrent} A)`,
          action: "Contact Saarthi Support (±10% tolerance)" });
      else if (ain1A > setCurrent + tol)
        alarms.push({ id: "over_current", severity: "warning",
          message: `Running over current — ${ain1A} A (set: ${setCurrent} A)`,
          action: "Contact Saarthi Support (±10% tolerance)" });
    }
  }

  return alarms;
}

// ─── FMB150 alarm logic ───────────────────────────────────────────────────────

function computeAlarmsFMB150(telemetry: TelemetryParam[]): Alarm[] {
  const alarms: Alarm[] = [];

  const din1    = getIO(telemetry, 1);
  const ain1A   = calcCurrentFMB150(telemetry);
  const ain2raw = getRawIO(telemetry, 6);
  const ain2V   = ain2raw !== null ? ain2raw * 0.001 : null;
  const dout1   = getIO(telemetry, 179);

  const isRunning  = din1 === 1 && ain1A !== null && ain1A > 2;
  const waterShort = ain2V !== null ? ain2V > 20 : null;

  if (din1 === 0 && ain1A !== null && ain1A > 2)
    alarms.push({ id: "abnormal_current_off", severity: "critical",
      message: "Abnormal: current detected but DG set is OFF",
      action: "Contact Saarthi Support immediately" });

  if (din1 === 1) {
    if (dout1 === 1)
      alarms.push({ id: "remote_shutdown", severity: "warning",
        message: "System remotely shutdown — maintenance mode active",
        action: "Check with maintenance team before restarting" });

    if (ain1A !== null && ain1A < 2 && dout1 === 0)
      alarms.push({ id: "abnormal_no_current", severity: "critical",
        message: "Abnormal: DG set is ON but no output current",
        action: "Contact Saarthi Support immediately" });

    if (isRunning && waterShort === true)
      alarms.push({ id: "internal_water_short", severity: "warning",
        message: "Internal water level shortage",
        action: "Fill the external aux tank" });

    if (isRunning && ain1A !== null) {
      if (ain1A < 9)
        alarms.push({ id: "under_current", severity: "warning",
          message: `Running under current — ${ain1A} A (healthy: 9–11 A)`,
          action: "Contact Saarthi Support" });
      else if (ain1A > 11)
        alarms.push({ id: "over_current", severity: "warning",
          message: `Running over current — ${ain1A} A (healthy: 9–11 A)`,
          action: "Contact Saarthi Support" });
    }
  }

  return alarms;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SignalRow({ label, detail, status, ok, stale = false, isMobile = false }: {
  label: string; detail: string; status: string;
  ok: boolean | null; stale?: boolean; isMobile?: boolean;
}) {
  const dotColor   = stale ? C.grayDot : ok === null ? C.grayDot : ok ? C.greenDot : C.redDot;
  const valueColor = stale ? C.textTertiary : ok === null ? C.grayText : ok ? C.greenText : C.redText;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, padding: isMobile ? "9px 0" : "11px 0", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, color: C.textPrimary, lineHeight: 1.3 }}>{label}</div>
        <div style={{ fontSize: isMobile ? 10 : 11, color: C.textTertiary, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{detail}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {stale && !isMobile && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: C.surfaceBg, border: `1px solid ${C.border}`, color: C.textTertiary }}>
            last known
          </span>
        )}
        <span style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: valueColor, textAlign: "right" as const, whiteSpace: "nowrap" as const }}>{status}</span>
      </div>
    </div>
  );
}

function AlarmCard({ alarm, isMobile = false }: { alarm: Alarm; isMobile?: boolean }) {
  const crit = alarm.severity === "critical";
  return (
    <div style={{ background: crit ? C.redBg : C.amberBg, border: `1px solid ${crit ? C.redBorder : C.amberBorder}`, borderRadius: 10, padding: isMobile ? "10px 12px" : "12px 16px", marginBottom: 8 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: crit ? C.redDot : C.amberDot, flexShrink: 0, marginTop: 4 }} />
        <div>
          <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: crit ? C.redTitle : C.amberTitle, marginBottom: 3 }}>{alarm.message}</div>
          <div style={{ fontSize: isMobile ? 11 : 12, color: crit ? C.redAction : C.amberAction }}>{alarm.action}</div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: C.textTertiary, textTransform: "uppercase" as const, letterSpacing: "0.8px", marginBottom: 10 }}>
      {text}
    </div>
  );
}

// ─── No-data banner ───────────────────────────────────────────────────────────

function NoDataBanner({ lastSeen, isBlocked, isMobile }: {
  lastSeen: Date | null; isBlocked: boolean; isMobile: boolean;
}) {
  const bg     = isBlocked ? C.redBg     : C.amberBg;
  const border = isBlocked ? C.redBorder : C.amberBorder;
  const dot    = isBlocked ? C.redDot    : C.amberDot;
  const title  = isBlocked ? C.redTitle  : C.amberTitle;
  const action = isBlocked ? C.redAction : C.amberAction;

  const msg = isBlocked
    ? `No data received for 7+ days${lastSeen ? ` (last seen ${formatTimeAgo(lastSeen)})` : ""}`
    : `No data for 3+ days${lastSeen ? ` (last seen ${formatTimeAgo(lastSeen)})` : ""}`;

  const act = isBlocked
    ? "Check device connectivity and SIM card — device may be offline"
    : "Data may be outdated — alarms shown below are based on last known values";

  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: isMobile ? "10px 12px" : "12px 16px", marginBottom: 8 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot, flexShrink: 0, marginTop: 4 }} />
        <div>
          <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: title, marginBottom: 3 }}>{msg}</div>
          <div style={{ fontSize: isMobile ? 11 : 12, color: action }}>{act}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GreenXHealthPanel({ deviceType, deviceModel, telemetry }: GreenXHealthPanelProps) {
  const isMobile = useIsMobile();
  const [setCurrent, setSetCurrent] = useState<number | null>(null);
  const [editing, setEditing]       = useState(false);
  const [inputVal, setInputVal]     = useState("");
  const [expanded, setExpanded]     = useState(true);

  const cellShortSinceRef    = useRef<number | null>(null);
  const bubblerShortSinceRef = useRef<number | null>(null);
  const tankShortSinceRef    = useRef<number | null>(null);

  const isFMC650 = deviceType === "FMC650";
  const isFMB150 = deviceType === "FMB150";
  const isMini   = deviceModel === "MINI";
  const isEOW    = deviceModel === "EOW";

  const validFMC650Models = ["380KVA", "625KVA", "1500KVA", "EOW"];
  const validFMB150Models = ["MINI", "EOW"];
  if (isFMC650 && !validFMC650Models.includes(deviceModel)) return null;
  if (isFMB150 && !validFMB150Models.includes(deviceModel)) return null;
  if (!isFMC650 && !isFMB150) return null;

  // ── Data freshness ────────────────────────────────────────────────────────
  const lastSeen      = getLatestTimestamp(telemetry);
  const dataAgeMs     = lastSeen ? Date.now() - lastSeen.getTime() : Infinity;
  const isDataBlocked = dataAgeMs >= STALE_BLOCK_MS;   // 7d — suppress alarms
  const isDataWarn    = dataAgeMs >= STALE_WARN_MS;     // 3d — show warning banner

  // ── Derived signals ───────────────────────────────────────────────────────
  const din1  = getIO(telemetry, 1);
  const din2  = getIO(telemetry, 2);
  const din4  = getIO(telemetry, 4);
  const ain3  = getIO(telemetry, 11);
  const dout1 = getIO(telemetry, 179);

  const ain1A     = isFMC650 ? calcCurrentFMC650(telemetry) : calcCurrentFMB150(telemetry);
  const isRunning = din1 === 1 && ain1A !== null && ain1A > 2;

  const hasMainTankDevice = deviceModel === "380KVA" || deviceModel === "625KVA" || isEOW;

  // ── Update sustained timers (only when data is fresh enough) ──────────────
  if (isFMC650 && !isDataBlocked) {
    const now = Date.now();

    const cellIsShort    = isRunning && din2 === 0;
    const bubblerIsShort = isRunning && hasMainTankDevice && din4 === 0;
    const tankIsShort    = isRunning && hasMainTankDevice && ain3 !== null && ain3 > 20;

    if (cellIsShort && cellShortSinceRef.current === null)
      cellShortSinceRef.current = now;
    else if (!cellIsShort)
      cellShortSinceRef.current = null;

    if (bubblerIsShort && bubblerShortSinceRef.current === null)
      bubblerShortSinceRef.current = now;
    else if (!bubblerIsShort)
      bubblerShortSinceRef.current = null;

    if (tankIsShort && tankShortSinceRef.current === null)
      tankShortSinceRef.current = now;
    else if (!tankIsShort)
      tankShortSinceRef.current = null;
  }

  // ── Alarms — suppressed entirely if data is 7+ days old ──────────────────
  const alarms = isDataBlocked ? [] : (
    isFMC650
      ? computeAlarmsFMC650(telemetry, deviceModel, setCurrent, {
          cellShortSince:    cellShortSinceRef.current,
          bubblerShortSince: bubblerShortSinceRef.current,
          tankShortSince:    tankShortSinceRef.current,
        })
      : computeAlarmsFMB150(telemetry)
  );

  const hasAlarms   = alarms.length > 0 || isDataBlocked;
  const hasCritical = alarms.some((a) => a.severity === "critical") || isDataBlocked;

  // ── Header badge ──────────────────────────────────────────────────────────
  const dotColor = isDataBlocked ? C.grayDot
    : hasCritical ? C.redDot
    : hasAlarms   ? C.amberDot
    : isDataWarn  ? C.amberDot
    : telemetry.length === 0 ? C.grayDot
    : C.greenDot;

  const badgeBg = isDataBlocked ? C.surfaceBg
    : hasCritical ? C.redBg
    : hasAlarms || isDataWarn ? C.amberBg
    : C.greenBg;

  const badgeBorder = isDataBlocked ? C.border
    : hasCritical ? C.redBorder
    : hasAlarms || isDataWarn ? C.amberBorder
    : C.greenBorder;

  const badgeTextColor = isDataBlocked ? C.grayText
    : hasCritical ? C.redText
    : hasAlarms || isDataWarn ? C.amberText
    : C.greenText;

  const badgeLabel = isDataBlocked
    ? "No data (7d+)"
    : isDataWarn
    ? `Data stale (3d+)${alarms.length > 0 ? ` · ${alarms.length} alert${alarms.length !== 1 ? "s" : ""}` : ""}`
    : hasCritical
    ? `${alarms.length} alert${alarms.length !== 1 ? "s" : ""}`
    : alarms.length > 0
    ? `${alarms.length} warning${alarms.length !== 1 ? "s" : ""}`
    : "Healthy";

  const productName = isEOW ? "GreenDrive Neo" : isMini ? "GreenDrive Mini" : "GreenX";
  const unitLabel   = isEOW ? "Engine" : "DG set";
  const modelBadge  = isEOW ? "Engine on Wheels" : isMini ? "Mini (FMB150)" : deviceModel;

  const subline = isDataBlocked
    ? `Last seen: ${lastSeen ? formatTimeAgo(lastSeen) : "never"}`
    : isRunning
    ? `Running · ${ain1A !== null ? ain1A + " A output" : "—"}`
    : din1 === 1 ? `${unitLabel} ON · no output`
    : `${unitLabel} OFF`;

  // ── FMC650 signal display ─────────────────────────────────────────────────
  const cellWaterOk   = din2 !== null ? din2 === 1 : null;
  const cellLabel     = din2 === null ? "Unknown" : din2 === 1 ? "OK — full" : "Short";
  const bubblerOk     = din4 !== null ? din4 === 1 : null;
  const bubblerLabel  = din4 === null ? "Unknown" : din4 === 1 ? "OK — full" : "Short";
  const mainTankOk    = ain3 !== null ? ain3 < 20 : null;
  const mainTankLabel = ain3 === null ? "Unknown" : ain3 < 20 ? "OK — full" : "Low — shortage";
  const remoteOk      = dout1 !== null ? dout1 === 0 : null;
  const remoteLabel   = dout1 === null ? "Unknown" : dout1 === 0 ? "Working" : "Remotely shutdown";

  // ── FMB150 water display ──────────────────────────────────────────────────
  const ain2raw        = isFMB150 ? getRawIO(telemetry, 6) : null;
  const ain2V          = ain2raw !== null ? ain2raw * 0.001 : null;
  const miniWaterOk    = ain2V !== null ? ain2V <= 20 : null;
  const miniWaterLabel = ain2V === null ? "Unknown" : ain2V <= 20 ? "OK — full" : "Low — shortage";

  // ── Setpoint ──────────────────────────────────────────────────────────────
  const deviation       = setCurrent !== null && ain1A !== null ? Math.abs(ain1A - setCurrent) : null;
  const withinTolerance = deviation !== null && setCurrent !== null ? deviation <= setCurrent * 0.1 : null;
  const miniHealthy     = isMini && ain1A !== null && ain1A > 2 ? ain1A >= 9 && ain1A <= 11 : null;

  const stale = din1 !== 1;

  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>

      {/* ── Header ── */}
      <div
        onClick={() => setExpanded((p) => !p)}
        style={{ padding: isMobile ? "12px 14px" : "14px 20px", borderBottom: expanded ? `1px solid ${C.border}` : "none", cursor: "pointer", userSelect: "none", background: C.white }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
          <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: C.textPrimary }}>
            {productName} system health
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: badgeBg, border: `1px solid ${badgeBorder}`, color: badgeTextColor }}>
            {badgeLabel}
          </span>
          {!isMobile && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: C.surfaceBg, border: `1px solid ${C.border}`, color: C.textSecond }}>
              {modelBadge}
            </span>
          )}
          {isMini && !isMobile && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>
              Beta
            </span>
          )}
          <span style={{ marginLeft: "auto", fontSize: 13, color: C.textTertiary, flexShrink: 0 }}>{expanded ? "▾" : "▸"}</span>
        </div>
        <div style={{ marginTop: 4, marginLeft: 18, fontSize: isMobile ? 11 : 12, color: isDataBlocked ? C.grayText : C.textSecond, fontWeight: 500 }}>
          {subline}
        </div>
      </div>

      {expanded && (
        <>
          {/* ── No-data / stale-data banners ── */}
          {(isDataBlocked || isDataWarn) && (
            <div style={{ padding: isMobile ? "12px 14px" : "16px 20px", borderBottom: `1px solid ${C.border}`, background: C.white }}>
              <NoDataBanner lastSeen={lastSeen} isBlocked={isDataBlocked} isMobile={isMobile} />
            </div>
          )}

          {/* ── Active alerts (only when data fresh enough) ── */}
          {!isDataBlocked && alarms.length > 0 && (
            <div style={{ padding: isMobile ? "12px 14px" : "16px 20px", borderBottom: `1px solid ${C.border}`, background: C.white }}>
              <SectionLabel text="Active alerts" />
              {alarms.map((a) => <AlarmCard key={a.id} alarm={a} isMobile={isMobile} />)}
            </div>
          )}

          {/* ── System signals ── */}
          <div style={{ padding: isMobile ? "12px 14px" : "16px 20px", borderBottom: `1px solid ${C.border}`, background: C.white }}>
            <SectionLabel text={isDataBlocked ? "Last known signals" : "System signals"} />

            <SignalRow label={isEOW ? "Engine status" : "DG set (genset)"} detail="Din.1 — run status"
              status={din1 === null ? "Unknown" : din1 === 1 ? "ON" : "OFF"}
              ok={din1 === null ? null : din1 === 1} isMobile={isMobile} stale={isDataBlocked} />
            <SignalRow label="System running" detail="Din.1 = ON & Ain.1 > 2 A"
              status={isRunning ? "Running" : din1 === 1 ? `${unitLabel} ON — no output` : "Stopped"}
              ok={isRunning ? true : din1 === null ? null : false}
              stale={stale || isDataBlocked} isMobile={isMobile} />
            <SignalRow label="Output current" detail={isFMC650 ? "Ain.1 → (V / 47) × 1000" : "Ain.1 → V / 83"}
              status={ain1A !== null ? `${ain1A} A` : "—"}
              ok={isMini ? (ain1A !== null && ain1A > 2 ? miniHealthy : null) : ain1A !== null ? ain1A > 2 : null}
              stale={stale || isDataBlocked} isMobile={isMobile} />
            {isMini && ain1A !== null && ain1A > 2 && (
              <SignalRow label="Current health range" detail="Healthy: 9–11 A"
                status={miniHealthy ? "Within 9–11 A" : `Out of range (${ain1A} A)`}
                ok={miniHealthy} stale={stale || isDataBlocked} isMobile={isMobile} />
            )}
            <SignalRow label="Remote shutdown" detail="Dout.1 — remote control status"
              status={remoteLabel} ok={remoteOk}
              stale={stale || isDataBlocked} isMobile={isMobile} />
            {isFMC650 && (
              <SignalRow label="Cell body water" detail="Din.2 — electrolyser cell (1=OK, 0=short)"
                status={cellLabel} ok={cellWaterOk}
                stale={stale || isDataBlocked} isMobile={isMobile} />
            )}
            {isMini && (
              <SignalRow label="Internal water level" detail="Ain.2 — cell body water (<20 V = full)"
                status={miniWaterLabel} ok={miniWaterOk}
                stale={stale || isDataBlocked} isMobile={isMobile} />
            )}
            {isFMC650 && hasMainTankDevice && (
              <>
                <SignalRow label="Main water tank" detail="Ain.3 — main tank level (<20 = full)"
                  status={mainTankLabel} ok={mainTankOk}
                  stale={stale || isDataBlocked} isMobile={isMobile} />
                <SignalRow label="Bubbler water" detail="Din.4 — bubbler level (1=OK, 0=short)"
                  status={bubblerLabel} ok={bubblerOk}
                  stale={stale || isDataBlocked} isMobile={isMobile} />
              </>
            )}
          </div>

          {/* ── Setpoint / healthy range ── */}
          <div style={{ padding: isMobile ? "12px 14px" : "16px 20px", background: C.pageBg }}>
            {isFMC650 ? (
              <>
                <SectionLabel text="Current setpoint" />
                {editing ? (
                  <div style={{ display: "flex", flexDirection: isMobile ? "column" as const : "row" as const, alignItems: isMobile ? "stretch" : "center", gap: 8 }}>
                    <input type="number" value={inputVal} onChange={(e) => setInputVal(e.target.value)}
                      placeholder="Enter set current (A)" autoFocus
                      style={{ flex: 1, padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: isMobile ? 14 : 13, color: C.textPrimary, background: C.white, outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => { const v = parseFloat(inputVal); if (!isNaN(v) && v > 0) setSetCurrent(v); setEditing(false); setInputVal(""); }}
                        style={{ flex: isMobile ? 1 : undefined, padding: "8px 16px", background: "#16a34a", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                        Save</button>
                      <button onClick={() => { setEditing(false); setInputVal(""); }}
                        style={{ flex: isMobile ? 1 : undefined, padding: "8px 14px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textSecond, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                        Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
                    <span style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: C.textPrimary }}>
                      {setCurrent !== null ? `${setCurrent} A` : "Not configured"}
                    </span>
                    {withinTolerance !== null && deviation !== null && (
                      <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: withinTolerance ? C.greenBg : C.amberBg, border: `1px solid ${withinTolerance ? C.greenBorder : C.amberBorder}`, color: withinTolerance ? C.greenText : C.amberText }}>
                        {withinTolerance ? "Within ±10%" : `${deviation.toFixed(0)} A ${ain1A! < setCurrent! ? "under" : "over"}`}
                      </span>
                    )}
                    <button onClick={() => setEditing(true)}
                      style={{ marginLeft: isMobile ? 0 : "auto", padding: "7px 14px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textSecond, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      {setCurrent !== null ? "Edit" : "Configure"}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <SectionLabel text="Healthy current range" />
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
                  <span style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: C.textPrimary }}>9 – 11 A</span>
                  {ain1A !== null && ain1A > 2 && (
                    <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: miniHealthy ? C.greenBg : C.amberBg, border: `1px solid ${miniHealthy ? C.greenBorder : C.amberBorder}`, color: miniHealthy ? C.greenText : C.amberText }}>
                      {miniHealthy ? `✓ ${ain1A} A — within range` : `${ain1A} A — out of range`}
                    </span>
                  )}
                  <span style={{ marginLeft: isMobile ? 0 : "auto", fontSize: 11, color: C.textTertiary }}>Fixed per device spec</span>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}