"use client";

// ============================================================================
// DG TWIN — a live digital twin of a diesel generator fitted with GreenX
// ----------------------------------------------------------------------------
// Shown as the TWIN tab when asset_name === "DG". Everything on the drawing is
// driven by the same telemetry the Telemetry tab and HealthPanel read:
//
//   Din.1  (io 1)    genset run status              → engine, exhaust, controller
//   Ain.1  (io 9)    electrolyser current, raw mV   → cell bubbles, gas flow, HHO A
//   Din.2  (io 2)    cell water, 0 = short          → cell water level   (FMC650)
//   Din.4  (io 4)    bubbler water, 0 = short       → bubbler level      (FMC650)
//   Ain.3  (io 11)   main tank, > 20 V = low        → tank level         (FMC650, tank models)
//   Ain.2  (io 6)    single water level, > 20 V low → cell water level   (FMB150 / FMB120)
//   Dout.1 (io 179)  remote stop relay              → relay LED
//   io 66 / 67 / 21  supply V, tracker battery V, GSM %
//
// Water inputs are level switches, not gauges, so levels are drawn as two
// states (full / short) rather than a made-up percentage.
//
// The savings panel is an ESTIMATE and says so: these units meter no fuel (no
// CAN adapter on the genset controller — see DG_ANALYTICS.md). It multiplies
// measured run hours by an assumed burn rate and an assumed saving, and every
// assumption is on screen and editable.
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Device } from "@/types";
import { currentDivisorFor } from "@/lib/dg-metrics";
import { useIsMobile } from "@/hooks/useIsMobile";

interface TelemetryParam {
  name: string;
  value: string;
  raw_value?: string;
  io_id?: number;
  timestamp?: string;
}

interface DgTwinTabProps {
  device: Device;
  telemetry: TelemetryParam[];
}

interface TrendPoint { t: string; amps: number | null; on: 0 | 1 | null }

// ─── Palette (after the GreenVision twin concept) ────────────────────────────

const K = {
  bg: "#080c10",
  panel: "#0d1318",
  panel2: "#111a20",
  line: "#1c2a33",
  text: "#e6edf3",
  dim: "#8b9aa6",
  faint: "#55636e",
  green: "#1B6B3D",
  greenHi: "#2fbf71",
  yellow: "#FFD700",
  amber: "#f5a524",
  red: "#ef4444",
  blue: "#2f80ed",
  water: "#3aa0ff",
  steel: "#2b3138",
  mono: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  sans: "'IBM Plex Sans', system-ui, -apple-system, Segoe UI, sans-serif",
};

/** Packets older than this and the twin is drawn as last-known, not live. */
const STALE_MS = 15 * 60 * 1000;
const LOAD_A = 2;
const DIESEL_CO2_KG_PER_L = 2.68;

// Assumed diesel burn at typical site load, by rating. Only a starting value
// for the estimate; the viewer can change it and the change is remembered.
const DEFAULT_BURN_LPH: Record<string, number> = {
  "380KVA": 45, "625KVA": 75, "1500KVA": 180, MINI: 8, EOW: 12,
};

/** Same model detection the Telemetry tab uses for HealthPanel. */
export function dgModelFor(device: Device): string {
  const n = device.device_name || "";
  if (n.includes("1500")) return "1500KVA";
  if (n.includes("625")) return "625KVA";
  if (device.asset_name === "EOW") return "EOW";
  if (device.device_type === "FMB150" || device.device_type === "FMB120") return "MINI";
  return "380KVA";
}

// ─── Signal helpers ──────────────────────────────────────────────────────────

function io(t: TelemetryParam[], id: number): number | null {
  const p = t.find((x) => x.io_id === id);
  if (!p) return null;
  const v = parseFloat(p.value);
  return isNaN(v) ? null : v;
}

function ioRaw(t: TelemetryParam[], id: number): number | null {
  const p = t.find((x) => x.io_id === id);
  if (!p) return null;
  const v = parseFloat(p.raw_value ?? p.value);
  return isNaN(v) ? null : v;
}

function latest(t: TelemetryParam[]): number | null {
  let m = 0;
  for (const p of t) {
    const v = p.timestamp ? new Date(p.timestamp).getTime() : NaN;
    if (!isNaN(v) && v > m) m = v;
  }
  return m || null;
}

function ago(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

function hm(h: number | null | undefined): string {
  if (h === null || h === undefined || !isFinite(h)) return "—";
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60), mm = total % 60;
  return hh === 0 ? `${mm}m` : `${hh}h ${String(mm).padStart(2, "0")}m`;
}

const nf = (v: number, dp = 0) =>
  v.toLocaleString("en-IN", { minimumFractionDigits: dp, maximumFractionDigits: dp });

type Tone = "ok" | "warn" | "bad" | "off" | "na";
const toneColor: Record<Tone, string> = {
  ok: K.greenHi, warn: K.amber, bad: K.red, off: K.faint, na: K.faint,
};

// ─── Twin state, derived once per telemetry update ───────────────────────────

