// "use client";

// import { useState } from "react";

// interface TelemetryParam {
//   name: string;
//   value: string;
//   raw_value?: string;
//   unit?: string;
//   category?: string;
//   io_id?: number;
//   timestamp?: string;
// }

// interface GreenXHealthPanelProps {
//   deviceId: string;
//   deviceType: string;
//   deviceModel: string; // "380KVA" | "1500KVA"
//   telemetry: TelemetryParam[];
// }

// // ─── Colors ───────────────────────────────────────────────────────────────────
// const C = {
//   // backgrounds
//   white:        "#ffffff",
//   pageBg:       "#f8fafc",
//   surfaceBg:    "#f1f5f9",
//   // borders
//   border:       "#e2e8f0",
//   borderLight:  "#f1f5f9",
//   // text
//   textPrimary:  "#0f172a",
//   textSecond:   "#64748b",
//   textTertiary: "#94a3b8",
//   // status: green
//   greenDot:     "#16a34a",
//   greenText:    "#15803d",
//   greenBg:      "#f0fdf4",
//   greenBorder:  "#bbf7d0",
//   // status: red
//   redDot:       "#dc2626",
//   redText:      "#b91c1c",
//   redBg:        "#fef2f2",
//   redBorder:    "#fecaca",
//   redTitle:     "#7f1d1d",
//   redAction:    "#991b1b",
//   // status: amber
//   amberDot:     "#d97706",
//   amberText:    "#b45309",
//   amberBg:      "#fffbeb",
//   amberBorder:  "#fde68a",
//   amberTitle:   "#78350f",
//   amberAction:  "#92400e",
//   // status: gray
//   grayDot:      "#94a3b8",
//   grayText:     "#64748b",
// };

// // ─── Signal helpers ───────────────────────────────────────────────────────────

// function getIO(telemetry: TelemetryParam[], ioId: number): number | null {
//   const p = telemetry.find((t) => t.io_id === ioId);
//   if (!p) return null;
//   const v = parseFloat(p.value);
//   return isNaN(v) ? null : v;
// }

// function getRawIO(telemetry: TelemetryParam[], ioId: number): number | null {
//   const p = telemetry.find((t) => t.io_id === ioId);
//   if (!p) return null;
//   const raw = p.raw_value ?? p.value;
//   const v = parseFloat(raw);
//   return isNaN(v) ? null : v;
// }

// // Ain.1 formula: raw mV → Amps
// function calcOutputCurrent(telemetry: TelemetryParam[]): number | null {
//   const raw = getRawIO(telemetry, 9);
//   if (raw === null) return null;
//   return parseFloat((((raw * 0.001) / 83) * 1000).toFixed(1));
// }

// // ─── Alarm logic ──────────────────────────────────────────────────────────────

// interface Alarm {
//   id: string;
//   severity: "critical" | "warning";
//   message: string;
//   action: string;
// }

// function computeAlarms(
//   telemetry: TelemetryParam[],
//   model: string,
//   setCurrent: number | null
// ): Alarm[] {
//   const alarms: Alarm[] = [];
//   const din1  = getIO(telemetry, 1);
//   const din2  = getIO(telemetry, 2);
//   const din4  = getIO(telemetry, 4);
//   const ain1A = calcOutputCurrent(telemetry);
//   const ain2  = getIO(telemetry, 10);
//   const ain3  = getIO(telemetry, 11);
//   const dout1 = getIO(telemetry, 179);
//   const isRunning = din1 === 1 && ain1A !== null && ain1A > 2;

//   // Only evaluate alarms when Din.1 = true (genset is ON)
//   // Exception: abnormal current with DG OFF is always checked
//   if (din1 === 0 && ain1A !== null && ain1A > 2)
//     alarms.push({ id: "abnormal_current_no_dg", severity: "critical", message: `Abnormal: current detected but ${model === "EOW" ? "engine" : "DG set"} is OFF`, action: "Contact Saarthi Support immediately" });

//   if (din1 === 1) {
//     if (dout1 === 1)
//       alarms.push({ id: "remote_shutdown", severity: "warning", message: "System remotely shutdown — maintenance mode active", action: "Check with maintenance team before restarting" });

//     if (ain1A !== null && ain1A < 2 && dout1 === 0)
//       alarms.push({ id: "abnormal_no_current", severity: "critical", message: `Abnormal: ${model === "EOW" ? "engine" : "DG set"} is ON but no output current`, action: "Contact Saarthi Support immediately" });

