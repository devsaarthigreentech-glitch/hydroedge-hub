// // // "use client";

// // // import { useState } from "react";
// // // import { useIsMobile } from "@/hooks/useIsMobile";

// // // interface TelemetryParam {
// // //   name: string;
// // //   value: string;
// // //   raw_value?: string;
// // //   unit?: string;
// // //   category?: string;
// // //   io_id?: number;
// // //   timestamp?: string;
// // // }

// // // interface GreenXHealthPanelProps {
// // //   deviceId: string;
// // //   deviceType: string;
// // //   deviceModel: string;
// // //   telemetry: TelemetryParam[];
// // // }

// // // const C = {
// // //   white: "#ffffff", pageBg: "#f8fafc", surfaceBg: "#f1f5f9",
// // //   border: "#e2e8f0", borderLight: "#f1f5f9",
// // //   textPrimary: "#0f172a", textSecond: "#64748b", textTertiary: "#94a3b8",
// // //   greenDot: "#16a34a", greenText: "#15803d", greenBg: "#f0fdf4", greenBorder: "#bbf7d0",
// // //   redDot: "#dc2626", redText: "#b91c1c", redBg: "#fef2f2", redBorder: "#fecaca", redTitle: "#7f1d1d", redAction: "#991b1b",
// // //   amberDot: "#d97706", amberText: "#b45309", amberBg: "#fffbeb", amberBorder: "#fde68a", amberTitle: "#78350f", amberAction: "#92400e",
// // //   grayDot: "#94a3b8", grayText: "#64748b",
// // // };

// // // function getIO(telemetry: TelemetryParam[], ioId: number): number | null {
// // //   const p = telemetry.find((t) => t.io_id === ioId);
// // //   if (!p) return null;
// // //   const v = parseFloat(p.value);
// // //   return isNaN(v) ? null : v;
// // // }

// // // function getRawIO(telemetry: TelemetryParam[], ioId: number): number | null {
// // //   const p = telemetry.find((t) => t.io_id === ioId);
// // //   if (!p) return null;
// // //   const raw = p.raw_value ?? p.value;
// // //   const v = parseFloat(raw);
// // //   return isNaN(v) ? null : v;
// // // }

// // // function calcOutputCurrent(telemetry: TelemetryParam[]): number | null {
// // //   const raw = getRawIO(telemetry, 9);
// // //   if (raw === null) return null;
// // //   return parseFloat((((raw * 0.001) / 83) * 1000).toFixed(1));
// // // }

// // // interface Alarm {
// // //   id: string;
// // //   severity: "critical" | "warning";
// // //   message: string;
// // //   action: string;
// // // }

// // // function computeAlarms(telemetry: TelemetryParam[], model: string, setCurrent: number | null): Alarm[] {
// // //   const alarms: Alarm[] = [];
// // //   const din1 = getIO(telemetry, 1);
// // //   const din2 = getIO(telemetry, 2);
// // //   const din4 = getIO(telemetry, 4);
// // //   const ain1A = calcOutputCurrent(telemetry);
// // //   const ain2 = getIO(telemetry, 10);
// // //   const ain3 = getIO(telemetry, 11);
// // //   const dout1 = getIO(telemetry, 179);
// // //   const isRunning = din1 === 1 && ain1A !== null && ain1A > 2;

// // //   if (din1 === 0 && ain1A !== null && ain1A > 2)
// // //     alarms.push({ id: "abnormal_current_no_dg", severity: "critical", message: `Abnormal: current detected but ${model === "EOW" ? "engine" : "DG set"} is OFF`, action: "Contact Saarthi Support immediately" });

// // //   if (din1 === 1) {
// // //     if (dout1 === 1)
// // //       alarms.push({ id: "remote_shutdown", severity: "warning", message: "System remotely shutdown — maintenance mode active", action: "Check with maintenance team before restarting" });
// // //     if (ain1A !== null && ain1A < 2 && dout1 === 0)
// // //       alarms.push({ id: "abnormal_no_current", severity: "critical", message: `Abnormal: ${model === "EOW" ? "engine" : "DG set"} is ON but no output current`, action: "Contact Saarthi Support immediately" });
// // //     if (isRunning && ain2 !== null && ain2 < 2 && dout1 === 0 && din2 === 0)
// // //       alarms.push({ id: "electrolyser_water_short", severity: "critical", message: "Internal electrolyser water shortage detected", action: "Contact Saarthi Support immediately" });

// // //     if (model === "380KVA") {
// // //       if (ain3 !== null && ain3 > 20)
// // //         alarms.push({ id: "main_tank_short", severity: "warning", message: "Main water tank level is low", action: "Fill the main water tank" });
// // //       if (isRunning && ain2 !== null && ain2 < 2 && dout1 === 0 && din4 === 0)
// // //         alarms.push({ id: "bubbler_water_short", severity: "critical", message: "Internal bubbler water shortage detected", action: "Contact Saarthi Support immediately" });
// // //     }

// // //     if (isRunning && setCurrent !== null && ain1A !== null) {
// // //       const tol = setCurrent * 0.1;
// // //       if (ain1A < setCurrent - tol)
// // //         alarms.push({ id: "under_current", severity: "warning", message: `Running under current — ${ain1A} A (set: ${setCurrent} A)`, action: "Contact Saarthi Support (+10% tolerance)" });
// // //       else if (ain1A > setCurrent + tol)
// // //         alarms.push({ id: "over_current", severity: "warning", message: `Running over current — ${ain1A} A (set: ${setCurrent} A)`, action: "Contact Saarthi Support (+10% tolerance)" });
// // //     }
// // //   }

// // //   return alarms;
// // // }

// // // function SignalRow({ label, detail, status, ok, stale = false, isMobile = false }: {
// // //   label: string; detail: string; status: string; ok: boolean | null; stale?: boolean; isMobile?: boolean;
// // // }) {
// // //   const dotColor = stale ? C.grayDot : ok === null ? C.grayDot : ok ? C.greenDot : C.redDot;
// // //   const valueColor = stale ? C.textTertiary : ok === null ? C.grayText : ok ? C.greenText : C.redText;

// // //   return (
// // //     <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, padding: isMobile ? "9px 0" : "11px 0", borderBottom: `1px solid ${C.border}` }}>
// // //       <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
// // //       <div style={{ flex: 1, minWidth: 0 }}>
// // //         <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, color: C.textPrimary, lineHeight: 1.3 }}>{label}</div>
// // //         <div style={{ fontSize: isMobile ? 10 : 11, color: C.textTertiary, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{detail}</div>
// // //       </div>
// // //       <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
// // //         {stale && !isMobile && (
// // //           <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: C.surfaceBg, border: `1px solid ${C.border}`, color: C.textTertiary }}>
// // //             last known
// // //           </span>
// // //         )}
// // //         <span style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: valueColor, textAlign: "right" as const, whiteSpace: "nowrap" as const }}>{status}</span>
// // //       </div>
// // //     </div>
// // //   );
// // // }

// // // function AlarmCard({ alarm, isMobile = false }: { alarm: Alarm; isMobile?: boolean }) {
// // //   const crit = alarm.severity === "critical";
// // //   return (
// // //     <div style={{
// // //       background: crit ? C.redBg : C.amberBg,
// // //       border: `1px solid ${crit ? C.redBorder : C.amberBorder}`,
// // //       borderRadius: 10, padding: isMobile ? "10px 12px" : "12px 16px", marginBottom: 8,
// // //     }}>
// // //       <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
// // //         <div style={{ width: 7, height: 7, borderRadius: "50%", background: crit ? C.redDot : C.amberDot, flexShrink: 0, marginTop: 4 }} />
// // //         <div>
// // //           <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: crit ? C.redTitle : C.amberTitle, marginBottom: 3 }}>{alarm.message}</div>
// // //           <div style={{ fontSize: isMobile ? 11 : 12, color: crit ? C.redAction : C.amberAction }}>{alarm.action}</div>
// // //         </div>
// // //       </div>
// // //     </div>
// // //   );
// // // }

// // // function SectionLabel({ text }: { text: string }) {
// // //   return (
// // //     <div style={{ fontSize: 11, fontWeight: 700, color: C.textTertiary, textTransform: "uppercase" as const, letterSpacing: "0.8px", marginBottom: 10 }}>
// // //       {text}
// // //     </div>
// // //   );
// // // }

// // // export function GreenXHealthPanel({ deviceType, deviceModel, telemetry }: GreenXHealthPanelProps) {
// // //   const isMobile = useIsMobile();
// // //   const [setCurrent, setSetCurrent] = useState<number | null>(null);
// // //   const [editing, setEditing] = useState(false);
// // //   const [inputVal, setInputVal] = useState("");
// // //   const [expanded, setExpanded] = useState(true);

// // //   if (deviceType !== "FMC650") return null;
// // //   if (deviceModel !== "380KVA" && deviceModel !== "1500KVA" && deviceModel !== "625KVA" && deviceModel !== "EOW") return null;

// // //   const din1 = getIO(telemetry, 1);
// // //   const din2 = getIO(telemetry, 2);
// // //   const din4 = getIO(telemetry, 4);
// // //   const ain1A = calcOutputCurrent(telemetry);
// // //   const ain3 = getIO(telemetry, 11);
// // //   const dout1 = getIO(telemetry, 179);

// // //   const isRunning = din1 === 1 && ain1A !== null && ain1A > 2;
// // //   const alarms = computeAlarms(telemetry, deviceModel, setCurrent);
// // //   const hasAlarms = alarms.length > 0;
// // //   const hasCritical = alarms.some((a) => a.severity === "critical");

// // //   const dotColor = hasCritical ? C.redDot : hasAlarms ? C.amberDot : telemetry.length === 0 ? C.grayDot : C.greenDot;
// // //   const badgeBg = hasCritical ? C.redBg : hasAlarms ? C.amberBg : C.greenBg;
// // //   const badgeBorder = hasCritical ? C.redBorder : hasAlarms ? C.amberBorder : C.greenBorder;
// // //   const badgeTextColor = hasCritical ? C.redText : hasAlarms ? C.amberText : C.greenText;
// // //   const badgeLabel = hasCritical
// // //     ? `${alarms.length} alert${alarms.length !== 1 ? "s" : ""}`
// // //     : hasAlarms ? `${alarms.length} warning${alarms.length !== 1 ? "s" : ""}`
// // //     : "Healthy";

// // //   const eowLabel = deviceModel === "EOW" ? "Engine" : "DG set";
// // //   const subline = isRunning
// // //     ? `Running · ${ain1A !== null ? ain1A + " A output" : "—"}`
// // //     : din1 === 1 ? `${eowLabel} ON · no output`
// // //     : `${eowLabel} OFF`;

