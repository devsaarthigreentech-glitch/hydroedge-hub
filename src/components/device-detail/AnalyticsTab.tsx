// "use client";

// import React, { useState, useEffect, useRef } from "react";
// import { Device } from "@/types";
// import { THEME } from "@/lib/theme";

// interface AnalyticsTabProps {
//   device: Device;
// }

// interface DailyData {
//   day: string;
//   distance_km: number;
//   fuel_litres: number;
//   fuel_average_kmpl: number | null;
// }

// interface Summary {
//   total_distance_km: number;
//   total_fuel_litres: number;
//   overall_fuel_average_kmpl: number | null;
//   days_with_data: number;
// }

// // CO2 emission factor: 1 litre diesel = 2.68 kg CO2
// const CO2_PER_LITRE = 2.68;

// export function AnalyticsTab({ device }: AnalyticsTabProps) {
//   const [dailyData, setDailyData] = useState<DailyData[]>([]);
//   const [summary, setSummary] = useState<Summary | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [days, setDays] = useState(1);
//   const [error, setError] = useState<string | null>(null);

//   // Baseline fuel average — editable by user, persisted in localStorage
//   const [baselineKmpl, setBaselineKmpl] = useState<number>(10);
//   const [editingBaseline, setEditingBaseline] = useState(false);
//   const [baselineInput, setBaselineInput] = useState("10");
//   const baselineRef = useRef<HTMLInputElement>(null);

//   // Load saved baseline on mount
//   useEffect(() => {
//     const saved = localStorage.getItem(`baseline_kmpl_${device.id}`);
//     if (saved) {
//       const val = parseFloat(saved);
//       if (!isNaN(val) && val > 0) {
//         setBaselineKmpl(val);
//         setBaselineInput(val.toString());
//       }
//     }
//   }, [device.id]);

//   useEffect(() => {
//     fetchAnalytics();
//   }, [device.id, days]);

//   useEffect(() => {
//     if (editingBaseline && baselineRef.current) {
//       baselineRef.current.focus();
//       baselineRef.current.select();
//     }
//   }, [editingBaseline]);

//   const fetchAnalytics = async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const res = await fetch(`/api/analytics?device_id=${device.id}&days=${days}`);
//       const data = await res.json();
//       if (data.success) {
//         setDailyData(data.data);
//         setSummary(data.summary);
//       } else {
//         setError(data.error || "Failed to load analytics");
//       }
//     } catch {
//       setError("Network error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleBaselineSave = () => {
//     const val = parseFloat(baselineInput);
//     if (!isNaN(val) && val > 0) {
//       setBaselineKmpl(val);
//       localStorage.setItem(`baseline_kmpl_${device.id}`, val.toString());
//     }
//     setEditingBaseline(false);
//   };

//   const formatDay = (dayStr: string) => {
//     const date = new Date(dayStr);
//     return date.toLocaleDateString("en-IN", {
//       weekday: "short", day: "numeric", month: "short",
//     });
//   };

//   // ── Derived metrics ────────────────────────────────────────────────────────

//   // Days that have both distance and fuel
//   const validDays = dailyData.filter(
//     (d) => d.fuel_average_kmpl !== null && d.fuel_litres > 0
//   );

//   // Baseline fuel consumption per day (what would have been used at baseline efficiency)
//   const baselineFuelTotal = validDays.reduce((sum, d) => {
//     const baselineFuel = d.distance_km / baselineKmpl;
//     return sum + baselineFuel;
//   }, 0);

//   const actualFuelTotal = validDays.reduce((sum, d) => sum + d.fuel_litres, 0);
//   const fuelSaved = parseFloat((baselineFuelTotal - actualFuelTotal).toFixed(2));
//   const co2Saved = parseFloat((Math.abs(fuelSaved) * CO2_PER_LITRE).toFixed(2));
//   const isImprovedOverBaseline = fuelSaved > 0;

//   // Max value for chart scaling
//   const maxKmpl = Math.max(
//     ...dailyData.map((d) => d.fuel_average_kmpl ?? 0),
//     baselineKmpl,
//     1
//   );

//   // ── SVG Line Chart ─────────────────────────────────────────────────────────

//   const renderComparisonChart = () => {
//     const chartData = [...dailyData].reverse(); // chronological order
//     if (chartData.length === 0) return null;

//     const W = 700;
//     const H = 200;
//     const PAD = { top: 20, right: 20, bottom: 36, left: 50 };
//     const gW = W - PAD.left - PAD.right;
//     const gH = H - PAD.top - PAD.bottom;
//     const n = chartData.length;

//     const xPos = (i: number) =>
//       PAD.left + (n === 1 ? gW / 2 : (i / (n - 1)) * gW);
//     const yPos = (v: number) =>
//       PAD.top + gH - ((v / (maxKmpl * 1.15)) * gH);

//     // Actual efficiency points (only valid ones)
//     const actualPoints = chartData
//       .map((d, i) =>
//         d.fuel_average_kmpl !== null
//           ? { x: xPos(i), y: yPos(d.fuel_average_kmpl), v: d.fuel_average_kmpl }
//           : null
//       )
//       .filter(Boolean) as { x: number; y: number; v: number }[];

//     const actualPath =
//       actualPoints.length > 1
//         ? `M ${actualPoints.map((p) => `${p.x},${p.y}`).join(" L ")}`
//         : "";

//     // Baseline — straight horizontal line
//     const baseY = yPos(baselineKmpl);

//     // Y-axis grid values
//     const gridVals = [0, 0.25, 0.5, 0.75, 1].map(
//       (f) => parseFloat((maxKmpl * 1.15 * f).toFixed(1))
//     );