interface TwinState {
  model: string;
  hasBubbler: boolean;
  hasMainTank: boolean;
  running: boolean | null;
  amps: number | null;
  producing: boolean;
  setAmps: number | null;
  band: "in" | "under" | "over" | "unset" | "idle";
  cellWater: boolean | null;     // true = full
  bubblerWater: boolean | null;
  tankFull: boolean | null;
  remoteStop: boolean | null;
  supplyV: number | null;
  batteryV: number | null;
  gsm: number | null;
  issues: { tone: Tone; text: string }[];
}

function deriveState(device: Device, t: TelemetryParam[]): TwinState {
  const model = dgModelFor(device);
  const isFMC = device.device_type === "FMC650";
  const divisor = currentDivisorFor(device.device_type);
  const hasBubbler = isFMC;
  const hasMainTank = isFMC && (model === "380KVA" || model === "625KVA" || model === "EOW");

  const din1 = io(t, 1);
  const raw = ioRaw(t, 9);
  const amps = raw === null ? null : parseFloat((raw / divisor).toFixed(1));
  const running = din1 === null ? null : din1 === 1;
  const producing = amps !== null && amps > LOAD_A;

  const setRaw = device.set_ain1_raw ?? null;
  const setAmps = setRaw === null ? null : parseFloat((setRaw / divisor).toFixed(1));
  let band: TwinState["band"] = "idle";
  if (running && producing) {
    if (setRaw === null || raw === null) band = "unset";
    else if (raw < setRaw * 0.9) band = "under";
    else if (raw > setRaw * 1.1) band = "over";
    else band = "in";
  }

  let cellWater: boolean | null;
  if (isFMC) {
    const d2 = io(t, 2);
    cellWater = d2 === null ? null : d2 === 1;
  } else {
    const a2 = io(t, 6);
    cellWater = a2 === null ? null : a2 <= 20;
  }
  const d4 = hasBubbler ? io(t, 4) : null;
  const bubblerWater = d4 === null ? null : d4 === 1;
  const a3 = hasMainTank ? io(t, 11) : null;
  const tankFull = a3 === null ? null : a3 <= 20;
  const d1o = io(t, 179);
  const remoteStop = d1o === null ? null : d1o === 1;

  const issues: TwinState["issues"] = [];
  if (running === false && producing)
    issues.push({ tone: "bad", text: "Current detected while the DG set is off" });
  if (running && !producing && !remoteStop)
    issues.push({ tone: "bad", text: hasMainTank && tankFull === false
      ? "Hydrogen system stopped: main water tank is empty"
      : "DG set running but the hydrogen cell has no output" });
  if (running && remoteStop)
    issues.push({ tone: "warn", text: "Remote stop is on: hydrogen output held off" });
  if (running && cellWater === false)
    issues.push({ tone: "warn", text: "Electrolyser water is short" });
  if (running && bubblerWater === false)
    issues.push({ tone: "warn", text: "Bubbler water is short" });
  if (running && hasMainTank && tankFull === false && producing)
    issues.push({ tone: "warn", text: "Main water tank is low" });
  if (band === "under" || band === "over")
    issues.push({ tone: "warn", text: `Cell current ${band} the set point (±10%)` });

  return {
    model, hasBubbler, hasMainTank, running, amps, producing, setAmps, band,
    cellWater, bubblerWater, tankFull, remoteStop,
    supplyV: io(t, 66), batteryV: io(t, 67), gsm: io(t, 21), issues,
  };
}

// ─── Scene ───────────────────────────────────────────────────────────────────

const CSS = `
@keyframes gxt-flow { to { stroke-dashoffset: -40; } }
@keyframes gxt-spin { to { transform: rotate(360deg); } }
@keyframes gxt-rise { 0% { transform: translateY(0); opacity: 0; } 15% { opacity: .9; } 100% { transform: translateY(-92px); opacity: 0; } }
@keyframes gxt-smoke { 0% { transform: translate(0,0) scale(.5); opacity: 0; } 20% { opacity: .55; } 100% { transform: translate(-30px,-70px) scale(1.8); opacity: 0; } }
@keyframes gxt-shake { 0%,100% { transform: translate(0,0); } 25% { transform: translate(.6px,-.5px); } 75% { transform: translate(-.6px,.5px); } }
@keyframes gxt-pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
.gxt-flow { stroke-dasharray: 10 10; animation: gxt-flow .9s linear infinite; }
.gxt-spin { transform-box: fill-box; transform-origin: center; animation: gxt-spin 1.1s linear infinite; }
.gxt-bubble { transform-box: fill-box; animation: gxt-rise 2.2s ease-in infinite; }
.gxt-smoke { transform-box: fill-box; transform-origin: center; animation: gxt-smoke 3s ease-out infinite; }
.gxt-shake { animation: gxt-shake .18s linear infinite; }
.gxt-pulse { animation: gxt-pulse 1.4s ease-in-out infinite; }
.gxt-paused * { animation-play-state: paused !important; }
`;