// // //   const mainTankOk = ain3 !== null ? ain3 < 20 : null;
// // //   const mainTankLabel = ain3 === null ? "Unknown" : ain3 < 20 ? "OK — full" : "Low — shortage";
// // //   const cellWaterOk = din2 !== null ? din2 === 1 : null;
// // //   const cellLabel = din2 === null ? "Unknown" : din2 === 1 ? "OK — full" : "Short";
// // //   const bubblerOk = din4 !== null ? din4 === 1 : null;
// // //   const bubblerLabel = din4 === null ? "Unknown" : din4 === 1 ? "OK — full" : "Short";
// // //   const remoteOk = dout1 !== null ? dout1 === 0 : null;
// // //   const remoteLabel = dout1 === null ? "Unknown" : dout1 === 0 ? "Working" : "Remotely shutdown";
// // //   const deviation = setCurrent !== null && ain1A !== null ? Math.abs(ain1A - setCurrent) : null;
// // //   const withinTolerance = deviation !== null && setCurrent !== null ? deviation <= setCurrent * 0.1 : null;

// // //   return (
// // //     <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>

// // //       {/* ── Header ── */}
// // //       <div
// // //         onClick={() => setExpanded((p) => !p)}
// // //         style={{
// // //           padding: isMobile ? "12px 14px" : "14px 20px",
// // //           borderBottom: expanded ? `1px solid ${C.border}` : "none",
// // //           cursor: "pointer",
// // //           userSelect: "none",
// // //           background: C.white,
// // //         }}
// // //       >
// // //         {/* Row 1: dot + title + badges */}
// // //         <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
// // //           <div style={{ width: 10, height: 10, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />

// // //           <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: C.textPrimary }}>
// // //             {deviceModel === "EOW" ? "GreenDrive" : "GreenX"} system health
// // //           </span>

// // //           <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: badgeBg, border: `1px solid ${badgeBorder}`, color: badgeTextColor }}>
// // //             {badgeLabel}
// // //           </span>

// // //           {!isMobile && (
// // //             <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: C.surfaceBg, border: `1px solid ${C.border}`, color: C.textSecond }}>
// // //               {deviceModel === "EOW" ? "Engine on Wheels" : deviceModel}
// // //             </span>
// // //           )}

// // //           {deviceModel === "EOW" && !isMobile && (
// // //             <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>
// // //               Beta
// // //             </span>
// // //           )}

// // //           {/* Chevron — push to right */}
// // //           <span style={{ marginLeft: "auto", fontSize: 13, color: C.textTertiary, flexShrink: 0 }}>
// // //             {expanded ? "▾" : "▸"}
// // //           </span>
// // //         </div>

// // //         {/* Row 2: subline status */}
// // //         <div style={{ marginTop: 4, marginLeft: 18, fontSize: isMobile ? 11 : 12, color: C.textSecond, fontWeight: 500 }}>
// // //           {subline}
// // //         </div>
// // //       </div>

// // //       {expanded && (
// // //         <>
// // //           {/* ── Active alerts ── */}
// // //           {hasAlarms && (
// // //             <div style={{ padding: isMobile ? "12px 14px" : "16px 20px", borderBottom: `1px solid ${C.border}`, background: C.white }}>
// // //               <SectionLabel text="Active alerts" />
// // //               {alarms.map((a) => <AlarmCard key={a.id} alarm={a} isMobile={isMobile} />)}
// // //             </div>
// // //           )}

// // //           {/* ── System signals ── */}
// // //           <div style={{ padding: isMobile ? "12px 14px" : "16px 20px", borderBottom: `1px solid ${C.border}`, background: C.white }}>
// // //             <SectionLabel text="System signals" />
// // //             <SignalRow label={deviceModel === "EOW" ? "Engine status" : "DG set (genset)"} detail="Din.1 — run status" status={din1 === null ? "Unknown" : din1 === 1 ? "ON" : "OFF"} ok={din1 === null ? null : din1 === 1} isMobile={isMobile} />
// // //             <SignalRow label="System running" detail="Din.1 = ON & Ain.1 > 2 A" status={isRunning ? "Running" : din1 === 1 ? `${eowLabel} ON — no output` : "Stopped"} ok={isRunning ? true : din1 === null ? null : false} stale={din1 !== 1} isMobile={isMobile} />
// // //             <SignalRow label="Output current" detail="Ain.1 → (raw / 83) × 1000" status={ain1A !== null ? `${ain1A} A` : "—"} ok={ain1A !== null ? ain1A > 2 : null} stale={din1 !== 1} isMobile={isMobile} />
// // //             <SignalRow label="Remote shutdown" detail="Dout.1 — remote control status" status={remoteLabel} ok={remoteOk} stale={din1 !== 1} isMobile={isMobile} />
// // //             <SignalRow label="Cell body water" detail="Din.2 — electrolyser cell water" status={cellLabel} ok={cellWaterOk} stale={din1 !== 1} isMobile={isMobile} />
// // //             {(deviceModel === "380KVA" || deviceModel === "625KVA" || deviceModel === "EOW") && (
// // //               <>
// // //                 <SignalRow label="Main water tank" detail="Ain.3 — main tank level" status={mainTankLabel} ok={mainTankOk} stale={din1 !== 1} isMobile={isMobile} />
// // //                 <SignalRow label="Bubbler water" detail="Din.4 — bubbler water level" status={bubblerLabel} ok={bubblerOk} stale={din1 !== 1} isMobile={isMobile} />
// // //               </>
// // //             )}
// // //           </div>

// // //           {/* ── Setpoint ── */}
// // //           <div style={{ padding: isMobile ? "12px 14px" : "16px 20px", background: C.pageBg }}>
// // //             <SectionLabel text="Current setpoint" />

// // //             {editing ? (
// // //               <div style={{ display: "flex", flexDirection: isMobile ? "column" as const : "row" as const, alignItems: isMobile ? "stretch" : "center", gap: 8 }}>
// // //                 <input
// // //                   type="number" value={inputVal} onChange={(e) => setInputVal(e.target.value)}
// // //                   placeholder="Enter set current (A)" autoFocus
// // //                   style={{ flex: 1, padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: isMobile ? 14 : 13, color: C.textPrimary, background: C.white, outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const }}
// // //                 />
// // //                 <div style={{ display: "flex", gap: 8 }}>
// // //                   <button
// // //                     onClick={() => { const v = parseFloat(inputVal); if (!isNaN(v) && v > 0) setSetCurrent(v); setEditing(false); setInputVal(""); }}
// // //                     style={{ flex: isMobile ? 1 : undefined, padding: "8px 16px", background: "#16a34a", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
// // //                   >Save</button>
// // //                   <button
// // //                     onClick={() => { setEditing(false); setInputVal(""); }}
// // //                     style={{ flex: isMobile ? 1 : undefined, padding: "8px 14px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textSecond, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
// // //                   >Cancel</button>
// // //                 </div>
// // //               </div>
// // //             ) : (
// // //               <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
// // //                 <span style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: C.textPrimary }}>
// // //                   {setCurrent !== null ? `${setCurrent} A` : "Not configured"}
// // //                 </span>

// // //                 {withinTolerance !== null && deviation !== null && (
// // //                   <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: withinTolerance ? C.greenBg : C.amberBg, border: `1px solid ${withinTolerance ? C.greenBorder : C.amberBorder}`, color: withinTolerance ? C.greenText : C.amberText }}>
// // //                     {withinTolerance ? "Within ±10%" : `${deviation.toFixed(0)} A ${ain1A! < setCurrent! ? "under" : "over"}`}
// // //                   </span>
// // //                 )}

// // //                 <button
// // //                   onClick={() => setEditing(true)}
// // //                   style={{ marginLeft: isMobile ? 0 : "auto", padding: "7px 14px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textSecond, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
// // //                 >
// // //                   {setCurrent !== null ? "Edit" : "Configure"}
// // //                 </button>
// // //               </div>
// // //             )}
// // //           </div>
// // //         </>
// // //       )}
// // //     </div>
// // //   );
// // // }
// // "use client";

// // import { useState } from "react";
// // import { useIsMobile } from "@/hooks/useIsMobile";

// // interface TelemetryParam {
// //   name: string;
// //   value: string;
// //   raw_value?: string;
// //   unit?: string;
// //   category?: string;
// //   io_id?: number;
// //   timestamp?: string;
// // }

// // interface GreenXHealthPanelProps {
// //   deviceId: string;
// //   deviceType: string;   // "FMC650" | "FMB150"
// //   deviceModel: string;  // "380KVA" | "625KVA" | "1500KVA" | "EOW" | "MINI"
// //   telemetry: TelemetryParam[];
// // }

// // // ─── Colors ───────────────────────────────────────────────────────────────────
// // const C = {
// //   white: "#ffffff", pageBg: "#f8fafc", surfaceBg: "#f1f5f9",
// //   border: "#e2e8f0", borderLight: "#f1f5f9",
// //   textPrimary: "#0f172a", textSecond: "#64748b", textTertiary: "#94a3b8",
// //   greenDot: "#16a34a", greenText: "#15803d", greenBg: "#f0fdf4", greenBorder: "#bbf7d0",
// //   redDot: "#dc2626", redText: "#b91c1c", redBg: "#fef2f2", redBorder: "#fecaca",
// //   redTitle: "#7f1d1d", redAction: "#991b1b",
// //   amberDot: "#d97706", amberText: "#b45309", amberBg: "#fffbeb", amberBorder: "#fde68a",
// //   amberTitle: "#78350f", amberAction: "#92400e",
// //   grayDot: "#94a3b8", grayText: "#64748b",
// // };

// // // ─── Signal helpers ───────────────────────────────────────────────────────────

// // function getIO(telemetry: TelemetryParam[], ioId: number): number | null {
// //   const p = telemetry.find((t) => t.io_id === ioId);
// //   if (!p) return null;
// //   const v = parseFloat(p.value);
// //   return isNaN(v) ? null : v;
// // }

// // function getRawIO(telemetry: TelemetryParam[], ioId: number): number | null {
// //   const p = telemetry.find((t) => t.io_id === ioId);
// //   if (!p) return null;
// //   const raw = p.raw_value ?? p.value;
// //   const v = parseFloat(raw);
// //   return isNaN(v) ? null : v;
// // }

// // // FMC650: Ain.1 = (raw_mV * 0.001 / 47) * 1000  →  Amps
// // // Per spec: Ain.1 = (ain.1 / 47) * 1000  where ain.1 is already in V from multiplier
// // function calcCurrentFMC650(telemetry: TelemetryParam[]): number | null {
// //   const raw = getRawIO(telemetry, 9); // raw mV before multiplier
// //   if (raw === null) return null;
// //   const volts = raw * 0.001;          // mV → V
// //   return parseFloat(((volts / 47) * 1000).toFixed(1));
// // }

// // // FMB150: Ain.1 = ain.1 / 83  (IO ID 6 on FMB150, value already in V)
// // function calcCurrentFMB150(telemetry: TelemetryParam[]): number | null {
// //   const raw = getRawIO(telemetry, 6); // IO 6 = ain.1 on FMB150, raw mV
// //   if (raw === null) return null;
// //   const volts = raw * 0.001;          // mV → V
// //   return parseFloat((volts / 83).toFixed(2));
// // }

// // // ─── Alarm types ──────────────────────────────────────────────────────────────

// // interface Alarm {
// //   id: string;
// //   severity: "critical" | "warning";
// //   message: string;
// //   action: string;
// // }

// // // ─── FMC650 alarm logic (GreenX / GreenDrive Neo) ────────────────────────────
// // // Spec: Din.2=true=water short, Din.4=true=water short (true = problem)