//     if (isRunning && ain2 !== null && ain2 < 2 && dout1 === 0 && din2 === 0)
//       alarms.push({ id: "electrolyser_water_short", severity: "critical", message: "Internal electrolyser water shortage detected", action: "Contact Saarthi Support immediately" });

//     if (model === "380KVA") {
//       if (ain3 !== null && ain3 > 20)
//         alarms.push({ id: "main_tank_short", severity: "warning", message: "Main water tank level is low", action: "Fill the main water tank" });
//       if (isRunning && ain2 !== null && ain2 < 2 && dout1 === 0 && din4 === 0)
//         alarms.push({ id: "bubbler_water_short", severity: "critical", message: "Internal bubbler water shortage detected", action: "Contact Saarthi Support immediately" });
//     }

//     if (isRunning && setCurrent !== null && ain1A !== null) {
//       const tol = setCurrent * 0.1;
//       if (ain1A < setCurrent - tol)
//         alarms.push({ id: "under_current", severity: "warning", message: `Running under current — ${ain1A} A (set: ${setCurrent} A)`, action: "Contact Saarthi Support (+10% tolerance)" });
//       else if (ain1A > setCurrent + tol)
//         alarms.push({ id: "over_current", severity: "warning", message: `Running over current — ${ain1A} A (set: ${setCurrent} A)`, action: "Contact Saarthi Support (+10% tolerance)" });
//     }
//   }

//   return alarms;
// }

// // ─── Sub-components ───────────────────────────────────────────────────────────

// function SignalRow({
//   label, detail, status, ok, stale = false,
// }: {
//   label: string; detail: string; status: string; ok: boolean | null; stale?: boolean;
// }) {
//   const dotColor   = stale ? C.grayDot  : ok === null ? C.grayDot   : ok ? C.greenDot  : C.redDot;
//   const valueColor = stale ? C.textTertiary : ok === null ? C.grayText : ok ? C.greenText : C.redText;

//   return (
//     <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: `1px solid ${C.border}` }}>
//       <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
//       <div style={{ flex: 1 }}>
//         <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, lineHeight: 1.3 }}>{label}</div>
//         <div style={{ fontSize: 11, color: C.textTertiary, marginTop: 1 }}>{detail}</div>
//       </div>
//       <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
//         {stale && (
//           <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: C.surfaceBg, border: `1px solid ${C.border}`, color: C.textTertiary }}>
//             last known
//           </span>
//         )}
//         <span style={{ fontSize: 13, fontWeight: 700, color: valueColor, textAlign: "right" }}>{status}</span>
//       </div>
//     </div>
//   );
// }

// function AlarmCard({ alarm }: { alarm: Alarm }) {
//   const crit = alarm.severity === "critical";
//   return (
//     <div style={{
//       background: crit ? C.redBg : C.amberBg,
//       border: `1px solid ${crit ? C.redBorder : C.amberBorder}`,
//       borderRadius: 10,
//       padding: "12px 16px",
//       marginBottom: 8,
//     }}>
//       <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
//         <div style={{ width: 7, height: 7, borderRadius: "50%", background: crit ? C.redDot : C.amberDot, flexShrink: 0, marginTop: 4 }} />
//         <div>
//           <div style={{ fontSize: 13, fontWeight: 700, color: crit ? C.redTitle : C.amberTitle, marginBottom: 3 }}>{alarm.message}</div>
//           <div style={{ fontSize: 12, color: crit ? C.redAction : C.amberAction }}>{alarm.action}</div>
//         </div>
//       </div>
//     </div>
//   );
// }

// function SectionLabel({ text }: { text: string }) {
//   return (
//     <div style={{ fontSize: 11, fontWeight: 700, color: C.textTertiary, textTransform: "uppercase" as const, letterSpacing: "0.8px", marginBottom: 10 }}>
//       {text}
//     </div>
//   );
// }

// // ─── Main component ───────────────────────────────────────────────────────────

// export function GreenXHealthPanel({ deviceType, deviceModel, telemetry }: GreenXHealthPanelProps) {
//   const [setCurrent, setSetCurrent] = useState<number | null>(null);
//   const [editing, setEditing]       = useState(false);
//   const [inputVal, setInputVal]     = useState("");
//   const [expanded, setExpanded]     = useState(true);