//     return (
//       <div style={{ width: "100%", overflowX: "auto" }}>
//         <svg width={W} height={H} style={{ display: "block", overflow: "visible" }}>
//           <defs>
//             <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
//               <stop offset="0%" stopColor={THEME.primary[500]} stopOpacity={0.3} />
//               <stop offset="100%" stopColor={THEME.primary[500]} stopOpacity={0} />
//             </linearGradient>
//             <linearGradient id="baselineGrad" x1="0" y1="0" x2="0" y2="1">
//               <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.15} />
//               <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
//             </linearGradient>
//           </defs>

//           {/* Grid lines */}
//           {gridVals.map((v) => {
//             const y = yPos(v);
//             return (
//               <g key={v}>
//                 <line
//                   x1={PAD.left} y1={y} x2={PAD.left + gW} y2={y}
//                   stroke={THEME.border.light} strokeWidth={1} strokeDasharray="4,4"
//                 />
//                 <text x={PAD.left - 8} y={y + 4} fill={THEME.text.tertiary}
//                   fontSize={10} textAnchor="end">
//                   {v}
//                 </text>
//               </g>
//             );
//           })}

//           {/* Baseline filled area */}
//           <path
//             d={`M ${PAD.left},${baseY} L ${PAD.left + gW},${baseY} L ${PAD.left + gW},${PAD.top + gH} L ${PAD.left},${PAD.top + gH} Z`}
//             fill="url(#baselineGrad)"
//           />

//           {/* Baseline line */}
//           <line
//             x1={PAD.left} y1={baseY} x2={PAD.left + gW} y2={baseY}
//             stroke="#f59e0b" strokeWidth={2} strokeDasharray="8,4"
//           />
//           <text x={PAD.left + gW + 6} y={baseY + 4}
//             fill="#f59e0b" fontSize={10} fontWeight="700">
//             Base {baselineKmpl}
//           </text>

//           {/* Actual area fill */}
//           {actualPoints.length > 1 && (
//             <path
//               d={`${actualPath} L ${actualPoints[actualPoints.length - 1].x},${PAD.top + gH} L ${actualPoints[0].x},${PAD.top + gH} Z`}
//               fill="url(#actualGrad)"
//             />
//           )}

//           {/* Actual line */}
//           {actualPath && (
//             <path
//               d={actualPath} fill="none"
//               stroke={THEME.primary[500]} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
//             />
//           )}

//           {/* Actual data points */}
//           {actualPoints.map((p, i) => (
//             <g key={i}>
//               <circle cx={p.x} cy={p.y} r={5} fill="white"
//                 stroke={THEME.primary[500]} strokeWidth={2.5} />
//               <title>{p.v.toFixed(2)} km/L</title>
//             </g>
//           ))}

//           {/* X-axis labels */}
//           {chartData.map((d, i) => (
//             <text
//               key={i}
//               x={xPos(i)} y={H - 6}
//               fill={THEME.text.tertiary} fontSize={10} textAnchor="middle"
//             >
//               {new Date(d.day).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
//             </text>
//           ))}

//           {/* Y-axis label */}
//           <text
//             x={14} y={PAD.top + gH / 2}
//             fill={THEME.text.secondary} fontSize={11} textAnchor="middle"
//             transform={`rotate(-90, 14, ${PAD.top + gH / 2})`}
//           >
//             km/L
//           </text>
//         </svg>

//         {/* Chart legend */}
//         <div style={{ display: "flex", gap: 20, marginTop: 12, paddingLeft: PAD.left }}>
//           <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
//             <div style={{ width: 20, height: 3, background: THEME.primary[500], borderRadius: 2 }} />
//             <span style={{ fontSize: 12, color: THEME.text.secondary }}>Actual efficiency</span>
//           </div>
//           <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
//             <div style={{
//               width: 20, height: 3, background: "#f59e0b", borderRadius: 2,
//               backgroundImage: "repeating-linear-gradient(90deg, #f59e0b 0, #f59e0b 6px, transparent 6px, transparent 10px)",
//             }} />
//             <span style={{ fontSize: 12, color: THEME.text.secondary }}>Baseline ({baselineKmpl} km/L)</span>
//           </div>
//         </div>
//       </div>
//     );
//   };

//   // ── Render ─────────────────────────────────────────────────────────────────

//   return (
//     <div style={{ padding: 24, background: THEME.background.secondary, minHeight: "100%", overflowY: "auto" }}>

//       {/* ── Header row ── */}
//       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
//         <div>
//           <div style={{ fontSize: 20, fontWeight: 800, color: THEME.text.primary, letterSpacing: -0.5 }}>
//             📊 Fleet Analytics
//           </div>
//           <div style={{ fontSize: 13, color: THEME.text.secondary, marginTop: 4 }}>
//             {device.device_name} · Daily distance, fuel & efficiency
//           </div>
//         </div>

//         {/* Day range pills */}
//         <div style={{ display: "flex", gap: 6, background: THEME.neutral[100], padding: 4, borderRadius: 10 }}>
//           {[1, 7, 14].map((d) => (
//             <button key={d} onClick={() => setDays(d)} style={{
//               padding: "7px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700,
//               cursor: "pointer", fontFamily: "inherit", border: "none", transition: "all 0.2s",
//               background: days === d ? THEME.primary[500] : "transparent",
//               color: days === d ? "white" : THEME.text.secondary,
//               boxShadow: days === d ? THEME.shadow.sm : "none",
//             }}>
//               {d}D
//             </button>
//           ))}
//         </div>
//       </div>