function Bubbles({ x, y, w, n, live }: { x: number; y: number; w: number; n: number; live: boolean }) {
  if (!live) return null;
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} className="gxt-bubble" cx={x + ((i * 37) % w)} cy={y} r={1.6 + (i % 3) * 0.7}
          fill="#cfe9ff" style={{ animationDelay: `${(i * 0.29) % 2.2}s` }} />
      ))}
    </g>
  );
}

function Scene({ s, live }: { s: TwinState; live: boolean }) {
  const run = !!s.running && live;
  const gas = run && s.producing && !s.remoteStop;
  const lvl = (full: boolean | null) => (full === null ? 0.5 : full ? 0.82 : 0.22);
  const waterTone = (full: boolean | null) => (full === null ? K.faint : full ? K.water : K.amber);
  const stateText = (full: boolean | null) => (full === null ? "NO DATA" : full ? "OK" : "SHORT");

  // Cell: x 690..790, y 322..442
  const cellH = 120, cellY = 322;
  const cellFill = lvl(s.cellWater) * cellH;
  // Bubbler: x 812..862, y 352..442
  const bubH = 90, bubY = 352;
  const bubFill = lvl(s.bubblerWater) * bubH;
  // Tank: x 978..1046, y 330..470
  const tankH = 140, tankY = 330;
  const tankFill = lvl(s.tankFull) * tankH;

  const hose = "M 812 372 H 640 Q 622 372 622 354 V 156 Q 622 138 604 138 H 198 Q 180 138 180 156 V 222";

  return (
    <svg viewBox="0 0 1060 520" style={{ width: "100%", height: "auto", display: "block" }}
      className={live ? undefined : "gxt-paused"} role="img"
      aria-label="Digital twin of the DG set and GreenX hydrogen unit">
      <defs>
        <linearGradient id="gxt-canopy" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#38414a" /><stop offset="1" stopColor="#22282e" />
        </linearGradient>
        <linearGradient id="gxt-gx" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#114a2e" /><stop offset="1" stopColor="#0a2e1c" />
        </linearGradient>
        <filter id="gxt-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <pattern id="gxt-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#0f1a21" strokeWidth="1" />
        </pattern>
        <clipPath id="gxt-cell"><rect x="690" y={cellY} width="100" height={cellH} rx="4" /></clipPath>
        <clipPath id="gxt-bub"><rect x="812" y={bubY} width="50" height={bubH} rx="10" /></clipPath>
        <clipPath id="gxt-tank"><rect x="978" y={tankY} width="68" height={tankH} rx="8" /></clipPath>
      </defs>

      <rect width="1060" height="520" fill="url(#gxt-grid)" />
      {/* Ground and plinths */}
      <rect x="0" y="470" width="1060" height="50" fill="#0b1115" />
      <line x1="0" y1="470" x2="1060" y2="470" stroke={K.line} strokeWidth="2" />
      <rect x="44" y="470" width="552" height="14" fill="#1a2128" />
      <rect x="652" y="470" width="400" height="10" fill="#1a2128" />

      {/* Hydrogen line: GreenX bubbler → engine air intake */}
      <path d={hose} fill="none" stroke="#1d4f8f" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <path d={hose} fill="none" stroke={K.blue} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      {gas && <path d={hose} fill="none" stroke="#5fb0ff" strokeWidth="10" opacity="0.45" filter="url(#gxt-glow)" />}
      {gas && <path d={hose} fill="none" stroke="#d6ecff" strokeWidth="2.5" className="gxt-flow" strokeLinecap="round" />}
      <text x="340" y="128" textAnchor="middle" fill={gas ? "#9fd0ff" : K.faint} fontFamily={K.mono} fontSize="12" letterSpacing="1">
        {gas ? "H₂ / O₂  →  ENGINE AIR INTAKE" : "HYDROGEN LINE  ·  NO FLOW"}
      </text>

      {/* ── DG set ── */}
      <g>
        <rect x="60" y="170" width="520" height="300" rx="6" fill="url(#gxt-canopy)" stroke="#47515b" />
        {Array.from({ length: 9 }, (_, i) => (
          <rect key={i} x="66" y={182 + i * 30} width="16" height="18" rx="2" fill="#1b2026" />
        ))}
        {/* Cut-away */}
        <rect x="96" y="208" width="336" height="236" rx="4" fill="#0f1418" stroke="#3a434c" strokeDasharray="4 3" />
        <g className={run ? "gxt-shake" : undefined}>
          {/* Air filter / intake */}
          <rect x="150" y="222" width="60" height="30" rx="8" fill="#5d6873" stroke="#7d8893" />
          <text x="180" y="241" textAnchor="middle" fill="#0f1418" fontFamily={K.mono} fontSize="9" fontWeight="700">AIR</text>
          {/* Head and block */}
          <rect x="118" y="256" width="160" height="36" rx="4" fill="#56616c" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={126 + i * 25} y="262" width="18" height="24" rx="3" fill="#434d57" />
          ))}
          <rect x="110" y="292" width="176" height="122" rx="6" fill="#47525d" />
          <rect x="124" y="306" width="148" height="10" rx="3" fill="#3a434c" />
          <rect x="124" y="324" width="148" height="10" rx="3" fill="#3a434c" />
          <text x="198" y="376" textAnchor="middle" fill="#9aa6b1" fontFamily={K.mono} fontSize="13" fontWeight="600">DIESEL ENGINE</text>
          {/* Alternator */}
          <rect x="294" y="292" width="124" height="122" rx="10" fill="#36404a" />
          <circle cx="356" cy="353" r="42" fill="#232a31" stroke="#56616c" strokeWidth="3" />
          <g className={run ? "gxt-spin" : undefined}>
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <path key={a} d="M 356 353 L 356 318 A 9 9 0 0 1 368 324 Z" fill="#6b7682" transform={`rotate(${a} 356 353)`} />
            ))}
            <circle cx="356" cy="353" r="7" fill="#9aa6b1" />
          </g>
          <text x="356" y="432" textAnchor="middle" fill="#9aa6b1" fontFamily={K.mono} fontSize="11">ALTERNATOR</text>
        </g>

        {/* Genset controller */}
        <rect x="448" y="208" width="116" height="104" rx="5" fill="#161c21" stroke="#4b555f" />
        <rect x="456" y="216" width="100" height="72" rx="3" fill="#06100a" />
        <text x="462" y="232" fill="#5fa77a" fontFamily={K.mono} fontSize="9" letterSpacing="1">GENSET  Din.1</text>
        <text x="462" y="256" fill={s.running === null ? K.faint : run ? K.greenHi : "#c9d1d9"} fontFamily={K.mono} fontSize="17" fontWeight="700">
          {s.running === null ? "—" : s.running ? "RUNNING" : "STOPPED"}
        </text>
        <text x="462" y="278" fill="#5fa77a" fontFamily={K.mono} fontSize="10">
          DC {s.supplyV === null ? "—" : `${s.supplyV.toFixed(1)} V`}
        </text>
        <circle cx="468" cy="300" r="5" fill={run ? K.greenHi : "#2a3138"} className={run ? "gxt-pulse" : undefined} />
        <text x="480" y="303" fill={K.dim} fontFamily={K.mono} fontSize="9">RUN</text>
        <text x="512" y="303" fill={K.dim} fontFamily={K.mono} fontSize="9">{s.model}</text>
        {/* Louvres */}
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x="452" y={328 + i * 15} width="108" height="6" rx="2" fill="#1b2026" />
        ))}
        <text x="320" y="462" textAnchor="middle" fill={K.dim} fontFamily={K.sans} fontSize="13" fontWeight="600" letterSpacing="2">
          DIESEL GENERATOR  ·  {s.model}
        </text>
      </g>

      {/* Exhaust stack and smoke (drawn after the hose so it sits in front) */}
      <rect x="500" y="62" width="26" height="108" fill="#4a535c" />
      <rect x="495" y="56" width="36" height="10" rx="2" fill="#5d6873" />
      {run && [0, 1, 2, 3].map((i) => (
        <circle key={i} className="gxt-smoke" cx="513" cy="50" r="10" fill="#9aa3ab"
          style={{ animationDelay: `${i * 0.75}s` }} />
      ))}

      {/* Run signal cable */}
      <path d="M 564 286 C 600 286, 610 300, 652 300" fill="none" stroke={K.amber} strokeWidth="2" strokeDasharray="5 4" opacity="0.8" />
      <text x="600" y="320" textAnchor="middle" fill={K.amber} fontFamily={K.mono} fontSize="9" opacity="0.9">RUN SIGNAL</text>

      {/* ── GreenX unit ── */}
      <g>
        <rect x="652" y="196" width="306" height="274" rx="8" fill="url(#gxt-gx)" stroke={K.green} strokeWidth="2" />
        <rect x="652" y="196" width="306" height="44" rx="8" fill="#0a2618" />
        <text x="668" y="214" fill="#7fc79c" fontFamily={K.sans} fontSize="10" letterSpacing="2">SGT</text>
        <text x="668" y="233" fill="#ffffff" fontFamily={K.sans} fontSize="20" fontWeight="700">
          Green<tspan fill={K.yellow}>X</tspan>
        </text>
        <text x="942" y="224" textAnchor="end" fill="#7fc79c" fontFamily={K.mono} fontSize="10">HYDROGEN UNIT</text>

        {/* Display */}
        <rect x="668" y="248" width="274" height="58" rx="4" fill="#04100a" stroke="#1f5a3a" />
        <text x="678" y="264" fill="#5fa77a" fontFamily={K.mono} fontSize="9" letterSpacing="1">CELL CURRENT  Ain.1</text>
        <text x="678" y="294" fill={gas ? K.greenHi : "#c9d1d9"} fontFamily={K.mono} fontSize="26" fontWeight="700">
          {s.amps === null ? "—" : s.amps.toFixed(1)}<tspan fontSize="14"> A</tspan>
        </text>
        <text x="932" y="270" textAnchor="end" fill="#5fa77a" fontFamily={K.mono} fontSize="10">
          SET {s.setAmps === null ? "—" : `${s.setAmps.toFixed(1)} A`}
        </text>
        <text x="932" y="294" textAnchor="end" fontFamily={K.mono} fontSize="11" fontWeight="700"
          fill={s.band === "in" ? K.greenHi : s.band === "under" || s.band === "over" ? K.amber : K.faint}>
          {s.band === "in" ? "IN BAND ±10%" : s.band === "under" ? "BELOW BAND" : s.band === "over" ? "ABOVE BAND"
            : s.band === "unset" ? "NO SET POINT" : gas ? "" : "IDLE"}
        </text>

        {/* Electrolyser cell */}
        <rect x="690" y={cellY} width="100" height={cellH} rx="4" fill="#0b1a24" />
        <g clipPath="url(#gxt-cell)">
          <rect x="690" y={cellY + cellH - cellFill} width="100" height={cellFill} fill={waterTone(s.cellWater)} opacity="0.45" />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <rect key={i} x={698 + i * 13} y={cellY + 10} width="4" height={cellH - 16} fill="#8d99a5" />
          ))}
          <Bubbles x={696} y={cellY + cellH - 6} w={88} n={14} live={gas} />
        </g>
        <rect x="690" y={cellY} width="100" height={cellH} rx="4" fill="none" stroke="#5c8a73" />
        <text x="740" y="458" textAnchor="middle" fill={K.dim} fontFamily={K.mono} fontSize="10">ELECTROLYSER</text>
        <text x="740" y={cellY - 6} textAnchor="middle" fill={waterTone(s.cellWater)} fontFamily={K.mono} fontSize="10" fontWeight="700">
          WATER {stateText(s.cellWater)}
        </text>

        {/* Bubbler */}
        {s.hasBubbler && (
          <g>
            <rect x="812" y={bubY} width="50" height={bubH} rx="10" fill="#0b1a24" />
            <g clipPath="url(#gxt-bub)">
              <rect x="812" y={bubY + bubH - bubFill} width="50" height={bubFill} fill={waterTone(s.bubblerWater)} opacity="0.45" />
              <Bubbles x={818} y={bubY + bubH - 6} w={38} n={7} live={gas} />
            </g>
            <rect x="812" y={bubY} width="50" height={bubH} rx="10" fill="none" stroke="#5c8a73" />
            <text x="837" y="458" textAnchor="middle" fill={K.dim} fontFamily={K.mono} fontSize="10">BUBBLER</text>
            <text x="837" y={bubY - 6} textAnchor="middle" fill={waterTone(s.bubblerWater)} fontFamily={K.mono} fontSize="10" fontWeight="700">
              {stateText(s.bubblerWater)}
            </text>
            <path d="M 790 420 H 812" stroke="#5c8a73" strokeWidth="4" />
          </g>
        )}

        {/* Remote stop relay */}
        <rect x="884" y="330" width="58" height="62" rx="4" fill="#0b1a24" stroke="#2c5a43" />
        <circle cx="913" cy="352" r="8" fill={s.remoteStop ? K.red : "#22302a"} className={s.remoteStop ? "gxt-pulse" : undefined} />
        <text x="913" y="376" textAnchor="middle" fill={K.dim} fontFamily={K.mono} fontSize="8">REMOTE</text>
        <text x="913" y="386" textAnchor="middle" fill={K.dim} fontFamily={K.mono} fontSize="8">STOP</text>
        <text x="913" y="408" textAnchor="middle" fill={s.remoteStop ? K.red : K.faint} fontFamily={K.mono} fontSize="10" fontWeight="700">
          {s.remoteStop === null ? "—" : s.remoteStop ? "ON" : "OFF"}
        </text>
        <text x="913" y="420" textAnchor="middle" fill={K.faint} fontFamily={K.mono} fontSize="8">Dout.1</text>
      </g>

      {/* Main water tank */}
      {s.hasMainTank && (
        <g>
          <path d="M 978 452 H 958" stroke="#5c8a73" strokeWidth="4" />
          <rect x="978" y={tankY} width="68" height={tankH} rx="8" fill="#0b1a24" />
          <g clipPath="url(#gxt-tank)">
            <rect x="978" y={tankY + tankH - tankFill} width="68" height={tankFill} fill={waterTone(s.tankFull)} opacity="0.5" />
          </g>
          <rect x="978" y={tankY} width="68" height={tankH} rx="8" fill="none" stroke="#4f7da3" />
          <text x="1012" y="318" textAnchor="middle" fill={K.dim} fontFamily={K.mono} fontSize="10">MAIN TANK</text>
          <text x="1012" y={tankY + 26} textAnchor="middle" fill={waterTone(s.tankFull)} fontFamily={K.mono} fontSize="11" fontWeight="700">
            {s.tankFull === null ? "—" : s.tankFull ? "FULL" : "LOW"}
          </text>
          <text x="1012" y="462" textAnchor="middle" fill={K.faint} fontFamily={K.mono} fontSize="8">Ain.3</text>
        </g>
      )}
    </svg>
  );
}