// // function computeAlarmsFMC650(
// //   telemetry: TelemetryParam[],
// //   model: string,
// //   setCurrent: number | null
// // ): Alarm[] {
// //   const alarms: Alarm[] = [];

// //   const din1  = getIO(telemetry, 1);
// //   const din2  = getIO(telemetry, 2);   // true = cell body water SHORT
// //   const din4  = getIO(telemetry, 4);   // true = bubbler water SHORT
// //   const ain1A = calcCurrentFMC650(telemetry);
// //   const ain3  = getIO(telemetry, 11);  // IO 11 = ain.3 on FMC650
// //   const dout1 = getIO(telemetry, 179);

// //   const isRunning = din1 === 1 && ain1A !== null && ain1A > 2;
// //   const isEOW     = model === "EOW";
// //   const label     = isEOW ? "engine" : "DG set";

// //   // Always check: abnormal current while OFF
// //   if (din1 === 0 && ain1A !== null && ain1A > 2)
// //     alarms.push({ id: "abnormal_current_off", severity: "critical",
// //       message: `Abnormal: current detected but ${label} is OFF`,
// //       action: "Contact Saarthi Support immediately" });

// //   if (din1 === 1) {
// //     // Remote shutdown
// //     if (dout1 === 1)
// //       alarms.push({ id: "remote_shutdown", severity: "warning",
// //         message: "System remotely shutdown — maintenance mode active",
// //         action: "Check with maintenance team before restarting" });

// //     // ON but no current
// //     if (ain1A !== null && ain1A < 2 && dout1 === 0)
// //       alarms.push({ id: "abnormal_no_current", severity: "critical",
// //         message: `Abnormal: ${label} is ON but no output current`,
// //         action: "Contact Saarthi Support immediately" });

// //     // Electrolyser water short: din2 = true (1) = short
// //     if (din2 === 1)
// //       alarms.push({ id: "electrolyser_water_short", severity: "critical",
// //         message: "Internal electrolyser water shortage detected",
// //         action: "Contact Saarthi Support immediately" });

// //     // Bubbler water short: din4 = true (1) = short (380KVA + 625KVA + EOW)
// //     if ((model === "380KVA" || model === "625KVA" || model === "EOW") && din4 === 1)
// //       alarms.push({ id: "bubbler_water_short", severity: "critical",
// //         message: "Internal bubbler water shortage detected",
// //         action: "Contact Saarthi Support immediately" });

// //     // Main water tank: ain3 > 20 = shortage (380KVA + 625KVA + EOW)
// //     if ((model === "380KVA" || model === "625KVA" || model === "EOW") && ain3 !== null && ain3 > 20)
// //       alarms.push({ id: "main_tank_short", severity: "warning",
// //         message: "Main water tank level is low",
// //         action: "Fill the main water tank" });

// //     // Over/under current vs configurable setpoint
// //     if (isRunning && setCurrent !== null && ain1A !== null) {
// //       const tol = setCurrent * 0.1;
// //       if (ain1A < setCurrent - tol)
// //         alarms.push({ id: "under_current", severity: "warning",
// //           message: `Running under current — ${ain1A} A (set: ${setCurrent} A)`,
// //           action: "Contact Saarthi Support (±10% tolerance)" });
// //       else if (ain1A > setCurrent + tol)
// //         alarms.push({ id: "over_current", severity: "warning",
// //           message: `Running over current — ${ain1A} A (set: ${setCurrent} A)`,
// //           action: "Contact Saarthi Support (±10% tolerance)" });
// //     }
// //   }

// //   return alarms;
// // }

// // // ─── FMB150 alarm logic (GreenDrive Mini / GreenX Mini) ──────────────────────
// // // Spec: Fixed healthy range 9–11A. Ain.2 > 20 = water short.

// // function computeAlarmsFMB150(telemetry: TelemetryParam[]): Alarm[] {
// //   const alarms: Alarm[] = [];

// //   const din1  = getIO(telemetry, 1);
// //   const ain1A = calcCurrentFMB150(telemetry);
// //   // Ain.2 on FMB150 = IO 6? No — IO 6 is ain.1 on FMB150.
// //   // Ain.2 on FMB150 = IO 9 (shared ain.2 slot differs per device)
// //   // Per FMB150 IO map in your telemetry route: IO 9 = ain.1, IO 6 = ain.2 doesn't exist
// //   // Actually per your SHARED_IO_MAP + FMB150_ONLY: ain.2 = IO 6 on FMB150
// //   // But ain.1 = IO 9 (SHARED). For FMB150 ain.2 = IO 6.
// //   // Cell body water = Ain.2 on FMB150 = IO 6, value in V after multiplier
// //   const ain2raw = getRawIO(telemetry, 6); // IO 6 = ain.2 on FMB150 (raw mV)
// //   const ain2V   = ain2raw !== null ? ain2raw * 0.001 : null; // convert to V
// //   const dout1   = getIO(telemetry, 179);

// //   const waterShort = ain2V !== null ? ain2V > 20 : null;

// //   // Always: abnormal current while OFF
// //   if (din1 === 0 && ain1A !== null && ain1A > 2)
// //     alarms.push({ id: "abnormal_current_off", severity: "critical",
// //       message: "Abnormal: current detected but DG set is OFF",
// //       action: "Contact Saarthi Support immediately" });

// //   if (din1 === 1) {
// //     // ON but no current
// //     if (ain1A !== null && ain1A < 2 && dout1 === 0)
// //       alarms.push({ id: "abnormal_no_current", severity: "critical",
// //         message: "Abnormal: DG set is ON but no output current",
// //         action: "Contact Saarthi Support immediately" });

// //     // Internal water level shortage
// //     if (waterShort === true)
// //       alarms.push({ id: "internal_water_short", severity: "warning",
// //         message: "Internal water level shortage",
// //         action: "Fill the external aux tank" });

// //     // Fixed range: healthy = 9–11A
// //     if (ain1A !== null && ain1A > 2) {
// //       if (ain1A < 9)
// //         alarms.push({ id: "under_current", severity: "warning",
// //           message: `Running under current — ${ain1A} A (healthy: 9–11 A)`,
// //           action: "Contact Saarthi Support" });
// //       else if (ain1A > 11)
// //         alarms.push({ id: "over_current", severity: "warning",
// //           message: `Running over current — ${ain1A} A (healthy: 9–11 A)`,
// //           action: "Contact Saarthi Support" });
// //     }
// //   }

// //   return alarms;
// // }

// // // ─── Sub-components ───────────────────────────────────────────────────────────

// // function SignalRow({ label, detail, status, ok, stale = false, isMobile = false }: {
// //   label: string; detail: string; status: string;
// //   ok: boolean | null; stale?: boolean; isMobile?: boolean;
// // }) {
// //   const dotColor   = stale ? C.grayDot : ok === null ? C.grayDot : ok ? C.greenDot : C.redDot;
// //   const valueColor = stale ? C.textTertiary : ok === null ? C.grayText : ok ? C.greenText : C.redText;

// //   return (
// //     <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, padding: isMobile ? "9px 0" : "11px 0", borderBottom: `1px solid ${C.border}` }}>
// //       <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
// //       <div style={{ flex: 1, minWidth: 0 }}>
// //         <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, color: C.textPrimary, lineHeight: 1.3 }}>{label}</div>
// //         <div style={{ fontSize: isMobile ? 10 : 11, color: C.textTertiary, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{detail}</div>
// //       </div>
// //       <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
// //         {stale && !isMobile && (
// //           <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: C.surfaceBg, border: `1px solid ${C.border}`, color: C.textTertiary }}>
// //             last known
// //           </span>
// //         )}
// //         <span style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: valueColor, textAlign: "right" as const, whiteSpace: "nowrap" as const }}>{status}</span>
// //       </div>
// //     </div>
// //   );
// // }

// // function AlarmCard({ alarm, isMobile = false }: { alarm: Alarm; isMobile?: boolean }) {
// //   const crit = alarm.severity === "critical";
// //   return (
// //     <div style={{ background: crit ? C.redBg : C.amberBg, border: `1px solid ${crit ? C.redBorder : C.amberBorder}`, borderRadius: 10, padding: isMobile ? "10px 12px" : "12px 16px", marginBottom: 8 }}>
// //       <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
// //         <div style={{ width: 7, height: 7, borderRadius: "50%", background: crit ? C.redDot : C.amberDot, flexShrink: 0, marginTop: 4 }} />
// //         <div>
// //           <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: crit ? C.redTitle : C.amberTitle, marginBottom: 3 }}>{alarm.message}</div>
// //           <div style={{ fontSize: isMobile ? 11 : 12, color: crit ? C.redAction : C.amberAction }}>{alarm.action}</div>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }

// // function SectionLabel({ text }: { text: string }) {
// //   return (
// //     <div style={{ fontSize: 11, fontWeight: 700, color: C.textTertiary, textTransform: "uppercase" as const, letterSpacing: "0.8px", marginBottom: 10 }}>
// //       {text}
// //     </div>
// //   );
// // }

// // // ─── Main component ───────────────────────────────────────────────────────────

// // export function GreenXHealthPanel({ deviceType, deviceModel, telemetry }: GreenXHealthPanelProps) {
// //   const isMobile = useIsMobile();
// //   const [setCurrent, setSetCurrent] = useState<number | null>(null);
// //   const [editing, setEditing]       = useState(false);
// //   const [inputVal, setInputVal]     = useState("");
// //   const [expanded, setExpanded]     = useState(true);

// //   const isFMC650 = deviceType === "FMC650";
// //   const isFMB150 = deviceType === "FMB150";
// //   const isMini   = deviceModel === "MINI";
// //   const isEOW    = deviceModel === "EOW";

// //   // Gate: only show for known models on known device types
// //   const validFMC650Models = ["380KVA", "625KVA", "1500KVA", "EOW"];
// //   const validFMB150Models = ["MINI", "EOW"];
// //   if (isFMC650 && !validFMC650Models.includes(deviceModel)) return null;
// //   if (isFMB150 && !validFMB150Models.includes(deviceModel)) return null;
// //   if (!isFMC650 && !isFMB150) return null;

// //   // ── Derived signals ──
// //   const din1  = getIO(telemetry, 1);
// //   const din2  = getIO(telemetry, 2);   // FMC650: true=cell water short
// //   const din4  = getIO(telemetry, 4);   // FMC650: true=bubbler short
// //   const ain3  = getIO(telemetry, 11);  // FMC650: main tank (ain.3)
// //   const dout1 = getIO(telemetry, 179);

// //   // Current — different formula per device type
// //   const ain1A = isFMC650 ? calcCurrentFMC650(telemetry) : calcCurrentFMB150(telemetry);

// //   // FMB150 cell water: ain.2 = IO 6, value in V * 0.001, then check >20
// //   const ain2raw     = isFMB150 ? getRawIO(telemetry, 6) : null;
// //   const ain2V       = ain2raw !== null ? ain2raw * 0.001 : null;
// //   const miniWaterOk = ain2V !== null ? ain2V <= 20 : null;
// //   const miniWaterLabel = ain2V === null ? "Unknown" : ain2V <= 20 ? "OK — full" : "Low — shortage";