//   if (deviceType !== "FMC650") return null;
//   if (deviceModel !== "380KVA" && deviceModel !== "1500KVA" && deviceModel !== "625KVA" && deviceModel !== "EOW") return null;

//   const din1  = getIO(telemetry, 1);
//   const din2  = getIO(telemetry, 2);
//   const din4  = getIO(telemetry, 4);
//   const ain1A = calcOutputCurrent(telemetry);
//   const ain3  = getIO(telemetry, 11);
//   const dout1 = getIO(telemetry, 179);

//   const isRunning   = din1 === 1 && ain1A !== null && ain1A > 2;
//   const alarms      = computeAlarms(telemetry, deviceModel, setCurrent);
//   const hasAlarms   = alarms.length > 0;
//   const hasCritical = alarms.some((a) => a.severity === "critical");

//   // Header badge colors
//   const dotColor        = hasCritical ? C.redDot   : hasAlarms ? C.amberDot   : telemetry.length === 0 ? C.grayDot  : C.greenDot;
//   const badgeBg         = hasCritical ? C.redBg    : hasAlarms ? C.amberBg    : C.greenBg;
//   const badgeBorder     = hasCritical ? C.redBorder: hasAlarms ? C.amberBorder: C.greenBorder;
//   const badgeTextColor  = hasCritical ? C.redText  : hasAlarms ? C.amberText  : C.greenText;
//   const badgeLabel      = hasCritical
//     ? `${alarms.length} alert${alarms.length !== 1 ? "s" : ""}`
//     : hasAlarms
//     ? `${alarms.length} warning${alarms.length !== 1 ? "s" : ""}`
//     : "Healthy";

//     const eowLabel = deviceModel === "EOW" ? "Engine" : "DG set";

//     const subline = isRunning
//       ? `Running · ${ain1A !== null ? ain1A + " A output" : "—"}`
//       : din1 === 1 ? `${eowLabel} ON · no output`
//       : `${eowLabel} OFF`;

//   // Signal statuses
//   const mainTankOk    = ain3 !== null ? ain3 < 20 : null;
//   const mainTankLabel = ain3 === null ? "Unknown" : ain3 < 20 ? "OK — full" : "Low — shortage";
//   const cellWaterOk   = din2 !== null ? din2 === 1 : null;
//   const cellLabel     = din2 === null ? "Unknown" : din2 === 1 ? "OK — full" : "Short";
//   const bubblerOk     = din4 !== null ? din4 === 1 : null;
//   const bubblerLabel  = din4 === null ? "Unknown" : din4 === 1 ? "OK — full" : "Short";
//   const remoteOk      = dout1 !== null ? dout1 === 0 : null;
//   const remoteLabel   = dout1 === null ? "Unknown" : dout1 === 0 ? "Working" : "Remotely shutdown";

//   // Setpoint deviation
//   const deviation       = setCurrent !== null && ain1A !== null ? Math.abs(ain1A - setCurrent) : null;
//   const withinTolerance = deviation !== null && setCurrent !== null ? deviation <= setCurrent * 0.1 : null;

//   return (
//     <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>

//       {/* ── Header ── */}
//       <div
//         onClick={() => setExpanded((p) => !p)}
//         style={{ padding: "14px 20px", borderBottom: expanded ? `1px solid ${C.border}` : "none", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none", background: C.white }}
//       >
//         <div style={{ width: 10, height: 10, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />

//         <span style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary }}>
//           {deviceModel === "EOW" ? "GreenDrive" : "GreenX"} system health
//         </span>
        
//         <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: badgeBg, border: `1px solid ${badgeBorder}`, color: badgeTextColor }}>
//           {badgeLabel}
//         </span>

//         <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: C.surfaceBg, border: `1px solid ${C.border}`, color: C.textSecond }}>
//           {deviceModel === "EOW" ? "Engine on Wheels" : deviceModel}
//         </span>

//         {deviceModel === "EOW" && (
//           <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>
//             Beta
//           </span>
//         )}

//         <span style={{ marginLeft: "auto", fontSize: 12, color: C.textSecond, fontWeight: 500 }}>{subline}</span>

//         <span style={{ fontSize: 13, color: C.textTertiary, marginLeft: 8 }}>{expanded ? "▾" : "▸"}</span>
//       </div>