// ─── Side panel rows ─────────────────────────────────────────────────────────

function Row({ label, src, value, tone }: { label: string; src: string; value: string; tone: Tone }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: `1px solid ${K.line}` }}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: toneColor[tone], flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: K.text }}>{label}</div>
        <div style={{ fontSize: 10, color: K.faint, fontFamily: K.mono }}>{src}</div>
      </div>
      <div style={{ fontFamily: K.mono, fontSize: 14, fontWeight: 600, color: tone === "ok" ? K.text : toneColor[tone] === K.faint ? K.dim : toneColor[tone], textAlign: "right" }}>
        {value}
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, letterSpacing: 2, color: "#7fc79c", fontFamily: K.mono, marginBottom: 4 }}>{title}</div>
      {children}
    </div>
  );
}

function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: K.panel, border: `1px solid ${K.line}`, borderRadius: 10, padding: 16, ...style }}>
      {children}
    </div>
  );
}

// ─── Trend strip ─────────────────────────────────────────────────────────────

function Trend({ points, setAmps, hours }: { points: TrendPoint[]; setAmps: number | null; hours: number }) {
  const W = 640, H = 170, L = 36, R = 8, T = 10, B = 22;
  if (points.length === 0) {
    return <div style={{ color: K.faint, fontSize: 12, padding: "40px 0", textAlign: "center" }}>No samples in the last {hours} h</div>;
  }
  const t0 = new Date(points[0].t).getTime();
  const t1 = Math.max(new Date(points[points.length - 1].t).getTime(), t0 + 1);
  const maxA = Math.max(5, ...(points.map((p) => p.amps ?? 0)), (setAmps ?? 0) * 1.25);
  const x = (t: string) => L + ((new Date(t).getTime() - t0) / (t1 - t0)) * (W - L - R);
  const y = (a: number) => T + (1 - a / maxA) * (H - T - B);
  const step = points.length > 1 ? (W - L - R) / (points.length - 1) : 10;

  let d = "";
  let pen = false;
  for (const p of points) {
    if (p.amps === null) { pen = false; continue; }
    d += `${pen ? "L" : "M"} ${x(p.t).toFixed(1)} ${y(p.amps).toFixed(1)} `;
    pen = true;
  }
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const ms = t0 + f * (t1 - t0);
    return { px: L + f * (W - L - R), label: new Date(ms).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }) };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {points.map((p, i) => p.on === 1 && (
        <rect key={i} x={x(p.t) - step / 2} y={T} width={step + 0.5} height={H - T - B} fill={K.green} opacity="0.22" />
      ))}
      {setAmps !== null && (
        <g>
          <rect x={L} y={y(setAmps * 1.1)} width={W - L - R} height={y(setAmps * 0.9) - y(setAmps * 1.1)} fill={K.yellow} opacity="0.08" />
          <line x1={L} x2={W - R} y1={y(setAmps)} y2={y(setAmps)} stroke={K.yellow} strokeDasharray="4 4" opacity="0.7" />
          <text x={W - R - 2} y={y(setAmps) - 4} textAnchor="end" fill={K.yellow} fontSize="9" fontFamily={K.mono}>SET {setAmps.toFixed(1)} A</text>
        </g>
      )}
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={L} x2={W - R} y1={y(maxA * f)} y2={y(maxA * f)} stroke={K.line} />
          <text x={L - 6} y={y(maxA * f) + 3} textAnchor="end" fill={K.faint} fontSize="9" fontFamily={K.mono}>{Math.round(maxA * f)}</text>
        </g>
      ))}
      <path d={d} fill="none" stroke={K.greenHi} strokeWidth="2" strokeLinejoin="round" />
      {ticks.map((tk, i) => (
        <text key={i} x={tk.px} y={H - 6} textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"} fill={K.faint} fontSize="9" fontFamily={K.mono}>{tk.label}</text>
      ))}
    </svg>
  );
}