// //   const isRunning = din1 === 1 && ain1A !== null && ain1A > 2;

// //   // ── Alarms ──
// //   const alarms = isFMC650
// //     ? computeAlarmsFMC650(telemetry, deviceModel, setCurrent)
// //     : computeAlarmsFMB150(telemetry);

// //   const hasAlarms   = alarms.length > 0;
// //   const hasCritical = alarms.some((a) => a.severity === "critical");

// //   // ── Header colors ──
// //   const dotColor       = hasCritical ? C.redDot   : hasAlarms ? C.amberDot   : telemetry.length === 0 ? C.grayDot  : C.greenDot;
// //   const badgeBg        = hasCritical ? C.redBg    : hasAlarms ? C.amberBg    : C.greenBg;
// //   const badgeBorder    = hasCritical ? C.redBorder : hasAlarms ? C.amberBorder : C.greenBorder;
// //   const badgeTextColor = hasCritical ? C.redText  : hasAlarms ? C.amberText  : C.greenText;
// //   const badgeLabel     = hasCritical
// //     ? `${alarms.length} alert${alarms.length !== 1 ? "s" : ""}`
// //     : hasAlarms ? `${alarms.length} warning${alarms.length !== 1 ? "s" : ""}`
// //     : "Healthy";

// //   const productName = isEOW ? "GreenDrive Neo" : isMini ? "GreenDrive Mini" : "GreenX";
// //   const unitLabel   = isEOW ? "Engine" : "DG set";

// //   const subline = isRunning
// //     ? `Running · ${ain1A !== null ? ain1A + " A output" : "—"}`
// //     : din1 === 1 ? `${unitLabel} ON · no output`
// //     : `${unitLabel} OFF`;

// //   const modelBadge = isEOW ? "Engine on Wheels" : isMini ? "Mini (FMB150)" : deviceModel;

// //   // ── FMC650 signal statuses (Din logic: true=1=short for water) ──
// //   const mainTankOk    = ain3 !== null ? ain3 < 20 : null;
// //   const mainTankLabel = ain3 === null ? "Unknown" : ain3 < 20 ? "OK — full" : "Low — shortage";
// //   // Din.2 = 1 = water SHORT → ok when din2 === 0
// //   const cellWaterOk   = din2 !== null ? din2 === 0 : null;
// //   const cellLabel     = din2 === null ? "Unknown" : din2 === 0 ? "OK — full" : "Short";
// //   // Din.4 = 1 = water SHORT → ok when din4 === 0
// //   const bubblerOk     = din4 !== null ? din4 === 0 : null;
// //   const bubblerLabel  = din4 === null ? "Unknown" : din4 === 0 ? "OK — full" : "Short";
// //   const remoteOk      = dout1 !== null ? dout1 === 0 : null;
// //   const remoteLabel   = dout1 === null ? "Unknown" : dout1 === 0 ? "Working" : "Remotely shutdown";

// //   // ── Setpoint deviation (FMC650 only — FMB150 uses fixed 9–11A range) ──
// //   const deviation       = setCurrent !== null && ain1A !== null ? Math.abs(ain1A - setCurrent) : null;
// //   const withinTolerance = deviation !== null && setCurrent !== null ? deviation <= setCurrent * 0.1 : null;

// //   // FMB150 healthy range check
// //   const miniHealthy = isMini && ain1A !== null && ain1A > 2
// //     ? ain1A >= 9 && ain1A <= 11
// //     : null;

// //   const stale = din1 !== 1; // rows below DG/engine status are stale when off

// //   return (
// //     <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>

// //       {/* ── Header ── */}
// //       <div
// //         onClick={() => setExpanded((p) => !p)}
// //         style={{ padding: isMobile ? "12px 14px" : "14px 20px", borderBottom: expanded ? `1px solid ${C.border}` : "none", cursor: "pointer", userSelect: "none", background: C.white }}
// //       >
// //         <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
// //           <div style={{ width: 10, height: 10, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
// //           <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: C.textPrimary }}>
// //             {productName} system health
// //           </span>
// //           <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: badgeBg, border: `1px solid ${badgeBorder}`, color: badgeTextColor }}>
// //             {badgeLabel}
// //           </span>
// //           {!isMobile && (
// //             <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: C.surfaceBg, border: `1px solid ${C.border}`, color: C.textSecond }}>
// //               {modelBadge}
// //             </span>
// //           )}
// //           {isMini && !isMobile && (
// //             <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>
// //               Beta
// //             </span>
// //           )}
// //           <span style={{ marginLeft: "auto", fontSize: 13, color: C.textTertiary, flexShrink: 0 }}>{expanded ? "▾" : "▸"}</span>
// //         </div>
// //         <div style={{ marginTop: 4, marginLeft: 18, fontSize: isMobile ? 11 : 12, color: C.textSecond, fontWeight: 500 }}>
// //           {subline}
// //         </div>
// //       </div>

// //       {expanded && (
// //         <>
// //           {/* ── Active alerts ── */}
// //           {hasAlarms && (
// //             <div style={{ padding: isMobile ? "12px 14px" : "16px 20px", borderBottom: `1px solid ${C.border}`, background: C.white }}>
// //               <SectionLabel text="Active alerts" />
// //               {alarms.map((a) => <AlarmCard key={a.id} alarm={a} isMobile={isMobile} />)}
// //             </div>
// //           )}

// //           {/* ── System signals ── */}
// //           <div style={{ padding: isMobile ? "12px 14px" : "16px 20px", borderBottom: `1px solid ${C.border}`, background: C.white }}>
// //             <SectionLabel text="System signals" />

// //             {/* DG / Engine status — always live */}
// //             <SignalRow
// //               label={isEOW ? "Engine status" : "DG set (genset)"}
// //               detail="Din.1 — run status"
// //               status={din1 === null ? "Unknown" : din1 === 1 ? "ON" : "OFF"}
// //               ok={din1 === null ? null : din1 === 1}
// //               isMobile={isMobile}
// //             />

// //             {/* System running */}
// //             <SignalRow
// //               label="System running"
// //               detail={`Din.1 = ON & Ain.1 > 2 A`}
// //               status={isRunning ? "Running" : din1 === 1 ? `${unitLabel} ON — no output` : "Stopped"}
// //               ok={isRunning ? true : din1 === null ? null : false}
// //               stale={stale}
// //               isMobile={isMobile}
// //             />

// //             {/* Output current */}
// //             <SignalRow
// //               label="Output current"
// //               detail={isFMC650 ? "Ain.1 → (V / 47) × 1000" : "Ain.1 → V / 83"}
// //               status={ain1A !== null ? `${ain1A} A` : "—"}
// //               ok={isMini
// //                 ? (ain1A !== null && ain1A > 2 ? miniHealthy : null)
// //                 : ain1A !== null ? ain1A > 2 : null}
// //               stale={stale}
// //               isMobile={isMobile}
// //             />

// //             {/* FMB150 Mini: show healthy range indicator */}
// //             {isMini && ain1A !== null && ain1A > 2 && (
// //               <SignalRow
// //                 label="Current health range"
// //                 detail="Healthy: 9–11 A"
// //                 status={miniHealthy ? "Within 9–11 A" : `Out of range (${ain1A} A)`}
// //                 ok={miniHealthy}
// //                 stale={stale}
// //                 isMobile={isMobile}
// //               />
// //             )}

// //             {/* Remote shutdown */}
// //             <SignalRow
// //               label="Remote shutdown"
// //               detail="Dout.1 — remote control status"
// //               status={remoteLabel}
// //               ok={remoteOk}
// //               stale={stale}
// //               isMobile={isMobile}
// //             />

// //             {/* FMC650 only: cell body water (Din.2=1=short) */}
// //             {isFMC650 && (
// //               <SignalRow
// //                 label="Cell body water"
// //                 detail="Din.2 — electrolyser cell (0=OK, 1=short)"
// //                 status={cellLabel}
// //                 ok={cellWaterOk}
// //                 stale={stale}
// //                 isMobile={isMobile}
// //               />
// //             )}

// //             {/* FMB150 only: internal water level (Ain.2 in V, >20=short) */}
// //             {isMini && (
// //               <SignalRow
// //                 label="Internal water level"
// //                 detail="Ain.2 — cell body water (<20 V = full)"
// //                 status={miniWaterLabel}
// //                 ok={miniWaterOk}
// //                 stale={stale}
// //                 isMobile={isMobile}
// //               />
// //             )}

// //             {/* FMC650 380KVA / 625KVA / EOW: main tank + bubbler */}
// //             {isFMC650 && (deviceModel === "380KVA" || deviceModel === "625KVA" || isEOW) && (
// //               <>
// //                 <SignalRow
// //                   label="Main water tank"
// //                   detail="Ain.3 — main tank level (<20 = full)"
// //                   status={mainTankLabel}
// //                   ok={mainTankOk}
// //                   stale={stale}
// //                   isMobile={isMobile}
// //                 />
// //                 <SignalRow
// //                   label="Bubbler water"
// //                   detail="Din.4 — bubbler level (0=OK, 1=short)"
// //                   status={bubblerLabel}
// //                   ok={bubblerOk}
// //                   stale={stale}
// //                   isMobile={isMobile}
// //                 />
// //               </>
// //             )}
// //           </div>

// //           {/* ── Setpoint (FMC650 only — FMB150 uses fixed 9–11A) ── */}
// //           <div style={{ padding: isMobile ? "12px 14px" : "16px 20px", background: C.pageBg }}>
// //             {isFMC650 ? (
// //               <>
// //                 <SectionLabel text="Current setpoint" />
// //                 {editing ? (
// //                   <div style={{ display: "flex", flexDirection: isMobile ? "column" as const : "row" as const, alignItems: isMobile ? "stretch" : "center", gap: 8 }}>
// //                     <input
// //                       type="number" value={inputVal} onChange={(e) => setInputVal(e.target.value)}
// //                       placeholder="Enter set current (A)" autoFocus
// //                       style={{ flex: 1, padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: isMobile ? 14 : 13, color: C.textPrimary, background: C.white, outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const }}
// //                     />
// //                     <div style={{ display: "flex", gap: 8 }}>
// //                       <button
// //                         onClick={() => { const v = parseFloat(inputVal); if (!isNaN(v) && v > 0) setSetCurrent(v); setEditing(false); setInputVal(""); }}
// //                         style={{ flex: isMobile ? 1 : undefined, padding: "8px 16px", background: "#16a34a", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
// //                       >Save</button>
// //                       <button
// //                         onClick={() => { setEditing(false); setInputVal(""); }}
// //                         style={{ flex: isMobile ? 1 : undefined, padding: "8px 14px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textSecond, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
// //                       >Cancel</button>
// //                     </div>
// //                   </div>
// //                 ) : (
// //                   <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
// //                     <span style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: C.textPrimary }}>
// //                       {setCurrent !== null ? `${setCurrent} A` : "Not configured"}
// //                     </span>
// //                     {withinTolerance !== null && deviation !== null && (
// //                       <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: withinTolerance ? C.greenBg : C.amberBg, border: `1px solid ${withinTolerance ? C.greenBorder : C.amberBorder}`, color: withinTolerance ? C.greenText : C.amberText }}>
// //                         {withinTolerance ? "Within ±10%" : `${deviation.toFixed(0)} A ${ain1A! < setCurrent! ? "under" : "over"}`}
// //                       </span>
// //                     )}
// //                     <button
// //                       onClick={() => setEditing(true)}
// //                       style={{ marginLeft: isMobile ? 0 : "auto", padding: "7px 14px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textSecond, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
// //                     >
// //                       {setCurrent !== null ? "Edit" : "Configure"}
// //                     </button>
// //                   </div>
// //                 )}
// //               </>
// //             ) : (
// //               // FMB150: show fixed healthy range info instead of configurable setpoint
// //               <>
// //                 <SectionLabel text="Healthy current range" />
// //                 <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
// //                   <span style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: C.textPrimary }}>9 – 11 A</span>
// //                   {ain1A !== null && ain1A > 2 && (
// //                     <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: miniHealthy ? C.greenBg : C.amberBg, border: `1px solid ${miniHealthy ? C.greenBorder : C.amberBorder}`, color: miniHealthy ? C.greenText : C.amberText }}>
// //                       {miniHealthy ? `✓ ${ain1A} A — within range` : `${ain1A} A — out of range`}
// //                     </span>
// //                   )}
// //                   <span style={{ marginLeft: isMobile ? 0 : "auto", fontSize: 11, color: C.textTertiary }}>Fixed per device spec</span>
// //                 </div>
// //               </>
// //             )}
// //           </div>
// //         </>
// //       )}
// //     </div>
// //   );
// // }
// "use client";