//       {loading ? (
//         <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
//           <div style={{
//             width: 40, height: 40, borderRadius: "50%",
//             border: `3px solid ${THEME.border.light}`,
//             borderTop: `3px solid ${THEME.primary[500]}`,
//             animation: "spin 1s linear infinite",
//           }} />
//         </div>
//       ) : error ? (
//         <div style={{
//           padding: 20, background: "#fef2f2", border: "2px solid #fca5a5",
//           borderRadius: 12, color: "#dc2626", fontSize: 14,
//         }}>⚠️ {error}</div>
//       ) : (
//         <>
//           {/* ── Summary cards ── */}
//           {summary && (
//             <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
//               {[
//                 {
//                   icon: "🛣️", label: "Total Distance",
//                   value: `${summary.total_distance_km.toLocaleString("en-IN")} km`,
//                   color: THEME.primary[500], bg: THEME.primary[50],
//                   sub: `${summary.days_with_data} days`,
//                 },
//                 {
//                   icon: "⛽", label: "Fuel Consumed",
//                   value: `${summary.total_fuel_litres.toLocaleString("en-IN")} L`,
//                   color: "#f59e0b", bg: "#fffbeb",
//                   sub: `${days}D window`,
//                 },
//                 {
//                   icon: "📈", label: "Avg Efficiency",
//                   value: summary.overall_fuel_average_kmpl
//                     ? `${summary.overall_fuel_average_kmpl} km/L`
//                     : "N/A",
//                   color: "#3b82f6", bg: "#eff6ff",
//                   sub: `Baseline: ${baselineKmpl} km/L`,
//                 },
//                 {
//                   icon: isImprovedOverBaseline ? "🌱" : "⚡",
//                   label: "CO₂ Impact",
//                   value: validDays.length > 0
//                     ? `${isImprovedOverBaseline ? "-" : "+"}${co2Saved} kg`
//                     : "N/A",
//                   color: isImprovedOverBaseline ? "#16a34a" : "#dc2626",
//                   bg: isImprovedOverBaseline ? "#dcfce7" : "#fef2f2",
//                   sub: isImprovedOverBaseline
//                     ? `${Math.abs(fuelSaved)}L saved vs baseline`
//                     : `${Math.abs(fuelSaved)}L extra vs baseline`,
//                 },
//               ].map((card) => (
//                 <div key={card.label} style={{
//                   background: card.bg, border: `2px solid ${card.color}25`,
//                   borderRadius: 14, padding: "18px 20px",
//                   boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
//                 }}>
//                   <div style={{ fontSize: 24, marginBottom: 8 }}>{card.icon}</div>
//                   <div style={{ fontSize: 20, fontWeight: 800, color: card.color, letterSpacing: -0.5 }}>
//                     {card.value}
//                   </div>
//                   <div style={{ fontSize: 11, color: THEME.text.tertiary, fontWeight: 700,
//                     textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 }}>
//                     {card.label}
//                   </div>
//                   <div style={{ fontSize: 11, color: THEME.text.tertiary, marginTop: 2 }}>
//                     {card.sub}
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}

//           {/* ── Baseline vs Actual Chart ── */}
//           <div style={{
//             background: "white", borderRadius: 14,
//             border: `2px solid ${THEME.border.light}`,
//             padding: 24, marginBottom: 20,
//             boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
//           }}>
//             {/* Chart header with editable baseline */}
//             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
//               <div>
//                 <div style={{ fontSize: 15, fontWeight: 700, color: THEME.text.primary }}>
//                   Fuel Efficiency: Actual vs Baseline
//                 </div>
//                 <div style={{ fontSize: 12, color: THEME.text.tertiary, marginTop: 2 }}>
//                   km per litre — higher is better
//                 </div>
//               </div>

//               {/* Editable baseline */}
//               <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//                 <span style={{ fontSize: 12, color: THEME.text.secondary, fontWeight: 600 }}>
//                   Baseline:
//                 </span>
//                 {editingBaseline ? (
//                   <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
//                     <input
//                       ref={baselineRef}
//                       type="number"
//                       value={baselineInput}
//                       onChange={(e) => setBaselineInput(e.target.value)}
//                       onKeyDown={(e) => {
//                         if (e.key === "Enter") handleBaselineSave();
//                         if (e.key === "Escape") setEditingBaseline(false);
//                       }}
//                       style={{
//                         width: 70, padding: "6px 10px", borderRadius: 8, fontSize: 13,
//                         fontWeight: 700, border: `2px solid ${THEME.primary[500]}`,
//                         outline: "none", textAlign: "center", fontFamily: "inherit",
//                         color: THEME.text.primary,
//                       }}
//                     />
//                     <span style={{ fontSize: 12, color: THEME.text.tertiary }}>km/L</span>
//                     <button onClick={handleBaselineSave} style={{
//                       padding: "6px 14px", background: THEME.primary[500], color: "white",
//                       border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700,
//                       cursor: "pointer", fontFamily: "inherit",
//                     }}>Set</button>
//                     <button onClick={() => setEditingBaseline(false)} style={{
//                       padding: "6px 10px", background: THEME.neutral[100], color: THEME.text.secondary,
//                       border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
//                     }}>✕</button>
//                   </div>
//                 ) : (
//                   <button onClick={() => setEditingBaseline(true)} style={{
//                     display: "flex", alignItems: "center", gap: 6,
//                     padding: "6px 14px", background: "#fffbeb",
//                     border: "2px solid #f59e0b", borderRadius: 8,
//                     fontSize: 13, fontWeight: 700, color: "#92400e",
//                     cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
//                   }}>
//                     ✏️ {baselineKmpl} km/L
//                   </button>
//                 )}
//               </div>
//             </div>

//             {dailyData.length === 0 ? (
//               <div style={{ padding: 40, textAlign: "center", color: THEME.text.tertiary, fontSize: 14 }}>
//                 No data available for this period
//               </div>
//             ) : (
//               renderComparisonChart()
//             )}
//           </div>