// ─── Savings estimate ────────────────────────────────────────────────────────

interface Assumptions { burnLph: number; savingPct: number; dieselInr: number }

function NumberField({ label, value, unit, onChange, step }: {
  label: string; value: number; unit: string; step: number; onChange: (v: number) => void;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10, color: K.dim, fontFamily: K.mono, flex: 1, minWidth: 90 }}>
      {label}
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input type="number" value={value} step={step} min={0}
          onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 0) onChange(v); }}
          style={{ width: "100%", background: K.panel2, border: `1px solid ${K.line}`, borderRadius: 6, color: K.text,
            fontFamily: K.mono, fontSize: 13, padding: "5px 7px" }} />
        <span style={{ color: K.faint }}>{unit}</span>
      </span>
    </label>
  );
}

function Estimate({ runHours, days, a, setA, loading }: {
  runHours: number | null; days: number; a: Assumptions; setA: (a: Assumptions) => void; loading: boolean;
}) {
  const fuel = runHours === null ? null : runHours * a.burnLph * (a.savingPct / 100);
  const big = (v: string, unit: string, label: string, color: string) => (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontFamily: K.mono, fontSize: 24, fontWeight: 700, color }}>{v}<span style={{ fontSize: 12, color: K.dim }}> {unit}</span></div>
      <div style={{ fontSize: 11, color: K.dim, marginTop: 2 }}>{label}</div>
    </div>
  );
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: K.text }}>Savings estimate</div>
        <span style={{ fontSize: 9, fontFamily: K.mono, letterSpacing: 1.5, color: K.bg, background: K.yellow, borderRadius: 4, padding: "2px 6px", fontWeight: 700 }}>ESTIMATE</span>
        <span style={{ fontSize: 11, color: K.faint, marginLeft: "auto" }}>last {days} days</span>
      </div>
      <div data-twin="est-figures" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        {big(loading ? "…" : hm(runHours), "", "Measured run time (Din.1)", K.text)}
        {big(fuel === null ? "—" : nf(fuel), "L", "Diesel saved", K.greenHi)}
        {big(fuel === null ? "—" : nf((fuel * DIESEL_CO2_KG_PER_L) / 1000, 2), "t", "CO₂ avoided", K.greenHi)}
        {big(fuel === null ? "—" : `₹${nf(fuel * a.dieselInr)}`, "", "Fuel cost saved", K.yellow)}
      </div>
      <div data-twin="est-inputs" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <NumberField label="FUEL BURN" unit="L/h" value={a.burnLph} step={1} onChange={(v) => setA({ ...a, burnLph: v })} />
        <NumberField label="SAVING" unit="%" value={a.savingPct} step={0.5} onChange={(v) => setA({ ...a, savingPct: v })} />
        <NumberField label="DIESEL" unit="₹/L" value={a.dieselInr} step={1} onChange={(v) => setA({ ...a, dieselInr: v })} />
      </div>
      <div style={{ fontSize: 11, color: K.faint, marginTop: 10, lineHeight: 1.5 }}>
        Not measured: GreenX does not meter fuel on this set. Run time is measured; diesel saved = run time × fuel burn × saving,
        CO₂ at {DIESEL_CO2_KG_PER_L} kg per litre of diesel. Change the assumptions to match the site.
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function DgTwinTab({ device, telemetry }: DgTwinTabProps) {
  const isMobile = useIsMobile();
  const s = useMemo(() => deriveState(device, telemetry), [device, telemetry]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(id); }, []);
  const last = latest(telemetry);
  const live = last !== null && now - last < STALE_MS;

  // Trend
  const [trend, setTrend] = useState<{ points: TrendPoint[]; hours: number } | null>(null);
  const loadTrend = useCallback(async () => {
    try {
      const r = await fetch(`/api/analytics/dg/trend?device_id=${device.id}&hours=6`);
      const j = await r.json();
      if (j.success) setTrend({ points: j.points, hours: j.hours });
    } catch { /* keep the previous strip */ }
  }, [device.id]);
  useEffect(() => { loadTrend(); const id = setInterval(loadTrend, 60000); return () => clearInterval(id); }, [loadTrend]);

  // Run hours: the last 24 h (days=1 is a rolling window) and the estimate window
  const EST_DAYS = 30;
  const [today, setToday] = useState<{ hours: number | null; starts: number | null } | null>(null);
  const [runEst, setRunEst] = useState<number | null>(null);
  const [estLoading, setEstLoading] = useState(true);
  useEffect(() => {
    let off = false;
    fetch(`/api/analytics/dg?device_id=${device.id}&days=1`).then((r) => r.json()).then((j) => {
      if (!off && j.success) setToday({ hours: j.summary?.engine_on_hours ?? null, starts: j.summary?.starts ?? null });
    }).catch(() => {});
    setEstLoading(true);
    fetch(`/api/analytics/dg?device_id=${device.id}&days=${EST_DAYS}`).then((r) => r.json()).then((j) => {
      if (!off) setRunEst(j.success ? j.summary?.engine_on_hours ?? null : null);
    }).catch(() => {}).finally(() => { if (!off) setEstLoading(false); });
    return () => { off = true; };
  }, [device.id]);

  // Assumptions, remembered per device in this browser
  const key = `gx-twin-est:${device.id}`;
  const [a, setAState] = useState<Assumptions>({ burnLph: DEFAULT_BURN_LPH[s.model] ?? 20, savingPct: 10, dieselInr: 90 });
  useEffect(() => {
    try { const v = localStorage.getItem(key); if (v) setAState((p) => ({ ...p, ...JSON.parse(v) })); } catch { /* ignore */ }
  }, [key]);
  const setA = (v: Assumptions) => { setAState(v); try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } };

  const worst: Tone = !live ? "off" : s.issues.some((i) => i.tone === "bad") ? "bad" : s.issues.length ? "warn" : "ok";
  const statusText = !live ? (last ? "OFFLINE · LAST KNOWN STATE" : "NO DATA")
    : worst === "bad" ? "FAULT" : worst === "warn" ? "ATTENTION" : s.running ? "RUNNING NORMALLY" : "STANDBY";

  const waterTone = (v: boolean | null): Tone => (v === null ? "na" : v ? "ok" : "warn");
  const waterVal = (v: boolean | null) => (v === null ? "—" : v ? "Full" : "Short");

  return (
    <div style={{ height: "100%", overflow: "auto", background: K.bg, color: K.text, fontFamily: K.sans }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=IBM+Plex+Sans:wght@400;600;700&display=swap" />
      <style>{CSS}</style>
      <div style={{ padding: isMobile ? 12 : 20, maxWidth: 1500, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#7fc79c", fontFamily: K.mono }}>DIGITAL TWIN</div>
            <div style={{ fontSize: isMobile ? 17 : 21, fontWeight: 700 }}>
              {device.device_name || device.imei}
              <span style={{ fontSize: 12, fontWeight: 600, color: K.dim, marginLeft: 10 }}>GreenX on {s.model} DG</span>
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: K.mono, fontSize: 11, fontWeight: 700,
              letterSpacing: 1, color: toneColor[worst] === K.faint ? K.dim : toneColor[worst],
              border: `1px solid ${toneColor[worst]}55`, background: `${toneColor[worst]}14`, borderRadius: 20, padding: "5px 12px" }}>
              <span className={live ? "gxt-pulse" : undefined} style={{ width: 7, height: 7, borderRadius: 4, background: toneColor[worst] }} />
              {statusText}
            </span>
            <span style={{ fontSize: 11, color: K.faint, fontFamily: K.mono }}>{last ? `updated ${ago(now - last)}` : ""}</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 2.1fr) minmax(300px, 1fr)", gap: 14, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <Panel style={{ padding: isMobile ? 8 : 12 }}>
            <Scene s={s} live={live} />
            {s.issues.length > 0 && live && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "4px 6px 2px" }}>
                {s.issues.map((i, k) => (
                  <div key={k} style={{ fontSize: 12, color: toneColor[i.tone], display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ width: 6, height: 6, borderRadius: 3, background: toneColor[i.tone] }} />{i.text}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Cell current</div>
              <div style={{ fontSize: 11, color: K.faint }}>last {trend?.hours ?? 6} h · green bands = DG running · yellow = set point ±10%</div>
            </div>
            {trend ? <Trend points={trend.points} setAmps={s.setAmps} hours={trend.hours} />
              : <div style={{ color: K.faint, fontSize: 12, padding: "40px 0", textAlign: "center" }}>Loading…</div>}
          </Panel>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <Panel>
            <Group title="GENERATOR">
              <Row label="Run status" src="Din.1" tone={s.running === null ? "na" : s.running ? "ok" : "off"}
                value={s.running === null ? "—" : s.running ? "Running" : "Stopped"} />
              <Row label="Run time, last 24 h" src="from Din.1" tone="na" value={today ? hm(today.hours) : "…"} />
              <Row label="Starts, last 24 h" src="Din.1 off → on" tone="na" value={today?.starts == null ? "…" : String(today.starts)} />
            </Group>
            <Group title="HYDROGEN SYSTEM">
              <Row label="Cell current" src={`Ain.1 · set ${s.setAmps === null ? "not set" : `${s.setAmps.toFixed(1)} A`}`}
                tone={s.band === "in" ? "ok" : s.band === "under" || s.band === "over" ? "warn" : s.running && !s.producing ? "bad" : "na"}
                value={s.amps === null ? "—" : `${s.amps.toFixed(1)} A`} />
              <Row label="Electrolyser water" src={device.device_type === "FMC650" ? "Din.2" : "Ain.2"} tone={waterTone(s.cellWater)} value={waterVal(s.cellWater)} />
              {s.hasBubbler && <Row label="Bubbler water" src="Din.4" tone={waterTone(s.bubblerWater)} value={waterVal(s.bubblerWater)} />}
              {s.hasMainTank && <Row label="Main water tank" src="Ain.3" tone={waterTone(s.tankFull)} value={s.tankFull === null ? "—" : s.tankFull ? "Full" : "Low"} />}
              <Row label="Remote stop" src="Dout.1" tone={s.remoteStop ? "warn" : s.remoteStop === null ? "na" : "ok"}
                value={s.remoteStop === null ? "—" : s.remoteStop ? "On" : "Off"} />
            </Group>
            <Group title="TELEMATICS">
              <Row label="DC supply" src="io 66" tone={s.supplyV === null ? "na" : s.supplyV < 11 ? "warn" : "ok"} value={s.supplyV === null ? "—" : `${s.supplyV.toFixed(1)} V`} />
              <Row label="Tracker battery" src="io 67" tone={s.batteryV === null ? "na" : s.batteryV < 3.6 ? "warn" : "ok"} value={s.batteryV === null ? "—" : `${s.batteryV.toFixed(2)} V`} />
              <Row label="GSM signal" src="io 21" tone={s.gsm === null ? "na" : s.gsm < 2 ? "warn" : "ok"} value={s.gsm === null ? "—" : `${s.gsm} / 5`} />
            </Group>
          </Panel>

          <Panel>
            <Estimate runHours={runEst} days={EST_DAYS} a={a} setA={setA} loading={estLoading} />
          </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