// import { useState } from "react";
// import { useIsMobile } from "@/hooks/useIsMobile";

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
//   deviceType: string;   // "FMC650" | "FMB150"
//   deviceModel: string;  // "380KVA" | "625KVA" | "1500KVA" | "EOW" | "MINI"
//   telemetry: TelemetryParam[];
// }

// // ─── Colors ───────────────────────────────────────────────────────────────────
// const C = {
//   white: "#ffffff", pageBg: "#f8fafc", surfaceBg: "#f1f5f9",
//   border: "#e2e8f0", borderLight: "#f1f5f9",
//   textPrimary: "#0f172a", textSecond: "#64748b", textTertiary: "#94a3b8",
//   greenDot: "#16a34a", greenText: "#15803d", greenBg: "#f0fdf4", greenBorder: "#bbf7d0",
//   redDot: "#dc2626", redText: "#b91c1c", redBg: "#fef2f2", redBorder: "#fecaca",
//   redTitle: "#7f1d1d", redAction: "#991b1b",
//   amberDot: "#d97706", amberText: "#b45309", amberBg: "#fffbeb", amberBorder: "#fde68a",
//   amberTitle: "#78350f", amberAction: "#92400e",
//   grayDot: "#94a3b8", grayText: "#64748b",
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

// // FMC650: Ain.1 = (raw_mV * 0.001 / 47) * 1000  →  Amps
// // Per spec: Ain.1 = (ain.1 / 47) * 1000  where ain.1 is already in V from multiplier
// function calcCurrentFMC650(telemetry: TelemetryParam[]): number | null {
//   const raw = getRawIO(telemetry, 9); // raw mV before multiplier
//   if (raw === null) return null;
//   const volts = raw * 0.001;          // mV → V
//   return parseFloat(((volts / 47) * 1000).toFixed(1));
// }

// // FMB150: Ain.1 = ain.1 / 83  (IO ID 6 on FMB150, value already in V)
// function calcCurrentFMB150(telemetry: TelemetryParam[]): number | null {
//   const raw = getRawIO(telemetry, 6); // IO 6 = ain.1 on FMB150, raw mV
//   if (raw === null) return null;
//   const volts = raw * 0.001;          // mV → V
//   return parseFloat((volts / 83).toFixed(2));
// }

// // ─── Alarm types ──────────────────────────────────────────────────────────────

// interface Alarm {
//   id: string;
//   severity: "critical" | "warning";
//   message: string;
//   action: string;
// }

// // ─── FMC650 alarm logic (GreenX / GreenDrive Neo) ────────────────────────────
// // Spec: Din.2=true=water short, Din.4=true=water short (true = problem)

// function computeAlarmsFMC650(
//   telemetry: TelemetryParam[],
//   model: string,
//   setCurrent: number | null
// ): Alarm[] {
//   const alarms: Alarm[] = [];

//   const din1  = getIO(telemetry, 1);
//   const din2  = getIO(telemetry, 2);   // 1 = cell body water SHORT
//   const din4  = getIO(telemetry, 4);   // 1 = bubbler water SHORT
//   const ain1A = calcCurrentFMC650(telemetry);
//   const ain3  = getIO(telemetry, 11);  // IO 11 = ain.3 on FMC650, main tank
//   const dout1 = getIO(telemetry, 179);

//   const isRunning = din1 === 1 && ain1A !== null && ain1A > 2;
//   const isEOW     = model === "EOW";
//   const label     = isEOW ? "engine" : "DG set";
//   const hasMainTank = model === "380KVA" || model === "625KVA" || model === "EOW";

//   // ── Always check (regardless of din1) ─────────────────────────────────────

//   // Abnormal: current flowing but DG/engine is OFF
//   if (din1 === 0 && ain1A !== null && ain1A > 2)
//     alarms.push({ id: "abnormal_current_off", severity: "critical",
//       message: `Abnormal: current detected but ${label} is OFF`,
//       action: "Contact Saarthi Support immediately" });

//   // ── Only when din1 = ON ────────────────────────────────────────────────────

//   if (din1 === 1) {

//     // Remote shutdown in maintenance
//     if (dout1 === 1)
//       alarms.push({ id: "remote_shutdown", severity: "warning",
//         message: "System remotely shutdown — maintenance mode active",
//         action: "Check with maintenance team before restarting" });

//     // Spec alarm: din1=true & ain1 < 0.2A & ain3 < 20 → abnormal, no output current
//     if (ain1A !== null && ain1A < 0.2 && ain3 !== null && ain3 < 20 && dout1 === 0)
//       alarms.push({ id: "abnormal_no_current", severity: "critical",
//         message: `Abnormal: ${label} is ON but no output current`,
//         action: "Contact Saarthi Support immediately" });

//     // Spec alarm: din1=true & ain1 > 0.2A & ain3 > 20 → system off due to water tank short
//     if (hasMainTank && ain1A !== null && ain1A > 0.2 && ain3 !== null && ain3 > 20)
//       alarms.push({ id: "system_off_water_tank", severity: "critical",
//         message: "System stopped — main water tank is empty",
//         action: "Fill the main water tank immediately" });

//     // General abnormal: din1=true & ain1 < 2 & dout1=false (catch-all for no-current)
//     if (ain1A !== null && ain1A < 2 && dout1 === 0 && !(ain1A < 0.2 && ain3 !== null && ain3 < 20))
//       alarms.push({ id: "abnormal_low_current", severity: "critical",
//         message: `Abnormal: ${label} is ON but output current very low (${ain1A} A)`,
//         action: "Contact Saarthi Support immediately" });

//     // Electrolyser water short: din2=1=short — only when running
//     if (isRunning && din2 === 1)
//       alarms.push({ id: "electrolyser_water_short", severity: "critical",
//         message: "Internal electrolyser water shortage detected",
//         action: "Contact Saarthi Support immediately" });

//     // Bubbler water short: din4=1=short — only when running, 380/625/EOW only
//     if (isRunning && hasMainTank && din4 === 1)
//       alarms.push({ id: "bubbler_water_short", severity: "critical",
//         message: "Internal bubbler water shortage detected",
//         action: "Contact Saarthi Support immediately" });

//     // Main water tank low: ain3 > 20 — 380/625/EOW only
//     if (hasMainTank && ain3 !== null && ain3 > 20)
//       alarms.push({ id: "main_tank_short", severity: "warning",
//         message: "Main water tank level is low",
//         action: "Fill the main water tank" });

//     // Over/under current vs configurable setpoint (only when running)
//     if (isRunning && setCurrent !== null && ain1A !== null) {
//       const tol = setCurrent * 0.1;
//       if (ain1A < setCurrent - tol)
//         alarms.push({ id: "under_current", severity: "warning",
//           message: `Running under current — ${ain1A} A (set: ${setCurrent} A)`,
//           action: "Contact Saarthi Support (±10% tolerance)" });
//       else if (ain1A > setCurrent + tol)
//         alarms.push({ id: "over_current", severity: "warning",
//           message: `Running over current — ${ain1A} A (set: ${setCurrent} A)`,
//           action: "Contact Saarthi Support (±10% tolerance)" });
//     }
//   }

//   return alarms;
// }

// // ─── FMB150 alarm logic (GreenDrive Mini / GreenX Mini) ──────────────────────
// // Spec: Fixed healthy range 9–11A. Ain.2 > 20 = water short.

// function computeAlarmsFMB150(telemetry: TelemetryParam[]): Alarm[] {
//   const alarms: Alarm[] = [];

//   const din1   = getIO(telemetry, 1);
//   const ain1A  = calcCurrentFMB150(telemetry);
//   const ain2raw = getRawIO(telemetry, 6); // IO 6 = ain.2 on FMB150 (raw mV)
//   const ain2V   = ain2raw !== null ? ain2raw * 0.001 : null;
//   const dout1  = getIO(telemetry, 179);

//   const isRunning  = din1 === 1 && ain1A !== null && ain1A > 2;
//   const waterShort = ain2V !== null ? ain2V > 20 : null;

//   // Always: abnormal current while DG is OFF
//   if (din1 === 0 && ain1A !== null && ain1A > 2)
//     alarms.push({ id: "abnormal_current_off", severity: "critical",
//       message: "Abnormal: current detected but DG set is OFF",
//       action: "Contact Saarthi Support immediately" });

//   if (din1 === 1) {
//     // Remote shutdown
//     if (dout1 === 1)
//       alarms.push({ id: "remote_shutdown", severity: "warning",
//         message: "System remotely shutdown — maintenance mode active",
//         action: "Check with maintenance team before restarting" });

//     // DG ON but no output current (and not in remote shutdown)
//     if (ain1A !== null && ain1A < 2 && dout1 === 0)
//       alarms.push({ id: "abnormal_no_current", severity: "critical",
//         message: "Abnormal: DG set is ON but no output current",
//         action: "Contact Saarthi Support immediately" });

//     // Internal water level shortage — only check when running
//     if (isRunning && waterShort === true)
//       alarms.push({ id: "internal_water_short", severity: "warning",
//         message: "Internal water level shortage",
//         action: "Fill the external aux tank" });

//     // Over/under current — only when actually running (ain1A > 2)
//     if (isRunning && ain1A !== null) {
//       if (ain1A < 9)
//         alarms.push({ id: "under_current", severity: "warning",
//           message: `Running under current — ${ain1A} A (healthy: 9–11 A)`,
//           action: "Contact Saarthi Support" });
//       else if (ain1A > 11)
//         alarms.push({ id: "over_current", severity: "warning",
//           message: `Running over current — ${ain1A} A (healthy: 9–11 A)`,
//           action: "Contact Saarthi Support" });
//     }
//   }

//   return alarms;
// }