//       {expanded && (
//         <>
//           {/* ── Active alerts ── */}
//           {hasAlarms && (
//             <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, background: C.white }}>
//               <SectionLabel text="Active alerts" />
//               {alarms.map((a) => <AlarmCard key={a.id} alarm={a} />)}
//             </div>
//           )}

//           {/* ── System signals ── */}
//           <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, background: C.white }}>
//             <SectionLabel text="System signals" />

//             {/* DG set — always shown live */}
//             <SignalRow label={deviceModel === "EOW" ? "Engine status" : "DG set (genset)"} detail="Din.1 — run status" status={din1 === null ? "Unknown" : din1 === 1 ? "ON" : "OFF"} ok={din1 === null ? null : din1 === 1} />

//             {/* Remaining rows: live when Din.1=ON, last-known (stale) when OFF */}
//             <SignalRow
//               label="System running"
//               detail="Din.1 = ON & Ain.1 > 2 A"
//               status={isRunning ? "Running" : din1 === 1 ? `${eowLabel} ON — no output` : "Stopped"}
//               ok={isRunning ? true : din1 === null ? null : false}
//               stale={din1 !== 1}
//             />
//             <SignalRow
//               label="Output current"
//               detail="Ain.1 → (raw / 83) × 1000"
//               status={ain1A !== null ? `${ain1A} A` : "—"}
//               ok={ain1A !== null ? ain1A > 2 : null}
//               stale={din1 !== 1}
//             />
//             <SignalRow
//               label="Remote shutdown"
//               detail="Dout.1 — remote control status"
//               status={remoteLabel}
//               ok={remoteOk}
//               stale={din1 !== 1}
//             />
//             <SignalRow
//               label="Cell body water"
//               detail="Din.2 — electrolyser cell water"
//               status={cellLabel}
//               ok={cellWaterOk}
//               stale={din1 !== 1}
//             />
//             {(deviceModel === "380KVA" || deviceModel === "625KVA" || deviceModel === "EOW") && (
//               <>
//                 <SignalRow
//                   label="Main water tank"
//                   detail="Ain.3 — main tank level (<20 = full)"
//                   status={mainTankLabel}
//                   ok={mainTankOk}
//                   stale={din1 !== 1}
//                 />
//                 <SignalRow
//                   label="Bubbler water"
//                   detail="Din.4 — bubbler water level"
//                   status={bubblerLabel}
//                   ok={bubblerOk}
//                   stale={din1 !== 1}
//                 />
//               </>
//             )}
//           </div>

//           {/* ── Setpoint ── */}
//           <div style={{ padding: "16px 20px", background: C.pageBg }}>
//             <SectionLabel text="Current setpoint" />

//             {editing ? (
//               <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//                 <input
//                   type="number"
//                   value={inputVal}
//                   onChange={(e) => setInputVal(e.target.value)}
//                   placeholder="Enter set current (A)"
//                   autoFocus
//                   style={{ flex: 1, padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.textPrimary, background: C.white, outline: "none" }}
//                 />
//                 <button
//                   onClick={() => { const v = parseFloat(inputVal); if (!isNaN(v) && v > 0) setSetCurrent(v); setEditing(false); setInputVal(""); }}
//                   style={{ padding: "8px 16px", background: "#16a34a", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
//                 >
//                   Save
//                 </button>
//                 <button
//                   onClick={() => { setEditing(false); setInputVal(""); }}
//                   style={{ padding: "8px 14px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textSecond, fontSize: 13, cursor: "pointer" }}
//                 >
//                   Cancel
//                 </button>
//               </div>
//             ) : (
//               <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//                 <span style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary }}>
//                   {setCurrent !== null ? `${setCurrent} A` : "Not configured"}
//                 </span>

//                 {withinTolerance !== null && deviation !== null && (
//                   <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: withinTolerance ? C.greenBg : C.amberBg, border: `1px solid ${withinTolerance ? C.greenBorder : C.amberBorder}`, color: withinTolerance ? C.greenText : C.amberText }}>
//                     {withinTolerance
//                       ? "Within ±10%"
//                       : `${deviation.toFixed(0)} A ${ain1A! < setCurrent! ? "under" : "over"}`}
//                   </span>
//                 )}

//                 <button
//                   onClick={() => setEditing(true)}
//                   style={{ marginLeft: "auto", padding: "7px 14px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textSecond, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
//                 >
//                   {setCurrent !== null ? "Edit" : "Configure"}
//                 </button>
//               </div>
//             )}
//           </div>
//         </>
//       )}
//     </div>
//   );
// }
"use client";