//           {/* ── CO2 Savings card (only shown if we have valid days) ── */}
//           {validDays.length > 0 && (
//             <div style={{
//               background: isImprovedOverBaseline
//                 ? "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)"
//                 : "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
//               borderRadius: 14,
//               border: `2px solid ${isImprovedOverBaseline ? "#86efac" : "#fca5a5"}`,
//               padding: "20px 24px", marginBottom: 20,
//               display: "flex", alignItems: "center", gap: 20,
//               boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
//             }}>
//               <div style={{ fontSize: 44 }}>
//                 {isImprovedOverBaseline ? "🌱" : "⚠️"}
//               </div>
//               <div style={{ flex: 1 }}>
//                 <div style={{
//                   fontSize: 16, fontWeight: 800,
//                   color: isImprovedOverBaseline ? "#15803d" : "#b91c1c",
//                   marginBottom: 4,
//                 }}>
//                   {isImprovedOverBaseline
//                     ? `${co2Saved} kg CO₂ saved vs baseline`
//                     : `${co2Saved} kg extra CO₂ vs baseline`}
//                 </div>
//                 <div style={{ fontSize: 13, color: isImprovedOverBaseline ? "#166534" : "#991b1b" }}>
//                   {isImprovedOverBaseline
//                     ? `Vehicle used ${Math.abs(fuelSaved)}L less fuel than baseline (${baselineKmpl} km/L) — equivalent to ${(co2Saved / 0.12).toFixed(0)} km not driven`
//                     : `Vehicle used ${Math.abs(fuelSaved)}L more fuel than baseline (${baselineKmpl} km/L)`}
//                 </div>
//                 <div style={{ fontSize: 11, color: THEME.text.tertiary, marginTop: 4 }}>
//                   Based on {validDays.length} days with data · CO₂ factor: {CO2_PER_LITRE} kg/L diesel
//                 </div>
//               </div>
//               <div style={{ textAlign: "right" }}>
//                 <div style={{ fontSize: 11, color: THEME.text.tertiary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
//                   Fuel {isImprovedOverBaseline ? "saved" : "excess"}
//                 </div>
//                 <div style={{
//                   fontSize: 24, fontWeight: 800,
//                   color: isImprovedOverBaseline ? "#16a34a" : "#dc2626",
//                 }}>
//                   {isImprovedOverBaseline ? "-" : "+"}{Math.abs(fuelSaved)} L
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* ── Daily table ── */}
//           {dailyData.length > 0 && (
//             <div style={{
//               background: "white", borderRadius: 14,
//               border: `2px solid ${THEME.border.light}`,
//               overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
//             }}>
//               {/* Table header */}
//               <div style={{
//                 display: "grid",
//                 gridTemplateColumns: "130px 1fr 1fr 1fr 110px",
//                 gap: 12, padding: "12px 20px",
//                 background: THEME.neutral[50],
//                 borderBottom: `2px solid ${THEME.border.light}`,
//                 fontSize: 11, fontWeight: 700, color: THEME.text.tertiary,
//                 textTransform: "uppercase", letterSpacing: 0.5,
//               }}>
//                 <div>Date</div>
//                 <div>Distance</div>
//                 <div>Fuel Used</div>
//                 <div>Efficiency</div>
//                 <div style={{ textAlign: "right" }}>vs Baseline</div>
//               </div>

//               {dailyData.map((row, i) => {
//                 const diff = row.fuel_average_kmpl !== null
//                   ? parseFloat((row.fuel_average_kmpl - baselineKmpl).toFixed(2))
//                   : null;
//                 const maxDist = Math.max(...dailyData.map((d) => d.distance_km), 1);
//                 const maxFuel = Math.max(...dailyData.map((d) => d.fuel_litres), 1);

//                 return (
//                   <div key={row.day} style={{
//                     display: "grid",
//                     gridTemplateColumns: "130px 1fr 1fr 1fr 110px",
//                     gap: 12, padding: "14px 20px", alignItems: "center",
//                     borderBottom: i < dailyData.length - 1 ? `1px solid ${THEME.border.light}` : "none",
//                     background: i % 2 === 0 ? "white" : THEME.neutral[50],
//                   }}>
//                     {/* Date */}
//                     <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text.primary }}>
//                       {formatDay(row.day)}
//                     </div>

//                     {/* Distance bar */}
//                     <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//                       <div style={{ flex: 1, height: 6, background: THEME.neutral[100], borderRadius: 3, overflow: "hidden" }}>
//                         <div style={{
//                           width: `${(row.distance_km / maxDist) * 100}%`,
//                           height: "100%", background: THEME.primary[400], borderRadius: 3,
//                         }} />
//                       </div>
//                       <span style={{ fontSize: 12, fontWeight: 700, color: THEME.primary[600], minWidth: 64, textAlign: "right" }}>
//                         {row.distance_km} km
//                       </span>
//                     </div>

//                     {/* Fuel bar */}
//                     <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//                       <div style={{ flex: 1, height: 6, background: THEME.neutral[100], borderRadius: 3, overflow: "hidden" }}>
//                         <div style={{
//                           width: `${(row.fuel_litres / maxFuel) * 100}%`,
//                           height: "100%", background: "#f59e0b", borderRadius: 3,
//                         }} />
//                       </div>
//                       <span style={{ fontSize: 12, fontWeight: 700, color: "#d97706", minWidth: 48, textAlign: "right" }}>
//                         {row.fuel_litres > 0 ? `${row.fuel_litres} L` : "—"}
//                       </span>
//                     </div>

//                     {/* Efficiency bar */}
//                     <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//                       {row.fuel_average_kmpl !== null ? (
//                         <>
//                           <div style={{ flex: 1, height: 6, background: THEME.neutral[100], borderRadius: 3, overflow: "hidden" }}>
//                             <div style={{
//                               width: `${(row.fuel_average_kmpl / (maxKmpl * 1.1)) * 100}%`,
//                               height: "100%", background: "#3b82f6", borderRadius: 3,
//                             }} />
//                           </div>
//                           <span style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", minWidth: 64, textAlign: "right" }}>
//                             {row.fuel_average_kmpl} km/L
//                           </span>
//                         </>
//                       ) : (
//                         <span style={{ fontSize: 12, color: THEME.text.tertiary }}>No fuel data</span>
//                       )}
//                     </div>