// // ─── Sub-components ───────────────────────────────────────────────────────────

// function SignalRow({ label, detail, status, ok, stale = false, isMobile = false }: {
//   label: string; detail: string; status: string;
//   ok: boolean | null; stale?: boolean; isMobile?: boolean;
// }) {
//   const dotColor   = stale ? C.grayDot : ok === null ? C.grayDot : ok ? C.greenDot : C.redDot;
//   const valueColor = stale ? C.textTertiary : ok === null ? C.grayText : ok ? C.greenText : C.redText;

//   return (
//     <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, padding: isMobile ? "9px 0" : "11px 0", borderBottom: `1px solid ${C.border}` }}>
//       <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
//       <div style={{ flex: 1, minWidth: 0 }}>
//         <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, color: C.textPrimary, lineHeight: 1.3 }}>{label}</div>
//         <div style={{ fontSize: isMobile ? 10 : 11, color: C.textTertiary, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{detail}</div>
//       </div>
//       <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
//         {stale && !isMobile && (
//           <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: C.surfaceBg, border: `1px solid ${C.border}`, color: C.textTertiary }}>
//             last known
//           </span>
//         )}
//         <span style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: valueColor, textAlign: "right" as const, whiteSpace: "nowrap" as const }}>{status}</span>
//       </div>
//     </div>
//   );
// }

// function AlarmCard({ alarm, isMobile = false }: { alarm: Alarm; isMobile?: boolean }) {
//   const crit = alarm.severity === "critical";
//   return (
//     <div style={{ background: crit ? C.redBg : C.amberBg, border: `1px solid ${crit ? C.redBorder : C.amberBorder}`, borderRadius: 10, padding: isMobile ? "10px 12px" : "12px 16px", marginBottom: 8 }}>
//       <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
//         <div style={{ width: 7, height: 7, borderRadius: "50%", background: crit ? C.redDot : C.amberDot, flexShrink: 0, marginTop: 4 }} />
//         <div>
//           <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: crit ? C.redTitle : C.amberTitle, marginBottom: 3 }}>{alarm.message}</div>
//           <div style={{ fontSize: isMobile ? 11 : 12, color: crit ? C.redAction : C.amberAction }}>{alarm.action}</div>
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
//   const isMobile = useIsMobile();
//   const [setCurrent, setSetCurrent] = useState<number | null>(null);
//   const [editing, setEditing]       = useState(false);
//   const [inputVal, setInputVal]     = useState("");
//   const [expanded, setExpanded]     = useState(true);

//   const isFMC650 = deviceType === "FMC650";
//   const isFMB150 = deviceType === "FMB150";
//   const isMini   = deviceModel === "MINI";
//   const isEOW    = deviceModel === "EOW";

//   // Gate: only show for known models on known device types
//   const validFMC650Models = ["380KVA", "625KVA", "1500KVA", "EOW"];
//   const validFMB150Models = ["MINI", "EOW"];
//   if (isFMC650 && !validFMC650Models.includes(deviceModel)) return null;
//   if (isFMB150 && !validFMB150Models.includes(deviceModel)) return null;
//   if (!isFMC650 && !isFMB150) return null;

//   // ── Derived signals ──
//   const din1  = getIO(telemetry, 1);
//   const din2  = getIO(telemetry, 2);   // FMC650: true=cell water short
//   const din4  = getIO(telemetry, 4);   // FMC650: true=bubbler short
//   const ain3  = getIO(telemetry, 11);  // FMC650: main tank (ain.3)
//   const dout1 = getIO(telemetry, 179);

//   // Current — different formula per device type
//   const ain1A = isFMC650 ? calcCurrentFMC650(telemetry) : calcCurrentFMB150(telemetry);

//   // FMB150 cell water: ain.2 = IO 6, value in V * 0.001, then check >20
//   const ain2raw     = isFMB150 ? getRawIO(telemetry, 6) : null;
//   const ain2V       = ain2raw !== null ? ain2raw * 0.001 : null;
//   const miniWaterOk = ain2V !== null ? ain2V <= 20 : null;
//   const miniWaterLabel = ain2V === null ? "Unknown" : ain2V <= 20 ? "OK — full" : "Low — shortage";

//   const isRunning = din1 === 1 && ain1A !== null && ain1A > 2;

//   // ── Alarms ──
//   const alarms = isFMC650
//     ? computeAlarmsFMC650(telemetry, deviceModel, setCurrent)
//     : computeAlarmsFMB150(telemetry);

//   const hasAlarms   = alarms.length > 0;
//   const hasCritical = alarms.some((a) => a.severity === "critical");

//   // ── Header colors ──
//   const dotColor       = hasCritical ? C.redDot   : hasAlarms ? C.amberDot   : telemetry.length === 0 ? C.grayDot  : C.greenDot;
//   const badgeBg        = hasCritical ? C.redBg    : hasAlarms ? C.amberBg    : C.greenBg;
//   const badgeBorder    = hasCritical ? C.redBorder : hasAlarms ? C.amberBorder : C.greenBorder;
//   const badgeTextColor = hasCritical ? C.redText  : hasAlarms ? C.amberText  : C.greenText;
//   const badgeLabel     = hasCritical
//     ? `${alarms.length} alert${alarms.length !== 1 ? "s" : ""}`
//     : hasAlarms ? `${alarms.length} warning${alarms.length !== 1 ? "s" : ""}`
//     : "Healthy";

//   const productName = isEOW ? "GreenDrive Neo" : isMini ? "GreenDrive Mini" : "GreenX";
//   const unitLabel   = isEOW ? "Engine" : "DG set";

//   const subline = isRunning
//     ? `Running · ${ain1A !== null ? ain1A + " A output" : "—"}`
//     : din1 === 1 ? `${unitLabel} ON · no output`
//     : `${unitLabel} OFF`;

//   const modelBadge = isEOW ? "Engine on Wheels" : isMini ? "Mini (FMB150)" : deviceModel;

//   // ── FMC650 signal statuses (Din logic: true=1=short for water) ──
//   const mainTankOk    = ain3 !== null ? ain3 < 20 : null;
//   const mainTankLabel = ain3 === null ? "Unknown" : ain3 < 20 ? "OK — full" : "Low — shortage";
//   // Din.2 = 1 = water SHORT → ok when din2 === 0
//   const cellWaterOk   = din2 !== null ? din2 === 0 : null;
//   const cellLabel     = din2 === null ? "Unknown" : din2 === 0 ? "OK — full" : "Short";
//   // Din.4 = 1 = water SHORT → ok when din4 === 0
//   const bubblerOk     = din4 !== null ? din4 === 0 : null;
//   const bubblerLabel  = din4 === null ? "Unknown" : din4 === 0 ? "OK — full" : "Short";
//   const remoteOk      = dout1 !== null ? dout1 === 0 : null;
//   const remoteLabel   = dout1 === null ? "Unknown" : dout1 === 0 ? "Working" : "Remotely shutdown";

//   // ── Setpoint deviation (FMC650 only — FMB150 uses fixed 9–11A range) ──
//   const deviation       = setCurrent !== null && ain1A !== null ? Math.abs(ain1A - setCurrent) : null;
//   const withinTolerance = deviation !== null && setCurrent !== null ? deviation <= setCurrent * 0.1 : null;

//   // FMB150 healthy range check
//   const miniHealthy = isMini && ain1A !== null && ain1A > 2
//     ? ain1A >= 9 && ain1A <= 11
//     : null;

//   const stale = din1 !== 1; // rows below DG/engine status are stale when off

//   return (
//     <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>

//       {/* ── Header ── */}
//       <div
//         onClick={() => setExpanded((p) => !p)}
//         style={{ padding: isMobile ? "12px 14px" : "14px 20px", borderBottom: expanded ? `1px solid ${C.border}` : "none", cursor: "pointer", userSelect: "none", background: C.white }}
//       >
//         <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
//           <div style={{ width: 10, height: 10, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
//           <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: C.textPrimary }}>
//             {productName} system health
//           </span>
//           <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: badgeBg, border: `1px solid ${badgeBorder}`, color: badgeTextColor }}>
//             {badgeLabel}
//           </span>
//           {!isMobile && (
//             <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: C.surfaceBg, border: `1px solid ${C.border}`, color: C.textSecond }}>
//               {modelBadge}
//             </span>
//           )}
//           {isMini && !isMobile && (
//             <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>
//               Beta
//             </span>
//           )}
//           <span style={{ marginLeft: "auto", fontSize: 13, color: C.textTertiary, flexShrink: 0 }}>{expanded ? "▾" : "▸"}</span>
//         </div>
//         <div style={{ marginTop: 4, marginLeft: 18, fontSize: isMobile ? 11 : 12, color: C.textSecond, fontWeight: 500 }}>
//           {subline}
//         </div>
//       </div>

//       {expanded && (
//         <>
//           {/* ── Active alerts ── */}
//           {hasAlarms && (
//             <div style={{ padding: isMobile ? "12px 14px" : "16px 20px", borderBottom: `1px solid ${C.border}`, background: C.white }}>
//               <SectionLabel text="Active alerts" />
//               {alarms.map((a) => <AlarmCard key={a.id} alarm={a} isMobile={isMobile} />)}
//             </div>
//           )}

//           {/* ── System signals ── */}
//           <div style={{ padding: isMobile ? "12px 14px" : "16px 20px", borderBottom: `1px solid ${C.border}`, background: C.white }}>
//             <SectionLabel text="System signals" />

//             {/* DG / Engine status — always live */}
//             <SignalRow
//               label={isEOW ? "Engine status" : "DG set (genset)"}
//               detail="Din.1 — run status"
//               status={din1 === null ? "Unknown" : din1 === 1 ? "ON" : "OFF"}
//               ok={din1 === null ? null : din1 === 1}
//               isMobile={isMobile}
//             />

//             {/* System running */}
//             <SignalRow
//               label="System running"
//               detail={`Din.1 = ON & Ain.1 > 2 A`}
//               status={isRunning ? "Running" : din1 === 1 ? `${unitLabel} ON — no output` : "Stopped"}
//               ok={isRunning ? true : din1 === null ? null : false}
//               stale={stale}
//               isMobile={isMobile}
//             />

//             {/* Output current */}
//             <SignalRow
//               label="Output current"
//               detail={isFMC650 ? "Ain.1 → (V / 47) × 1000" : "Ain.1 → V / 83"}
//               status={ain1A !== null ? `${ain1A} A` : "—"}
//               ok={isMini
//                 ? (ain1A !== null && ain1A > 2 ? miniHealthy : null)
//                 : ain1A !== null ? ain1A > 2 : null}
//               stale={stale}
//               isMobile={isMobile}
//             />

//             {/* FMB150 Mini: show healthy range indicator */}
//             {isMini && ain1A !== null && ain1A > 2 && (
//               <SignalRow
//                 label="Current health range"
//                 detail="Healthy: 9–11 A"
//                 status={miniHealthy ? "Within 9–11 A" : `Out of range (${ain1A} A)`}
//                 ok={miniHealthy}
//                 stale={stale}
//                 isMobile={isMobile}
//               />
//             )}