import { useState } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";

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
  deviceType: string;
  deviceModel: string;
  telemetry: TelemetryParam[];
}

const C = {
  white: "#ffffff", pageBg: "#f8fafc", surfaceBg: "#f1f5f9",
  border: "#e2e8f0", borderLight: "#f1f5f9",
  textPrimary: "#0f172a", textSecond: "#64748b", textTertiary: "#94a3b8",
  greenDot: "#16a34a", greenText: "#15803d", greenBg: "#f0fdf4", greenBorder: "#bbf7d0",
  redDot: "#dc2626", redText: "#b91c1c", redBg: "#fef2f2", redBorder: "#fecaca", redTitle: "#7f1d1d", redAction: "#991b1b",
  amberDot: "#d97706", amberText: "#b45309", amberBg: "#fffbeb", amberBorder: "#fde68a", amberTitle: "#78350f", amberAction: "#92400e",
  grayDot: "#94a3b8", grayText: "#64748b",
};

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

function calcOutputCurrent(telemetry: TelemetryParam[]): number | null {
  const raw = getRawIO(telemetry, 9);
  if (raw === null) return null;
  return parseFloat((((raw * 0.001) / 83) * 1000).toFixed(1));
}

interface Alarm {
  id: string;
  severity: "critical" | "warning";
  message: string;
  action: string;
}

function computeAlarms(telemetry: TelemetryParam[], model: string, setCurrent: number | null): Alarm[] {
  const alarms: Alarm[] = [];
  const din1 = getIO(telemetry, 1);
  const din2 = getIO(telemetry, 2);
  const din4 = getIO(telemetry, 4);
  const ain1A = calcOutputCurrent(telemetry);
  const ain2 = getIO(telemetry, 10);
  const ain3 = getIO(telemetry, 11);
  const dout1 = getIO(telemetry, 179);
  const isRunning = din1 === 1 && ain1A !== null && ain1A > 2;

  if (din1 === 0 && ain1A !== null && ain1A > 2)
    alarms.push({ id: "abnormal_current_no_dg", severity: "critical", message: `Abnormal: current detected but ${model === "EOW" ? "engine" : "DG set"} is OFF`, action: "Contact Saarthi Support immediately" });

  if (din1 === 1) {
    if (dout1 === 1)
      alarms.push({ id: "remote_shutdown", severity: "warning", message: "System remotely shutdown — maintenance mode active", action: "Check with maintenance team before restarting" });
    if (ain1A !== null && ain1A < 2 && dout1 === 0)
      alarms.push({ id: "abnormal_no_current", severity: "critical", message: `Abnormal: ${model === "EOW" ? "engine" : "DG set"} is ON but no output current`, action: "Contact Saarthi Support immediately" });
    if (isRunning && ain2 !== null && ain2 < 2 && dout1 === 0 && din2 === 0)
      alarms.push({ id: "electrolyser_water_short", severity: "critical", message: "Internal electrolyser water shortage detected", action: "Contact Saarthi Support immediately" });

    if (model === "380KVA") {
      if (ain3 !== null && ain3 > 20)
        alarms.push({ id: "main_tank_short", severity: "warning", message: "Main water tank level is low", action: "Fill the main water tank" });
      if (isRunning && ain2 !== null && ain2 < 2 && dout1 === 0 && din4 === 0)
        alarms.push({ id: "bubbler_water_short", severity: "critical", message: "Internal bubbler water shortage detected", action: "Contact Saarthi Support immediately" });
    }

    if (isRunning && setCurrent !== null && ain1A !== null) {
      const tol = setCurrent * 0.1;
      if (ain1A < setCurrent - tol)
        alarms.push({ id: "under_current", severity: "warning", message: `Running under current — ${ain1A} A (set: ${setCurrent} A)`, action: "Contact Saarthi Support (+10% tolerance)" });
      else if (ain1A > setCurrent + tol)
        alarms.push({ id: "over_current", severity: "warning", message: `Running over current — ${ain1A} A (set: ${setCurrent} A)`, action: "Contact Saarthi Support (+10% tolerance)" });
    }
  }

  return alarms;
}