//                     {/* vs Baseline badge */}
//                     <div style={{ textAlign: "right" }}>
//                       {diff !== null ? (
//                         <span style={{
//                           padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
//                           background: diff >= 0 ? "#dcfce7" : "#fee2e2",
//                           color: diff >= 0 ? "#16a34a" : "#dc2626",
//                         }}>
//                           {diff >= 0 ? "+" : ""}{diff} km/L
//                         </span>
//                       ) : "—"}
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           )}

//           {dailyData.length === 0 && !loading && (
//             <div style={{
//               padding: 40, textAlign: "center", background: "white",
//               borderRadius: 12, border: `2px solid ${THEME.border.light}`,
//               color: THEME.text.tertiary, fontSize: 14,
//             }}>
//               No data available for this period. IO 16 (mileage) or IO 107 (fuel) records may not be present yet.
//             </div>
//           )}
//         </>
//       )}
//     </div>
//   );
// }

"use client";

import React, { useState, useEffect, useRef } from "react";
import { Device } from "@/types";
import { THEME } from "@/lib/theme";

interface AnalyticsTabProps { device: Device; }

interface DailyData {
  day: string;
  distance_km: number;
  fuel_litres: number;
  fuel_average_kmpl: number | null;
}
interface Summary {
  total_distance_km: number;
  total_fuel_litres: number;
  overall_fuel_average_kmpl: number | null;
  days_with_data: number;
}
interface Trip {
  trip_number: number;
  start_time: string;
  end_time: string;
  duration_min: number;
  distance_km: number;
  avg_speed_kmh: number;
  max_speed_kmh: number;
  gps_points: number;
}
interface TripSummary {
  total_trips: number;
  total_distance_km: number;
  total_duration_min: number;
  avg_trip_distance_km: number;
  avg_trip_duration_min: number;
  longest_trip_km: number;
}
interface IdleSummary {
  total_idle_events: number;
  total_idle_minutes: number;
  total_idle_hours: number;
  estimated_fuel_wasted_litres: number;
  estimated_co2_wasted_kg: number;
  avg_idle_duration_min: number;
}
interface DailyIdle {
  day: string;
  idle_minutes: number;
  idle_events: number;
  idle_hours: number;
}

const CO2_PER_LITRE = 2.68;

// ── Small helpers ─────────────────────────────────────────────────────────────
function SectionHeader({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: THEME.text.primary, letterSpacing: -0.3 }}>
            {title}
          </div>
          <div style={{ fontSize: 12, color: THEME.text.tertiary, marginTop: 1 }}>{sub}</div>
        </div>
      </div>
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div style={{ flex: 1, height: 6, background: THEME.neutral[100], borderRadius: 3, overflow: "hidden" }}>
      <div style={{
        width: `${max > 0 ? Math.min((value / max) * 100, 100) : 0}%`,
        height: "100%", background: color, borderRadius: 3, transition: "width 0.4s ease",
      }} />
    </div>
  );
}