//             {/* Remote shutdown */}
//             <SignalRow
//               label="Remote shutdown"
//               detail="Dout.1 — remote control status"
//               status={remoteLabel}
//               ok={remoteOk}
//               stale={stale}
//               isMobile={isMobile}
//             />

//             {/* FMC650 only: cell body water (Din.2=1=short) */}
//             {isFMC650 && (
//               <SignalRow
//                 label="Cell body water"
//                 detail="Din.2 — electrolyser cell (0=OK, 1=short)"
//                 status={cellLabel}
//                 ok={cellWaterOk}
//                 stale={stale}
//                 isMobile={isMobile}
//               />
//             )}

//             {/* FMB150 only: internal water level (Ain.2 in V, >20=short) */}
//             {isMini && (
//               <SignalRow
//                 label="Internal water level"
//                 detail="Ain.2 — cell body water (<20 V = full)"
//                 status={miniWaterLabel}
//                 ok={miniWaterOk}
//                 stale={stale}
//                 isMobile={isMobile}
//               />
//             )}

//             {/* FMC650 380KVA / 625KVA / EOW: main tank + bubbler */}
//             {isFMC650 && (deviceModel === "380KVA" || deviceModel === "625KVA" || isEOW) && (
//               <>
//                 <SignalRow
//                   label="Main water tank"
//                   detail="Ain.3 — main tank level (<20 = full)"
//                   status={mainTankLabel}
//                   ok={mainTankOk}
//                   stale={stale}
//                   isMobile={isMobile}
//                 />
//                 <SignalRow
//                   label="Bubbler water"
//                   detail="Din.4 — bubbler level (0=OK, 1=short)"
//                   status={bubblerLabel}
//                   ok={bubblerOk}
//                   stale={stale}
//                   isMobile={isMobile}
//                 />
//               </>
//             )}
//           </div>

//           {/* ── Setpoint (FMC650 only — FMB150 uses fixed 9–11A) ── */}
//           <div style={{ padding: isMobile ? "12px 14px" : "16px 20px", background: C.pageBg }}>
//             {isFMC650 ? (
//               <>
//                 <SectionLabel text="Current setpoint" />
//                 {editing ? (
//                   <div style={{ display: "flex", flexDirection: isMobile ? "column" as const : "row" as const, alignItems: isMobile ? "stretch" : "center", gap: 8 }}>
//                     <input
//                       type="number" value={inputVal} onChange={(e) => setInputVal(e.target.value)}
//                       placeholder="Enter set current (A)" autoFocus
//                       style={{ flex: 1, padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: isMobile ? 14 : 13, color: C.textPrimary, background: C.white, outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const }}
//                     />
//                     <div style={{ display: "flex", gap: 8 }}>
//                       <button
//                         onClick={() => { const v = parseFloat(inputVal); if (!isNaN(v) && v > 0) setSetCurrent(v); setEditing(false); setInputVal(""); }}
//                         style={{ flex: isMobile ? 1 : undefined, padding: "8px 16px", background: "#16a34a", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
//                       >Save</button>
//                       <button
//                         onClick={() => { setEditing(false); setInputVal(""); }}
//                         style={{ flex: isMobile ? 1 : undefined, padding: "8px 14px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textSecond, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
//                       >Cancel</button>
//                     </div>
//                   </div>
//                 ) : (
//                   <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
//                     <span style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: C.textPrimary }}>
//                       {setCurrent !== null ? `${setCurrent} A` : "Not configured"}
//                     </span>
//                     {withinTolerance !== null && deviation !== null && (
//                       <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: withinTolerance ? C.greenBg : C.amberBg, border: `1px solid ${withinTolerance ? C.greenBorder : C.amberBorder}`, color: withinTolerance ? C.greenText : C.amberText }}>
//                         {withinTolerance ? "Within ±10%" : `${deviation.toFixed(0)} A ${ain1A! < setCurrent! ? "under" : "over"}`}
//                       </span>
//                     )}
//                     <button
//                       onClick={() => setEditing(true)}
//                       style={{ marginLeft: isMobile ? 0 : "auto", padding: "7px 14px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textSecond, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
//                     >
//                       {setCurrent !== null ? "Edit" : "Configure"}
//                     </button>
//                   </div>
//                 )}
//               </>
//             ) : (
//               // FMB150: show fixed healthy range info instead of configurable setpoint
//               <>
//                 <SectionLabel text="Healthy current range" />
//                 <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
//                   <span style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: C.textPrimary }}>9 – 11 A</span>
//                   {ain1A !== null && ain1A > 2 && (
//                     <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: miniHealthy ? C.greenBg : C.amberBg, border: `1px solid ${miniHealthy ? C.greenBorder : C.amberBorder}`, color: miniHealthy ? C.greenText : C.amberText }}>
//                       {miniHealthy ? `✓ ${ain1A} A — within range` : `${ain1A} A — out of range`}
//                     </span>
//                   )}
//                   <span style={{ marginLeft: isMobile ? 0 : "auto", fontSize: 11, color: C.textTertiary }}>Fixed per device spec</span>
//                 </div>
//               </>
//             )}
//           </div>
//         </>
//       )}
//     </div>
//   );
// }
"use client";

import { useState, useRef } from "react";
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
  deviceType: string;   // "FMC650" | "FMB150"
  deviceModel: string;  // "380KVA" | "625KVA" | "1500KVA" | "EOW" | "MINI"
  telemetry: TelemetryParam[];
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

// FMC650: Ain.1 = (raw_mV * 0.001 / 47) * 1000  →  Amps
// Per spec: Ain.1 = (ain.1 / 47) * 1000  where ain.1 is already in V from multiplier
function calcCurrentFMC650(telemetry: TelemetryParam[]): number | null {
  const raw = getRawIO(telemetry, 9); // raw mV before multiplier
  if (raw === null) return null;
  const volts = raw * 0.001;          // mV → V
  return parseFloat(((volts / 47) * 1000).toFixed(1));
}

// FMB150: Ain.1 = ain.1 / 83  (IO ID 6 on FMB150, value already in V)
function calcCurrentFMB150(telemetry: TelemetryParam[]): number | null {
  const raw = getRawIO(telemetry, 6); // IO 6 = ain.1 on FMB150, raw mV
  if (raw === null) return null;
  const volts = raw * 0.001;          // mV → V
  return parseFloat((volts / 83).toFixed(2));
}

// ─── Alarm types ──────────────────────────────────────────────────────────────

interface Alarm {
  id: string;
  severity: "critical" | "warning";
  message: string;
  action: string;
}

// ─── FMC650 alarm logic (GreenX / GreenDrive Neo) ────────────────────────────
// Spec: Din.2=true=water short, Din.4=true=water short (true = problem)