function SignalRow({ label, detail, status, ok, stale = false, isMobile = false }: {
  label: string; detail: string; status: string; ok: boolean | null; stale?: boolean; isMobile?: boolean;
}) {
  const dotColor = stale ? C.grayDot : ok === null ? C.grayDot : ok ? C.greenDot : C.redDot;
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
    <div style={{
      background: crit ? C.redBg : C.amberBg,
      border: `1px solid ${crit ? C.redBorder : C.amberBorder}`,
      borderRadius: 10, padding: isMobile ? "10px 12px" : "12px 16px", marginBottom: 8,
    }}>
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

export function GreenXHealthPanel({ deviceType, deviceModel, telemetry }: GreenXHealthPanelProps) {
  const isMobile = useIsMobile();
  const [setCurrent, setSetCurrent] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [expanded, setExpanded] = useState(true);

  if (deviceType !== "FMC650") return null;
  if (deviceModel !== "380KVA" && deviceModel !== "1500KVA" && deviceModel !== "625KVA" && deviceModel !== "EOW") return null;

  const din1 = getIO(telemetry, 1);
  const din2 = getIO(telemetry, 2);
  const din4 = getIO(telemetry, 4);
  const ain1A = calcOutputCurrent(telemetry);
  const ain3 = getIO(telemetry, 11);
  const dout1 = getIO(telemetry, 179);

  const isRunning = din1 === 1 && ain1A !== null && ain1A > 2;
  const alarms = computeAlarms(telemetry, deviceModel, setCurrent);
  const hasAlarms = alarms.length > 0;
  const hasCritical = alarms.some((a) => a.severity === "critical");

  const dotColor = hasCritical ? C.redDot : hasAlarms ? C.amberDot : telemetry.length === 0 ? C.grayDot : C.greenDot;
  const badgeBg = hasCritical ? C.redBg : hasAlarms ? C.amberBg : C.greenBg;
  const badgeBorder = hasCritical ? C.redBorder : hasAlarms ? C.amberBorder : C.greenBorder;
  const badgeTextColor = hasCritical ? C.redText : hasAlarms ? C.amberText : C.greenText;
  const badgeLabel = hasCritical
    ? `${alarms.length} alert${alarms.length !== 1 ? "s" : ""}`
    : hasAlarms ? `${alarms.length} warning${alarms.length !== 1 ? "s" : ""}`
    : "Healthy";

  const eowLabel = deviceModel === "EOW" ? "Engine" : "DG set";
  const subline = isRunning
    ? `Running · ${ain1A !== null ? ain1A + " A output" : "—"}`
    : din1 === 1 ? `${eowLabel} ON · no output`
    : `${eowLabel} OFF`;

  const mainTankOk = ain3 !== null ? ain3 < 20 : null;
  const mainTankLabel = ain3 === null ? "Unknown" : ain3 < 20 ? "OK — full" : "Low — shortage";
  const cellWaterOk = din2 !== null ? din2 === 1 : null;
  const cellLabel = din2 === null ? "Unknown" : din2 === 1 ? "OK — full" : "Short";
  const bubblerOk = din4 !== null ? din4 === 1 : null;
  const bubblerLabel = din4 === null ? "Unknown" : din4 === 1 ? "OK — full" : "Short";
  const remoteOk = dout1 !== null ? dout1 === 0 : null;
  const remoteLabel = dout1 === null ? "Unknown" : dout1 === 0 ? "Working" : "Remotely shutdown";
  const deviation = setCurrent !== null && ain1A !== null ? Math.abs(ain1A - setCurrent) : null;
  const withinTolerance = deviation !== null && setCurrent !== null ? deviation <= setCurrent * 0.1 : null;

  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>

      {/* ── Header ── */}
      <div
        onClick={() => setExpanded((p) => !p)}
        style={{
          padding: isMobile ? "12px 14px" : "14px 20px",
          borderBottom: expanded ? `1px solid ${C.border}` : "none",
          cursor: "pointer",
          userSelect: "none",
          background: C.white,
        }}
      >
        {/* Row 1: dot + title + badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />

          <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: C.textPrimary }}>
            {deviceModel === "EOW" ? "GreenDrive" : "GreenX"} system health
          </span>

          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: badgeBg, border: `1px solid ${badgeBorder}`, color: badgeTextColor }}>
            {badgeLabel}
          </span>

          {!isMobile && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: C.surfaceBg, border: `1px solid ${C.border}`, color: C.textSecond }}>
              {deviceModel === "EOW" ? "Engine on Wheels" : deviceModel}
            </span>
          )}

          {deviceModel === "EOW" && !isMobile && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>
              Beta
            </span>
          )}

          {/* Chevron — push to right */}
          <span style={{ marginLeft: "auto", fontSize: 13, color: C.textTertiary, flexShrink: 0 }}>
            {expanded ? "▾" : "▸"}
          </span>
        </div>

        {/* Row 2: subline status */}
        <div style={{ marginTop: 4, marginLeft: 18, fontSize: isMobile ? 11 : 12, color: C.textSecond, fontWeight: 500 }}>
          {subline}
        </div>
      </div>

      {expanded && (
        <>
          {/* ── Active alerts ── */}
          {hasAlarms && (
            <div style={{ padding: isMobile ? "12px 14px" : "16px 20px", borderBottom: `1px solid ${C.border}`, background: C.white }}>
              <SectionLabel text="Active alerts" />
              {alarms.map((a) => <AlarmCard key={a.id} alarm={a} isMobile={isMobile} />)}
            </div>
          )}

          {/* ── System signals ── */}
          <div style={{ padding: isMobile ? "12px 14px" : "16px 20px", borderBottom: `1px solid ${C.border}`, background: C.white }}>
            <SectionLabel text="System signals" />
            <SignalRow label={deviceModel === "EOW" ? "Engine status" : "DG set (genset)"} detail="Din.1 — run status" status={din1 === null ? "Unknown" : din1 === 1 ? "ON" : "OFF"} ok={din1 === null ? null : din1 === 1} isMobile={isMobile} />
            <SignalRow label="System running" detail="Din.1 = ON & Ain.1 > 2 A" status={isRunning ? "Running" : din1 === 1 ? `${eowLabel} ON — no output` : "Stopped"} ok={isRunning ? true : din1 === null ? null : false} stale={din1 !== 1} isMobile={isMobile} />
            <SignalRow label="Output current" detail="Ain.1 → (raw / 83) × 1000" status={ain1A !== null ? `${ain1A} A` : "—"} ok={ain1A !== null ? ain1A > 2 : null} stale={din1 !== 1} isMobile={isMobile} />
            <SignalRow label="Remote shutdown" detail="Dout.1 — remote control status" status={remoteLabel} ok={remoteOk} stale={din1 !== 1} isMobile={isMobile} />
            <SignalRow label="Cell body water" detail="Din.2 — electrolyser cell water" status={cellLabel} ok={cellWaterOk} stale={din1 !== 1} isMobile={isMobile} />
            {(deviceModel === "380KVA" || deviceModel === "625KVA" || deviceModel === "EOW") && (
              <>
                <SignalRow label="Main water tank" detail="Ain.3 — main tank level" status={mainTankLabel} ok={mainTankOk} stale={din1 !== 1} isMobile={isMobile} />
                <SignalRow label="Bubbler water" detail="Din.4 — bubbler water level" status={bubblerLabel} ok={bubblerOk} stale={din1 !== 1} isMobile={isMobile} />
              </>
            )}
          </div>

          {/* ── Setpoint ── */}
          <div style={{ padding: isMobile ? "12px 14px" : "16px 20px", background: C.pageBg }}>
            <SectionLabel text="Current setpoint" />

            {editing ? (
              <div style={{ display: "flex", flexDirection: isMobile ? "column" as const : "row" as const, alignItems: isMobile ? "stretch" : "center", gap: 8 }}>
                <input
                  type="number" value={inputVal} onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Enter set current (A)" autoFocus
                  style={{ flex: 1, padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: isMobile ? 14 : 13, color: C.textPrimary, background: C.white, outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => { const v = parseFloat(inputVal); if (!isNaN(v) && v > 0) setSetCurrent(v); setEditing(false); setInputVal(""); }}
                    style={{ flex: isMobile ? 1 : undefined, padding: "8px 16px", background: "#16a34a", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
                  >Save</button>
                  <button
                    onClick={() => { setEditing(false); setInputVal(""); }}
                    style={{ flex: isMobile ? 1 : undefined, padding: "8px 14px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textSecond, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
                  >Cancel</button>
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

                <button
                  onClick={() => setEditing(true)}
                  style={{ marginLeft: isMobile ? 0 : "auto", padding: "7px 14px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textSecond, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                >
                  {setCurrent !== null ? "Edit" : "Configure"}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}