function StatCard({
  icon, label, value, sub, color, bg,
}: {
  icon: string; label: string; value: string; sub: string; color: string; bg: string;
}) {
  return (
    <div style={{
      background: bg, border: `2px solid ${color}25`,
      borderRadius: 14, padding: "16px 18px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    }}>
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color, letterSpacing: -0.5, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: THEME.text.tertiary, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 11, color: THEME.text.tertiary, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "white", borderRadius: 14,
      border: `2px solid ${THEME.border.light}`,
      padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function formatDay(dayStr: string) {
  return new Date(dayStr).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short",
  });
}

// ── Main component ────────────────────────────────────────────────────────────
export function AnalyticsTab({ device }: AnalyticsTabProps) {
  const [days, setDays] = useState(1);

  // Fuel analytics
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [fuelLoading, setFuelLoading] = useState(true);

  // Trips
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripSummary, setTripSummary] = useState<TripSummary | null>(null);
  const [tripsLoading, setTripsLoading] = useState(true);

  // Idle
  const [idleSummary, setIdleSummary] = useState<IdleSummary | null>(null);
  const [dailyIdle, setDailyIdle] = useState<DailyIdle[]>([]);
  const [idleLoading, setIdleLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  // Baseline
  const [baselineKmpl, setBaselineKmpl] = useState(10);
  const [editingBaseline, setEditingBaseline] = useState(false);
  const [baselineInput, setBaselineInput] = useState("10");
  const baselineRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`baseline_kmpl_${device.id}`);
    if (saved) {
      const v = parseFloat(saved);
      if (!isNaN(v) && v > 0) { setBaselineKmpl(v); setBaselineInput(v.toString()); }
    }
  }, [device.id]);

  useEffect(() => { if (editingBaseline) baselineRef.current?.focus(); }, [editingBaseline]);

  useEffect(() => {
    setError(null);
    fetchFuel();
    fetchTrips();
    fetchIdle();
  }, [device.id, days]);

  const fetchFuel = async () => {
    setFuelLoading(true);
    try {
      const res = await fetch(`/api/analytics?device_id=${device.id}&days=${days}`);
      const data = await res.json();
      if (data.success) { setDailyData(data.data); setSummary(data.summary); }
      else setError(data.error);
    } catch { setError("Failed to fetch fuel data"); }
    finally { setFuelLoading(false); }
  };

  const fetchTrips = async () => {
    setTripsLoading(true);
    try {
      const res = await fetch(`/api/trips?device_id=${device.id}&days=${days}`);
      const data = await res.json();
      if (data.success) { setTrips(data.trips); setTripSummary(data.summary); }
    } catch { /* non-fatal */ }
    finally { setTripsLoading(false); }
  };

  const fetchIdle = async () => {
    setIdleLoading(true);
    try {
      const res = await fetch(`/api/idle?device_id=${device.id}&days=${days}`);
      const data = await res.json();
      if (data.success) { setIdleSummary(data.summary); setDailyIdle(data.daily); }
    } catch { /* non-fatal */ }
    finally { setIdleLoading(false); }
  };

  const handleBaselineSave = () => {
    const v = parseFloat(baselineInput);
    if (!isNaN(v) && v > 0) {
      setBaselineKmpl(v);
      localStorage.setItem(`baseline_kmpl_${device.id}`, v.toString());
    }
    setEditingBaseline(false);
  };

  // ── Derived ──────────────────────────────────────────────────────────────────
  const validDays = dailyData.filter((d) => d.fuel_average_kmpl !== null && d.fuel_litres > 0);
  const baselineFuelTotal = validDays.reduce((s, d) => s + d.distance_km / baselineKmpl, 0);
  const actualFuelTotal = validDays.reduce((s, d) => s + d.fuel_litres, 0);
  const fuelSaved = parseFloat((baselineFuelTotal - actualFuelTotal).toFixed(2));
  const co2Saved = parseFloat((Math.abs(fuelSaved) * CO2_PER_LITRE).toFixed(2));
  const improved = fuelSaved > 0;

  const maxKmpl = Math.max(...dailyData.map((d) => d.fuel_average_kmpl ?? 0), baselineKmpl, 1);
  const maxIdleMin = Math.max(...dailyIdle.map((d) => d.idle_minutes), 1);

  // ── Comparison SVG chart ─────────────────────────────────────────────────────
  const renderComparisonChart = () => {
    const chartData = [...dailyData].reverse();
    if (chartData.length === 0) return (
      <div style={{ padding: 40, textAlign: "center", color: THEME.text.tertiary, fontSize: 13 }}>
        No efficiency data for this period
      </div>
    );

    const W = 640; const H = 190;
    const PAD = { top: 16, right: 60, bottom: 32, left: 48 };
    const gW = W - PAD.left - PAD.right;
    const gH = H - PAD.top - PAD.bottom;
    const n = chartData.length;
    const yMax = maxKmpl * 1.2;

    const xPos = (i: number) => PAD.left + (n === 1 ? gW / 2 : (i / (n - 1)) * gW);
    const yPos = (v: number) => PAD.top + gH - (v / yMax) * gH;

    const actualPoints = chartData
      .map((d, i) => d.fuel_average_kmpl !== null
        ? { x: xPos(i), y: yPos(d.fuel_average_kmpl), v: d.fuel_average_kmpl } : null)
      .filter(Boolean) as { x: number; y: number; v: number }[];

    const path = actualPoints.length > 1
      ? `M ${actualPoints.map((p) => `${p.x},${p.y}`).join(" L ")}` : "";
    const baseY = yPos(baselineKmpl);

    return (
      <div style={{ width: "100%", overflowX: "auto" }}>
        <svg width={W} height={H} style={{ display: "block", overflow: "visible" }}>
          <defs>
            <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={THEME.primary[500]} stopOpacity={0.25} />
              <stop offset="100%" stopColor={THEME.primary[500]} stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const v = parseFloat((yMax * f).toFixed(1));
            const y = yPos(v);
            return (
              <g key={f}>
                <line x1={PAD.left} y1={y} x2={PAD.left + gW} y2={y}
                  stroke={THEME.border.light} strokeWidth={1} strokeDasharray="4,4" />
                <text x={PAD.left - 6} y={y + 4} fill={THEME.text.tertiary} fontSize={10} textAnchor="end">{v}</text>
              </g>
            );
          })}

          {/* Baseline dashed line */}
          <line x1={PAD.left} y1={baseY} x2={PAD.left + gW} y2={baseY}
            stroke="#f59e0b" strokeWidth={2} strokeDasharray="8,4" />
          <text x={PAD.left + gW + 6} y={baseY + 4}
            fill="#f59e0b" fontSize={10} fontWeight="700">
            {baselineKmpl}
          </text>

          {/* Actual area + line */}
          {path && (
            <>
              <path
                d={`${path} L ${actualPoints[actualPoints.length-1].x},${PAD.top+gH} L ${actualPoints[0].x},${PAD.top+gH} Z`}
                fill="url(#ag)" />
              <path d={path} fill="none" stroke={THEME.primary[500]}
                strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}

          {/* Dots */}
          {actualPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={5}
              fill="white" stroke={THEME.primary[500]} strokeWidth={2.5}>
              <title>{p.v.toFixed(2)} km/L</title>
            </circle>
          ))}

          {/* X labels */}
          {chartData.map((d, i) => (
            <text key={i} x={xPos(i)} y={H - 4} fill={THEME.text.tertiary} fontSize={10} textAnchor="middle">
              {new Date(d.day).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </text>
          ))}

          {/* Y axis label */}
          <text x={13} y={PAD.top + gH / 2} fill={THEME.text.secondary} fontSize={11}
            textAnchor="middle" transform={`rotate(-90, 13, ${PAD.top + gH / 2})`}>
            km/L
          </text>
        </svg>

        <div style={{ display: "flex", gap: 18, marginTop: 10, paddingLeft: PAD.left }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 18, height: 3, background: THEME.primary[500], borderRadius: 2 }} />
            <span style={{ fontSize: 11, color: THEME.text.secondary }}>Actual efficiency</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 18, height: 2, borderTop: "2px dashed #f59e0b" }} />
            <span style={{ fontSize: 11, color: THEME.text.secondary }}>Baseline ({baselineKmpl} km/L)</span>
          </div>
        </div>
      </div>
    );
  };

  // ── Loading spinner ──────────────────────────────────────────────────────────
  const Spinner = () => (
    <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        border: `3px solid ${THEME.border.light}`,
        borderTop: `3px solid ${THEME.primary[500]}`,
        animation: "spin 1s linear infinite",
      }} />
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24, background: THEME.background.secondary, minHeight: "100%", overflowY: "auto" }}>

      {/* ── Top header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: THEME.text.primary, letterSpacing: -0.5 }}>
            📊 Fleet Analytics
          </div>
          <div style={{ fontSize: 13, color: THEME.text.secondary, marginTop: 3 }}>
            {device.device_name} · Fuel · Trips · Idle time
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, background: THEME.neutral[100], padding: 4, borderRadius: 10 }}>
          {[1, 7, 14].map((d) => (
            <button key={d} onClick={() => setDays(d)} style={{
              padding: "7px 18px", borderRadius: 7, fontSize: 12, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit", border: "none", transition: "all 0.15s",
              background: days === d ? THEME.primary[500] : "transparent",
              color: days === d ? "white" : THEME.text.secondary,
              boxShadow: days === d ? THEME.shadow.sm : "none",
            }}>
              {d}D
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ padding: 16, background: "#fef2f2", border: "2px solid #fca5a5",
          borderRadius: 12, color: "#dc2626", fontSize: 13, marginBottom: 20 }}>
          ⚠️ {error}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          SECTION 1 — FUEL EFFICIENCY
      ════════════════════════════════════════════════════ */}
      <SectionHeader icon="⛽" title="Fuel Efficiency" sub="Daily consumption vs baseline target" />

      {/* Summary row */}
      {!fuelLoading && summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          <StatCard icon="🛣️" label="Total Distance"
            value={`${summary.total_distance_km.toLocaleString("en-IN")} km`}
            sub={`${summary.days_with_data} days with data`}
            color={THEME.primary[500]} bg={THEME.primary[50]} />
          <StatCard icon="⛽" label="Fuel Consumed"
            value={`${summary.total_fuel_litres.toLocaleString("en-IN")} L`}
            sub={`${days}D window`}
            color="#f59e0b" bg="#fffbeb" />
          <StatCard icon="📈" label="Avg Efficiency"
            value={summary.overall_fuel_average_kmpl ? `${summary.overall_fuel_average_kmpl} km/L` : "N/A"}
            sub={`Baseline: ${baselineKmpl} km/L`}
            color="#3b82f6" bg="#eff6ff" />
          <StatCard
            icon={improved ? "🌱" : "⚡"}
            label="CO₂ Impact"
            value={validDays.length > 0 ? `${improved ? "-" : "+"}${co2Saved} kg` : "N/A"}
            sub={improved ? `${Math.abs(fuelSaved)}L saved` : `${Math.abs(fuelSaved)}L extra`}
            color={improved ? "#16a34a" : "#dc2626"}
            bg={improved ? "#dcfce7" : "#fef2f2"} />
        </div>
      )}
      {fuelLoading && <Spinner />}

      {/* Chart card */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: THEME.text.primary }}>
              Actual vs Baseline Efficiency
            </div>
            <div style={{ fontSize: 11, color: THEME.text.tertiary, marginTop: 2 }}>km/L — higher is better</div>
          </div>
          {/* Editable baseline */}
          {editingBaseline ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input ref={baselineRef} type="number" value={baselineInput}
                onChange={(e) => setBaselineInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleBaselineSave(); if (e.key === "Escape") setEditingBaseline(false); }}
                style={{ width: 65, padding: "6px 10px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                  border: `2px solid ${THEME.primary[500]}`, outline: "none", textAlign: "center", fontFamily: "inherit" }} />
              <span style={{ fontSize: 11, color: THEME.text.tertiary }}>km/L</span>
              <button onClick={handleBaselineSave} style={{
                padding: "6px 12px", background: THEME.primary[500], color: "white",
                border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Set
              </button>
              <button onClick={() => setEditingBaseline(false)} style={{
                padding: "6px 10px", background: THEME.neutral[100], color: THEME.text.secondary,
                border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                ✕
              </button>
            </div>
          ) : (
            <button onClick={() => setEditingBaseline(true)} style={{
              padding: "6px 14px", background: "#fffbeb", border: "2px solid #f59e0b",
              borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#92400e",
              cursor: "pointer", fontFamily: "inherit" }}>
              ✏️ {baselineKmpl} km/L baseline
            </button>
          )}
        </div>
        {fuelLoading ? <Spinner /> : renderComparisonChart()}
      </Card>

      {/* CO2 banner */}
      {!fuelLoading && validDays.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 16,
          background: improved ? "linear-gradient(135deg,#f0fdf4,#dcfce7)" : "linear-gradient(135deg,#fef2f2,#fee2e2)",
          border: `2px solid ${improved ? "#86efac" : "#fca5a5"}`,
          borderRadius: 14, padding: "18px 22px", marginBottom: 28,
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        }}>
          <span style={{ fontSize: 40 }}>{improved ? "🌱" : "⚠️"}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: improved ? "#15803d" : "#b91c1c" }}>
              {improved
                ? `${co2Saved} kg CO₂ saved vs baseline`
                : `${co2Saved} kg extra CO₂ vs baseline`}
            </div>
            <div style={{ fontSize: 12, color: improved ? "#166534" : "#991b1b", marginTop: 3 }}>
              {improved
                ? `${Math.abs(fuelSaved)}L less fuel than baseline · ~${(co2Saved / 0.12).toFixed(0)} km worth of savings`
                : `${Math.abs(fuelSaved)}L more fuel than baseline`}
            </div>
            <div style={{ fontSize: 10, color: THEME.text.tertiary, marginTop: 3 }}>
              CO₂ factor: {CO2_PER_LITRE} kg/L diesel · Based on {validDays.length} days with fuel data
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: THEME.text.tertiary, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Fuel {improved ? "saved" : "excess"}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: improved ? "#16a34a" : "#dc2626" }}>
              {improved ? "-" : "+"}{Math.abs(fuelSaved)} L
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          SECTION 2 — TRIP ANALYSIS
      ════════════════════════════════════════════════════ */}
      <SectionHeader icon="🗺️" title="Trip Analysis" sub="Ignition ON → OFF based trips with GPS distance" />

      {tripsLoading ? <Spinner /> : tripSummary && (
        <>
          {/* Trip summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
            <StatCard icon="🚗" label="Total Trips"
              value={`${tripSummary.total_trips}`}
              sub={`${days}D window`}
              color="#8b5cf6" bg="#f5f3ff" />
            <StatCard icon="📍" label="GPS Distance"
              value={`${tripSummary.total_distance_km} km`}
              sub="Haversine calculated"
              color={THEME.primary[500]} bg={THEME.primary[50]} />
            <StatCard icon="⏱️" label="Total Drive Time"
              value={formatDuration(tripSummary.total_duration_min)}
              sub={`Avg ${formatDuration(tripSummary.avg_trip_duration_min)}/trip`}
              color="#0891b2" bg="#ecfeff" />
            <StatCard icon="🏆" label="Longest Trip"
              value={`${tripSummary.longest_trip_km} km`}
              sub={`Avg ${tripSummary.avg_trip_distance_km} km/trip`}
              color="#f59e0b" bg="#fffbeb" />
          </div>

          {/* Trips table */}
          {trips.length > 0 && (
            <Card style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary, marginBottom: 14 }}>
                Trip Log
              </div>
              {/* Table header */}
              <div style={{
                display: "grid", gridTemplateColumns: "48px 1fr 80px 90px 90px 80px",
                gap: 10, padding: "8px 12px",
                background: THEME.neutral[50], borderRadius: 8,
                fontSize: 10, fontWeight: 700, color: THEME.text.tertiary,
                textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
              }}>
                <div>#</div>
                <div>Time</div>
                <div>Duration</div>
                <div>Distance</div>
                <div>Avg Speed</div>
                <div style={{ textAlign: "right" }}>Max Speed</div>
              </div>

              {trips.map((trip) => (
                <div key={trip.trip_number} style={{
                  display: "grid", gridTemplateColumns: "48px 1fr 80px 90px 90px 80px",
                  gap: 10, padding: "10px 12px", alignItems: "center",
                  borderBottom: `1px solid ${THEME.border.light}`,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: THEME.primary[100], color: THEME.primary[600],
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 800,
                  }}>
                    {trip.trip_number}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: THEME.text.primary }}>
                      {formatTime(trip.start_time)} → {formatTime(trip.end_time)}
                    </div>
                    <div style={{ fontSize: 10, color: THEME.text.tertiary, marginTop: 1 }}>
                      {new Date(trip.start_time).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      {" · "}{trip.gps_points} GPS points
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0891b2" }}>
                    {formatDuration(trip.duration_min)}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: THEME.primary[600] }}>
                    {trip.distance_km} km
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text.primary }}>
                    {trip.avg_speed_kmh} km/h
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b", textAlign: "right" }}>
                    {trip.max_speed_kmh} km/h
                  </div>
                </div>
              ))}
            </Card>
          )}

          {trips.length === 0 && (
            <Card style={{ marginBottom: 28, textAlign: "center", color: THEME.text.tertiary, fontSize: 13, padding: 32 }}>
              No trips detected in this period. Check ignition IO 239 records.
            </Card>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════
          SECTION 3 — IDLE TIME
      ════════════════════════════════════════════════════ */}
      <SectionHeader icon="💤" title="Idle Time" sub="Engine ON + Speed = 0 for more than 5 minutes" />

      {idleLoading ? <Spinner /> : idleSummary && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
            <StatCard icon="⏳" label="Total Idle Time"
              value={formatDuration(idleSummary.total_idle_minutes)}
              sub={`${idleSummary.total_idle_events} idle events`}
              color="#dc2626" bg="#fef2f2" />
            <StatCard icon="📊" label="Avg Idle Duration"
              value={formatDuration(idleSummary.avg_idle_duration_min)}
              sub="Per idle event"
              color="#f59e0b" bg="#fffbeb" />
            <StatCard icon="⛽" label="Fuel Wasted (est.)"
              value={`${idleSummary.estimated_fuel_wasted_litres} L`}
              sub="@ 0.8 L/h idle rate"
              color="#ea580c" bg="#fff7ed" />
            <StatCard icon="🌫️" label="CO₂ from Idling"
              value={`${idleSummary.estimated_co2_wasted_kg} kg`}
              sub="Preventable emissions"
              color="#7c3aed" bg="#f5f3ff" />
          </div>

          {/* Daily idle bars */}
          {dailyIdle.length > 0 && (
            <Card style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary, marginBottom: 14 }}>
                Daily Idle Breakdown
              </div>
              {dailyIdle.map((row, i) => (
                <div key={row.day} style={{
                  display: "grid", gridTemplateColumns: "120px 1fr 90px 80px",
                  gap: 12, padding: "10px 0", alignItems: "center",
                  borderBottom: i < dailyIdle.length - 1 ? `1px solid ${THEME.border.light}` : "none",
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: THEME.text.primary }}>
                    {formatDay(row.day)}
                  </div>
                  <MiniBar value={row.idle_minutes} max={maxIdleMin} color="#dc2626" />
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", textAlign: "right" }}>
                    {formatDuration(row.idle_minutes)}
                  </div>
                  <div style={{ fontSize: 11, color: THEME.text.tertiary, textAlign: "right" }}>
                    {row.idle_events} event{row.idle_events !== 1 ? "s" : ""}
                  </div>
                </div>
              ))}
            </Card>
          )}

          {dailyIdle.length === 0 && (
            <Card style={{ marginBottom: 24, textAlign: "center", color: THEME.text.tertiary, fontSize: 13, padding: 32 }}>
              No idle events ≥ 5 min detected in this period. 
            </Card>
          )}
        </>
      )}

    </div>
  );
}