function computeAlarmsFMC650(
  telemetry: TelemetryParam[],
  model: string,
  setCurrent: number | null,
  tankShortSince: number | null  // timestamp (ms) when tank first went short
): Alarm[] {
  const alarms: Alarm[] = [];

  const din1  = getIO(telemetry, 1);
  const din2  = getIO(telemetry, 2);   // 1 = cell body water SHORT
  const din4  = getIO(telemetry, 4);   // 1 = bubbler water SHORT
  const ain1A = calcCurrentFMC650(telemetry);
  const ain3  = getIO(telemetry, 11);  // IO 11 = ain.3 on FMC650, main tank
  const dout1 = getIO(telemetry, 179);

  const isRunning = din1 === 1 && ain1A !== null && ain1A > 2;
  const isEOW     = model === "EOW";
  const label     = isEOW ? "engine" : "DG set";
  const hasMainTank = model === "380KVA" || model === "625KVA" || model === "EOW";

  // ── Always check (regardless of din1) ─────────────────────────────────────

  // Abnormal: current flowing but DG/engine is OFF
  if (din1 === 0 && ain1A !== null && ain1A > 2)
    alarms.push({ id: "abnormal_current_off", severity: "critical",
      message: `Abnormal: current detected but ${label} is OFF`,
      action: "Contact Saarthi Support immediately" });

  // ── Only when din1 = ON ────────────────────────────────────────────────────

  if (din1 === 1) {

    // Remote shutdown in maintenance
    if (dout1 === 1)
      alarms.push({ id: "remote_shutdown", severity: "warning",
        message: "System remotely shutdown — maintenance mode active",
        action: "Check with maintenance team before restarting" });

    // Spec alarm: din1=true & ain1 < 0.2A & ain3 < 20 → abnormal, no output current
    if (ain1A !== null && ain1A < 0.2 && ain3 !== null && ain3 < 20 && dout1 === 0)
      alarms.push({ id: "abnormal_no_current", severity: "critical",
        message: `Abnormal: ${label} is ON but no output current`,
        action: "Contact Saarthi Support immediately" });

    // Spec alarm: din1=true & ain1 > 0.2A & ain3 > 20 → system off due to water tank short
    // Only alert after 60 continuous minutes to avoid false alarms from tank shaking
    if (hasMainTank && ain1A !== null && ain1A > 0.2 && ain3 !== null && ain3 > 20
        && tankShortSince !== null && Date.now() - tankShortSince >= 60 * 60 * 1000)
      alarms.push({ id: "system_off_water_tank", severity: "critical",
        message: "System stopped — main water tank is empty (sustained 60+ min)",
        action: "Fill the main water tank immediately" });

    // General abnormal: din1=true & ain1 < 2 & dout1=false (catch-all for no-current)
    if (ain1A !== null && ain1A < 2 && dout1 === 0 && !(ain1A < 0.2 && ain3 !== null && ain3 < 20))
      alarms.push({ id: "abnormal_low_current", severity: "critical",
        message: `Abnormal: ${label} is ON but output current very low (${ain1A} A)`,
        action: "Contact Saarthi Support immediately" });

    // Electrolyser water short: din2=1=short — only when running
    if (isRunning && din2 === 1)
      alarms.push({ id: "electrolyser_water_short", severity: "critical",
        message: "Internal electrolyser water shortage detected",
        action: "Contact Saarthi Support immediately" });

    // Bubbler water short: din4=1=short — only when running, 380/625/EOW only
    if (isRunning && hasMainTank && din4 === 1)
      alarms.push({ id: "bubbler_water_short", severity: "critical",
        message: "Internal bubbler water shortage detected",
        action: "Contact Saarthi Support immediately" });

    // Main water tank low: ain3 > 20 — 380/625/EOW only
    // Only alert after 60 continuous minutes to avoid false alarms from tank shaking
    const TANK_ALERT_DELAY_MS = 60 * 60 * 1000;
    if (hasMainTank && ain3 !== null && ain3 > 20 && tankShortSince !== null
        && Date.now() - tankShortSince >= TANK_ALERT_DELAY_MS)
      alarms.push({ id: "main_tank_short", severity: "warning",
        message: "Main water tank level is low (sustained 60+ min)",
        action: "Fill the main water tank" });

    // Over/under current vs configurable setpoint (only when running)
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

// ─── FMB150 alarm logic (GreenDrive Mini / GreenX Mini) ──────────────────────
// Spec: Fixed healthy range 9–11A. Ain.2 > 20 = water short.

function computeAlarmsFMB150(telemetry: TelemetryParam[]): Alarm[] {
  const alarms: Alarm[] = [];

  const din1   = getIO(telemetry, 1);
  const ain1A  = calcCurrentFMB150(telemetry);
  const ain2raw = getRawIO(telemetry, 6); // IO 6 = ain.2 on FMB150 (raw mV)
  const ain2V   = ain2raw !== null ? ain2raw * 0.001 : null;
  const dout1  = getIO(telemetry, 179);

  const isRunning  = din1 === 1 && ain1A !== null && ain1A > 2;
  const waterShort = ain2V !== null ? ain2V > 20 : null;

  // Always: abnormal current while DG is OFF
  if (din1 === 0 && ain1A !== null && ain1A > 2)
    alarms.push({ id: "abnormal_current_off", severity: "critical",
      message: "Abnormal: current detected but DG set is OFF",
      action: "Contact Saarthi Support immediately" });

  if (din1 === 1) {
    // Remote shutdown
    if (dout1 === 1)
      alarms.push({ id: "remote_shutdown", severity: "warning",
        message: "System remotely shutdown — maintenance mode active",
        action: "Check with maintenance team before restarting" });

    // DG ON but no output current (and not in remote shutdown)
    if (ain1A !== null && ain1A < 2 && dout1 === 0)
      alarms.push({ id: "abnormal_no_current", severity: "critical",
        message: "Abnormal: DG set is ON but no output current",
        action: "Contact Saarthi Support immediately" });

    // Internal water level shortage — only check when running
    if (isRunning && waterShort === true)
      alarms.push({ id: "internal_water_short", severity: "warning",
        message: "Internal water level shortage",
        action: "Fill the external aux tank" });

    // Over/under current — only when actually running (ain1A > 2)
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

// ─── Main component ───────────────────────────────────────────────────────────

export function GreenXHealthPanel({ deviceType, deviceModel, telemetry }: GreenXHealthPanelProps) {
  const isMobile = useIsMobile();
  const [setCurrent, setSetCurrent] = useState<number | null>(null);
  const [editing, setEditing]       = useState(false);
  const [inputVal, setInputVal]     = useState("");
  const [expanded, setExpanded]     = useState(true);

  // Track when main water tank first went short — for 60-min sustained alert
  const tankShortSinceRef = useRef<number | null>(null);

  const isFMC650 = deviceType === "FMC650";
  const isFMB150 = deviceType === "FMB150";
  const isMini   = deviceModel === "MINI";
  const isEOW    = deviceModel === "EOW";

  // Gate: only show for known models on known device types
  const validFMC650Models = ["380KVA", "625KVA", "1500KVA", "EOW"];
  const validFMB150Models = ["MINI", "EOW"];
  if (isFMC650 && !validFMC650Models.includes(deviceModel)) return null;
  if (isFMB150 && !validFMB150Models.includes(deviceModel)) return null;
  if (!isFMC650 && !isFMB150) return null;

  // ── Derived signals ──
  const din1  = getIO(telemetry, 1);
  const din2  = getIO(telemetry, 2);   // FMC650: true=cell water short
  const din4  = getIO(telemetry, 4);   // FMC650: true=bubbler short
  const ain3  = getIO(telemetry, 11);  // FMC650: main tank (ain.3)
  const dout1 = getIO(telemetry, 179);

  // Current — different formula per device type
  const ain1A = isFMC650 ? calcCurrentFMC650(telemetry) : calcCurrentFMB150(telemetry);

  // FMB150 cell water: ain.2 = IO 6, value in V * 0.001, then check >20
  const ain2raw     = isFMB150 ? getRawIO(telemetry, 6) : null;
  const ain2V       = ain2raw !== null ? ain2raw * 0.001 : null;
  const miniWaterOk = ain2V !== null ? ain2V <= 20 : null;
  const miniWaterLabel = ain2V === null ? "Unknown" : ain2V <= 20 ? "OK — full" : "Low — shortage";

  const isRunning = din1 === 1 && ain1A !== null && ain1A > 2;

  // ── Tank short tracking — start timer when ain3 > 20, reset when it recovers ──
  const ain3ForTracking = getIO(telemetry, 11);
  const hasMainTankDevice = deviceModel === "380KVA" || deviceModel === "625KVA" || deviceModel === "EOW";
  if (isFMC650 && hasMainTankDevice) {
    const tankIsShort = ain3ForTracking !== null && ain3ForTracking > 20;
    if (tankIsShort && tankShortSinceRef.current === null) {
      tankShortSinceRef.current = Date.now(); // start the clock
    } else if (!tankIsShort) {
      tankShortSinceRef.current = null;        // reset when tank recovers
    }
  }

  // ── Alarms ──
  const alarms = isFMC650
    ? computeAlarmsFMC650(telemetry, deviceModel, setCurrent, tankShortSinceRef.current)
    : computeAlarmsFMB150(telemetry);

  const hasAlarms   = alarms.length > 0;
  const hasCritical = alarms.some((a) => a.severity === "critical");

  // ── Header colors ──
  const dotColor       = hasCritical ? C.redDot   : hasAlarms ? C.amberDot   : telemetry.length === 0 ? C.grayDot  : C.greenDot;
  const badgeBg        = hasCritical ? C.redBg    : hasAlarms ? C.amberBg    : C.greenBg;
  const badgeBorder    = hasCritical ? C.redBorder : hasAlarms ? C.amberBorder : C.greenBorder;
  const badgeTextColor = hasCritical ? C.redText  : hasAlarms ? C.amberText  : C.greenText;
  const badgeLabel     = hasCritical
    ? `${alarms.length} alert${alarms.length !== 1 ? "s" : ""}`
    : hasAlarms ? `${alarms.length} warning${alarms.length !== 1 ? "s" : ""}`
    : "Healthy";

  const productName = isEOW ? "GreenDrive Neo" : isMini ? "GreenDrive Mini" : "GreenX";
  const unitLabel   = isEOW ? "Engine" : "DG set";

  const subline = isRunning
    ? `Running · ${ain1A !== null ? ain1A + " A output" : "—"}`
    : din1 === 1 ? `${unitLabel} ON · no output`
    : `${unitLabel} OFF`;

  const modelBadge = isEOW ? "Engine on Wheels" : isMini ? "Mini (FMB150)" : deviceModel;

  // ── FMC650 signal statuses (Din logic: true=1=short for water) ──
  const mainTankOk    = ain3 !== null ? ain3 < 20 : null;
  const mainTankLabel = ain3 === null ? "Unknown" : ain3 < 20 ? "OK — full" : "Low — shortage";
  // Din.2 = 1 = water SHORT → ok when din2 === 0
  const cellWaterOk   = din2 !== null ? din2 === 0 : null;
  const cellLabel     = din2 === null ? "Unknown" : din2 === 0 ? "OK — full" : "Short";
  // Din.4 = 1 = water SHORT → ok when din4 === 0
  const bubblerOk     = din4 !== null ? din4 === 0 : null;
  const bubblerLabel  = din4 === null ? "Unknown" : din4 === 0 ? "OK — full" : "Short";
  const remoteOk      = dout1 !== null ? dout1 === 0 : null;
  const remoteLabel   = dout1 === null ? "Unknown" : dout1 === 0 ? "Working" : "Remotely shutdown";

  // ── Setpoint deviation (FMC650 only — FMB150 uses fixed 9–11A range) ──
  const deviation       = setCurrent !== null && ain1A !== null ? Math.abs(ain1A - setCurrent) : null;
  const withinTolerance = deviation !== null && setCurrent !== null ? deviation <= setCurrent * 0.1 : null;

  // FMB150 healthy range check
  const miniHealthy = isMini && ain1A !== null && ain1A > 2
    ? ain1A >= 9 && ain1A <= 11
    : null;

  const stale = din1 !== 1; // rows below DG/engine status are stale when off

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

            {/* DG / Engine status — always live */}
            <SignalRow
              label={isEOW ? "Engine status" : "DG set (genset)"}
              detail="Din.1 — run status"
              status={din1 === null ? "Unknown" : din1 === 1 ? "ON" : "OFF"}
              ok={din1 === null ? null : din1 === 1}
              isMobile={isMobile}
            />

            {/* System running */}
            <SignalRow
              label="System running"
              detail={`Din.1 = ON & Ain.1 > 2 A`}
              status={isRunning ? "Running" : din1 === 1 ? `${unitLabel} ON — no output` : "Stopped"}
              ok={isRunning ? true : din1 === null ? null : false}
              stale={stale}
              isMobile={isMobile}
            />

            {/* Output current */}
            <SignalRow
              label="Output current"
              detail={isFMC650 ? "Ain.1 → (V / 47) × 1000" : "Ain.1 → V / 83"}
              status={ain1A !== null ? `${ain1A} A` : "—"}
              ok={isMini
                ? (ain1A !== null && ain1A > 2 ? miniHealthy : null)
                : ain1A !== null ? ain1A > 2 : null}
              stale={stale}
              isMobile={isMobile}
            />

            {/* FMB150 Mini: show healthy range indicator */}
            {isMini && ain1A !== null && ain1A > 2 && (
              <SignalRow
                label="Current health range"
                detail="Healthy: 9–11 A"
                status={miniHealthy ? "Within 9–11 A" : `Out of range (${ain1A} A)`}
                ok={miniHealthy}
                stale={stale}
                isMobile={isMobile}
              />
            )}

            {/* Remote shutdown */}
            <SignalRow
              label="Remote shutdown"
              detail="Dout.1 — remote control status"
              status={remoteLabel}
              ok={remoteOk}
              stale={stale}
              isMobile={isMobile}
            />

            {/* FMC650 only: cell body water (Din.2=1=short) */}
            {isFMC650 && (
              <SignalRow
                label="Cell body water"
                detail="Din.2 — electrolyser cell (0=OK, 1=short)"
                status={cellLabel}
                ok={cellWaterOk}
                stale={stale}
                isMobile={isMobile}
              />
            )}

            {/* FMB150 only: internal water level (Ain.2 in V, >20=short) */}
            {isMini && (
              <SignalRow
                label="Internal water level"
                detail="Ain.2 — cell body water (<20 V = full)"
                status={miniWaterLabel}
                ok={miniWaterOk}
                stale={stale}
                isMobile={isMobile}
              />
            )}

            {/* FMC650 380KVA / 625KVA / EOW: main tank + bubbler */}
            {isFMC650 && (deviceModel === "380KVA" || deviceModel === "625KVA" || isEOW) && (
              <>
                <SignalRow
                  label="Main water tank"
                  detail="Ain.3 — main tank level (<20 = full)"
                  status={mainTankLabel}
                  ok={mainTankOk}
                  stale={stale}
                  isMobile={isMobile}
                />
                <SignalRow
                  label="Bubbler water"
                  detail="Din.4 — bubbler level (0=OK, 1=short)"
                  status={bubblerLabel}
                  ok={bubblerOk}
                  stale={stale}
                  isMobile={isMobile}
                />
              </>
            )}
          </div>

          {/* ── Setpoint (FMC650 only — FMB150 uses fixed 9–11A) ── */}
          <div style={{ padding: isMobile ? "12px 14px" : "16px 20px", background: C.pageBg }}>
            {isFMC650 ? (
              <>
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
              </>
            ) : (
              // FMB150: show fixed healthy range info instead of configurable setpoint
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