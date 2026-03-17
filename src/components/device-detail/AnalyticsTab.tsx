// "use client";

// import React, { useState, useEffect, useRef } from "react";
// import { Device } from "@/types";
// import { THEME } from "@/lib/theme";

// interface AnalyticsTabProps { device: Device; }

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
// interface Trip {
//   trip_number: number;
//   start_time: string;
//   end_time: string;
//   duration_min: number;
//   distance_km: number;
//   avg_speed_kmh: number;
//   max_speed_kmh: number;
//   gps_points: number;
// }
// interface TripSummary {
//   total_trips: number;
//   total_distance_km: number;
//   total_duration_min: number;
//   avg_trip_distance_km: number;
//   avg_trip_duration_min: number;
//   longest_trip_km: number;
// }
// interface IdleSummary {
//   total_idle_events: number;
//   total_idle_minutes: number;
//   total_idle_hours: number;
//   estimated_fuel_wasted_litres: number;
//   estimated_co2_wasted_kg: number;
//   avg_idle_duration_min: number;
// }
// interface DailyIdle {
//   day: string;
//   idle_minutes: number;
//   idle_events: number;
//   idle_hours: number;
// }

// const CO2_PER_LITRE = 2.68;

// // ── Small helpers ─────────────────────────────────────────────────────────────
// function SectionHeader({ icon, title, sub }: { icon: string; title: string; sub: string }) {
//   return (
//     <div style={{ marginBottom: 16 }}>
//       <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//         <span style={{ fontSize: 22 }}>{icon}</span>
//         <div>
//           <div style={{ fontSize: 16, fontWeight: 800, color: THEME.text.primary, letterSpacing: -0.3 }}>
//             {title}
//           </div>
//           <div style={{ fontSize: 12, color: THEME.text.tertiary, marginTop: 1 }}>{sub}</div>
//         </div>
//       </div>
//     </div>
//   );
// }

// function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
//   return (
//     <div style={{ flex: 1, height: 6, background: THEME.neutral[100], borderRadius: 3, overflow: "hidden" }}>
//       <div style={{
//         width: `${max > 0 ? Math.min((value / max) * 100, 100) : 0}%`,
//         height: "100%", background: color, borderRadius: 3, transition: "width 0.4s ease",
//       }} />
//     </div>
//   );
// }

// function StatCard({
//   icon, label, value, sub, color, bg,
// }: {
//   icon: string; label: string; value: string; sub: string; color: string; bg: string;
// }) {
//   return (
//     <div style={{
//       background: bg, border: `2px solid ${color}25`,
//       borderRadius: 14, padding: "16px 18px",
//       boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
//     }}>
//       <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
//       <div style={{ fontSize: 18, fontWeight: 800, color, letterSpacing: -0.5, lineHeight: 1.1 }}>{value}</div>
//       <div style={{ fontSize: 11, color: THEME.text.tertiary, fontWeight: 700,
//         textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 }}>{label}</div>
//       <div style={{ fontSize: 11, color: THEME.text.tertiary, marginTop: 2 }}>{sub}</div>
//     </div>
//   );
// }

// function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
//   return (
//     <div style={{
//       background: "white", borderRadius: 14,
//       border: `2px solid ${THEME.border.light}`,
//       padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
//       ...style,
//     }}>
//       {children}
//     </div>
//   );
// }

// function formatDuration(minutes: number) {
//   const h = Math.floor(minutes / 60);
//   const m = Math.round(minutes % 60);
//   if (h === 0) return `${m}m`;
//   return `${h}h ${m}m`;
// }

// function formatTime(iso: string) {
//   return new Date(iso).toLocaleTimeString("en-IN", {
//     hour: "2-digit", minute: "2-digit", hour12: true,
//   });
// }

// function formatDay(dayStr: string) {
//   return new Date(dayStr).toLocaleDateString("en-IN", {
//     weekday: "short", day: "numeric", month: "short",
//   });
// }

// // ── Main component ────────────────────────────────────────────────────────────
// export function AnalyticsTab({ device }: AnalyticsTabProps) {
//   const [days, setDays] = useState(1);

//   // Fuel analytics
//   const [dailyData, setDailyData] = useState<DailyData[]>([]);
//   const [summary, setSummary] = useState<Summary | null>(null);
//   const [fuelLoading, setFuelLoading] = useState(true);

//   // Trips
//   const [trips, setTrips] = useState<Trip[]>([]);
//   const [tripSummary, setTripSummary] = useState<TripSummary | null>(null);
//   const [tripsLoading, setTripsLoading] = useState(true);

//   // Idle
//   const [idleSummary, setIdleSummary] = useState<IdleSummary | null>(null);
//   const [dailyIdle, setDailyIdle] = useState<DailyIdle[]>([]);
//   const [idleLoading, setIdleLoading] = useState(true);

//   const [error, setError] = useState<string | null>(null);

//   // Baseline
//   const [baselineKmpl, setBaselineKmpl] = useState(10);
//   const [editingBaseline, setEditingBaseline] = useState(false);
//   const [baselineInput, setBaselineInput] = useState("10");
//   const baselineRef = useRef<HTMLInputElement>(null);

//   useEffect(() => {
//     const saved = localStorage.getItem(`baseline_kmpl_${device.id}`);
//     if (saved) {
//       const v = parseFloat(saved);
//       if (!isNaN(v) && v > 0) { setBaselineKmpl(v); setBaselineInput(v.toString()); }
//     }
//   }, [device.id]);

//   useEffect(() => { if (editingBaseline) baselineRef.current?.focus(); }, [editingBaseline]);

//   useEffect(() => {
//     setError(null);
//     fetchFuel();
//     fetchTrips();
//     fetchIdle();
//   }, [device.id, days]);

//   const fetchFuel = async () => {
//     setFuelLoading(true);
//     try {
//       const res = await fetch(`/api/analytics?device_id=${device.id}&days=${days}`);
//       const data = await res.json();
//       if (data.success) { setDailyData(data.data); setSummary(data.summary); }
//       else setError(data.error);
//     } catch { setError("Failed to fetch fuel data"); }
//     finally { setFuelLoading(false); }
//   };

//   const fetchTrips = async () => {
//     setTripsLoading(true);
//     try {
//       const res = await fetch(`/api/analytics/trips?device_id=${device.id}&days=${days}`);
//       const data = await res.json();
//       if (data.success) { setTrips(data.trips); setTripSummary(data.summary); }
//     } catch { /* non-fatal */ }
//     finally { setTripsLoading(false); }
//   };

//   const fetchIdle = async () => {
//     setIdleLoading(true);
//     try {
//       const res = await fetch(`/api/analytics/idle?device_id=${device.id}&days=${days}`);
//       const data = await res.json();
//       if (data.success) { setIdleSummary(data.summary); setDailyIdle(data.daily); }
//     } catch { /* non-fatal */ }
//     finally { setIdleLoading(false); }
//   };

//   const handleBaselineSave = () => {
//     const v = parseFloat(baselineInput);
//     if (!isNaN(v) && v > 0) {
//       setBaselineKmpl(v);
//       localStorage.setItem(`baseline_kmpl_${device.id}`, v.toString());
//     }
//     setEditingBaseline(false);
//   };

//   // ── Derived ──────────────────────────────────────────────────────────────────
//   const validDays = dailyData.filter((d) => d.fuel_average_kmpl !== null && d.fuel_litres > 0);
//   const baselineFuelTotal = validDays.reduce((s, d) => s + d.distance_km / baselineKmpl, 0);
//   const actualFuelTotal = validDays.reduce((s, d) => s + d.fuel_litres, 0);
//   const fuelSaved = parseFloat((baselineFuelTotal - actualFuelTotal).toFixed(2));
//   const co2Saved = parseFloat((Math.abs(fuelSaved) * CO2_PER_LITRE).toFixed(2));
//   const improved = fuelSaved > 0;

//   const maxKmpl = Math.max(...dailyData.map((d) => d.fuel_average_kmpl ?? 0), baselineKmpl, 1);
//   const maxIdleMin = Math.max(...dailyIdle.map((d) => d.idle_minutes), 1);

//   // ── Comparison SVG chart ─────────────────────────────────────────────────────
//   const renderComparisonChart = () => {
//     const chartData = [...dailyData].reverse();
//     if (chartData.length === 0) return (
//       <div style={{ padding: 40, textAlign: "center", color: THEME.text.tertiary, fontSize: 13 }}>
//         No efficiency data for this period
//       </div>
//     );

//     const W = 640; const H = 190;
//     const PAD = { top: 16, right: 60, bottom: 32, left: 48 };
//     const gW = W - PAD.left - PAD.right;
//     const gH = H - PAD.top - PAD.bottom;
//     const n = chartData.length;
//     const yMax = maxKmpl * 1.2;

//     const xPos = (i: number) => PAD.left + (n === 1 ? gW / 2 : (i / (n - 1)) * gW);
//     const yPos = (v: number) => PAD.top + gH - (v / yMax) * gH;

//     const actualPoints = chartData
//       .map((d, i) => d.fuel_average_kmpl !== null
//         ? { x: xPos(i), y: yPos(d.fuel_average_kmpl), v: d.fuel_average_kmpl } : null)
//       .filter(Boolean) as { x: number; y: number; v: number }[];

//     const path = actualPoints.length > 1
//       ? `M ${actualPoints.map((p) => `${p.x},${p.y}`).join(" L ")}` : "";
//     const baseY = yPos(baselineKmpl);

//     return (
//       <div style={{ width: "100%", overflowX: "auto" }}>
//         <svg width={W} height={H} style={{ display: "block", overflow: "visible" }}>
//           <defs>
//             <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
//               <stop offset="0%" stopColor={THEME.primary[500]} stopOpacity={0.25} />
//               <stop offset="100%" stopColor={THEME.primary[500]} stopOpacity={0} />
//             </linearGradient>
//           </defs>

//           {/* Grid */}
//           {[0, 0.25, 0.5, 0.75, 1].map((f) => {
//             const v = parseFloat((yMax * f).toFixed(1));
//             const y = yPos(v);
//             return (
//               <g key={f}>
//                 <line x1={PAD.left} y1={y} x2={PAD.left + gW} y2={y}
//                   stroke={THEME.border.light} strokeWidth={1} strokeDasharray="4,4" />
//                 <text x={PAD.left - 6} y={y + 4} fill={THEME.text.tertiary} fontSize={10} textAnchor="end">{v}</text>
//               </g>
//             );
//           })}

//           {/* Baseline dashed line */}
//           <line x1={PAD.left} y1={baseY} x2={PAD.left + gW} y2={baseY}
//             stroke="#f59e0b" strokeWidth={2} strokeDasharray="8,4" />
//           <text x={PAD.left + gW + 6} y={baseY + 4}
//             fill="#f59e0b" fontSize={10} fontWeight="700">
//             {baselineKmpl}
//           </text>

//           {/* Actual area + line */}
//           {path && (
//             <>
//               <path
//                 d={`${path} L ${actualPoints[actualPoints.length-1].x},${PAD.top+gH} L ${actualPoints[0].x},${PAD.top+gH} Z`}
//                 fill="url(#ag)" />
//               <path d={path} fill="none" stroke={THEME.primary[500]}
//                 strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
//             </>
//           )}

//           {/* Dots */}
//           {actualPoints.map((p, i) => (
//             <circle key={i} cx={p.x} cy={p.y} r={5}
//               fill="white" stroke={THEME.primary[500]} strokeWidth={2.5}>
//               <title>{p.v.toFixed(2)} km/L</title>
//             </circle>
//           ))}

//           {/* X labels */}
//           {chartData.map((d, i) => (
//             <text key={i} x={xPos(i)} y={H - 4} fill={THEME.text.tertiary} fontSize={10} textAnchor="middle">
//               {new Date(d.day).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
//             </text>
//           ))}

//           {/* Y axis label */}
//           <text x={13} y={PAD.top + gH / 2} fill={THEME.text.secondary} fontSize={11}
//             textAnchor="middle" transform={`rotate(-90, 13, ${PAD.top + gH / 2})`}>
//             km/L
//           </text>
//         </svg>

//         <div style={{ display: "flex", gap: 18, marginTop: 10, paddingLeft: PAD.left }}>
//           <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
//             <div style={{ width: 18, height: 3, background: THEME.primary[500], borderRadius: 2 }} />
//             <span style={{ fontSize: 11, color: THEME.text.secondary }}>Actual efficiency</span>
//           </div>
//           <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
//             <div style={{ width: 18, height: 2, borderTop: "2px dashed #f59e0b" }} />
//             <span style={{ fontSize: 11, color: THEME.text.secondary }}>Baseline ({baselineKmpl} km/L)</span>
//           </div>
//         </div>
//       </div>
//     );
//   };

//   // ── Loading spinner ──────────────────────────────────────────────────────────
//   const Spinner = () => (
//     <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
//       <div style={{
//         width: 32, height: 32, borderRadius: "50%",
//         border: `3px solid ${THEME.border.light}`,
//         borderTop: `3px solid ${THEME.primary[500]}`,
//         animation: "spin 1s linear infinite",
//       }} />
//     </div>
//   );

//   // ── Render ───────────────────────────────────────────────────────────────────
//   return (
//     <div style={{ padding: 24, background: THEME.background.secondary, minHeight: "100%", overflowY: "auto" }}>

//       {/* ── Top header ── */}
//       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
//         <div>
//           <div style={{ fontSize: 20, fontWeight: 800, color: THEME.text.primary, letterSpacing: -0.5 }}>
//             📊 Fleet Analytics
//           </div>
//           <div style={{ fontSize: 13, color: THEME.text.secondary, marginTop: 3 }}>
//             {device.device_name} · Fuel · Trips · Idle time
//           </div>
//         </div>
//         <div style={{ display: "flex", gap: 4, background: THEME.neutral[100], padding: 4, borderRadius: 10 }}>
//           {[1, 7, 14].map((d) => (
//             <button key={d} onClick={() => setDays(d)} style={{
//               padding: "7px 18px", borderRadius: 7, fontSize: 12, fontWeight: 700,
//               cursor: "pointer", fontFamily: "inherit", border: "none", transition: "all 0.15s",
//               background: days === d ? THEME.primary[500] : "transparent",
//               color: days === d ? "white" : THEME.text.secondary,
//               boxShadow: days === d ? THEME.shadow.sm : "none",
//             }}>
//               {d}D
//             </button>
//           ))}
//         </div>
//       </div>

//       {error && (
//         <div style={{ padding: 16, background: "#fef2f2", border: "2px solid #fca5a5",
//           borderRadius: 12, color: "#dc2626", fontSize: 13, marginBottom: 20 }}>
//           ⚠️ {error}
//         </div>
//       )}

//       {/* ════════════════════════════════════════════════════
//           SECTION 1 — FUEL EFFICIENCY
//       ════════════════════════════════════════════════════ */}
//       <SectionHeader icon="⛽" title="Fuel Efficiency" sub="Daily consumption vs baseline target" />

//       {/* Summary row */}
//       {!fuelLoading && summary && (
//         <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
//           <StatCard icon="🛣️" label="Total Distance"
//             value={`${summary.total_distance_km.toLocaleString("en-IN")} km`}
//             sub={`${summary.days_with_data} days with data`}
//             color={THEME.primary[500]} bg={THEME.primary[50]} />
//           <StatCard icon="⛽" label="Fuel Consumed"
//             value={`${summary.total_fuel_litres.toLocaleString("en-IN")} L`}
//             sub={`${days}D window`}
//             color="#f59e0b" bg="#fffbeb" />
//           <StatCard icon="📈" label="Avg Efficiency"
//             value={summary.overall_fuel_average_kmpl ? `${summary.overall_fuel_average_kmpl} km/L` : "N/A"}
//             sub={`Baseline: ${baselineKmpl} km/L`}
//             color="#3b82f6" bg="#eff6ff" />
//           <StatCard
//             icon={improved ? "🌱" : "⚡"}
//             label="CO₂ Impact"
//             value={validDays.length > 0 ? `${improved ? "-" : "+"}${co2Saved} kg` : "N/A"}
//             sub={improved ? `${Math.abs(fuelSaved)}L saved` : `${Math.abs(fuelSaved)}L extra`}
//             color={improved ? "#16a34a" : "#dc2626"}
//             bg={improved ? "#dcfce7" : "#fef2f2"} />
//         </div>
//       )}
//       {fuelLoading && <Spinner />}

//       {/* Chart card */}
//       <Card style={{ marginBottom: 16 }}>
//         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
//           <div>
//             <div style={{ fontSize: 14, fontWeight: 700, color: THEME.text.primary }}>
//               Actual vs Baseline Efficiency
//             </div>
//             <div style={{ fontSize: 11, color: THEME.text.tertiary, marginTop: 2 }}>km/L — higher is better</div>
//           </div>
//           {/* Editable baseline */}
//           {editingBaseline ? (
//             <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
//               <input ref={baselineRef} type="number" value={baselineInput}
//                 onChange={(e) => setBaselineInput(e.target.value)}
//                 onKeyDown={(e) => { if (e.key === "Enter") handleBaselineSave(); if (e.key === "Escape") setEditingBaseline(false); }}
//                 style={{ width: 65, padding: "6px 10px", borderRadius: 8, fontSize: 13, fontWeight: 700,
//                   border: `2px solid ${THEME.primary[500]}`, outline: "none", textAlign: "center", fontFamily: "inherit" }} />
//               <span style={{ fontSize: 11, color: THEME.text.tertiary }}>km/L</span>
//               <button onClick={handleBaselineSave} style={{
//                 padding: "6px 12px", background: THEME.primary[500], color: "white",
//                 border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
//                 Set
//               </button>
//               <button onClick={() => setEditingBaseline(false)} style={{
//                 padding: "6px 10px", background: THEME.neutral[100], color: THEME.text.secondary,
//                 border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
//                 ✕
//               </button>
//             </div>
//           ) : (
//             <button onClick={() => setEditingBaseline(true)} style={{
//               padding: "6px 14px", background: "#fffbeb", border: "2px solid #f59e0b",
//               borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#92400e",
//               cursor: "pointer", fontFamily: "inherit" }}>
//               ✏️ {baselineKmpl} km/L baseline
//             </button>
//           )}
//         </div>
//         {fuelLoading ? <Spinner /> : renderComparisonChart()}
//       </Card>

//       {/* CO2 banner */}
//       {!fuelLoading && validDays.length > 0 && (
//         <div style={{
//           display: "flex", alignItems: "center", gap: 16,
//           background: improved ? "linear-gradient(135deg,#f0fdf4,#dcfce7)" : "linear-gradient(135deg,#fef2f2,#fee2e2)",
//           border: `2px solid ${improved ? "#86efac" : "#fca5a5"}`,
//           borderRadius: 14, padding: "18px 22px", marginBottom: 28,
//           boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
//         }}>
//           <span style={{ fontSize: 40 }}>{improved ? "🌱" : "⚠️"}</span>
//           <div style={{ flex: 1 }}>
//             <div style={{ fontSize: 15, fontWeight: 800, color: improved ? "#15803d" : "#b91c1c" }}>
//               {improved
//                 ? `${co2Saved} kg CO₂ saved vs baseline`
//                 : `${co2Saved} kg extra CO₂ vs baseline`}
//             </div>
//             <div style={{ fontSize: 12, color: improved ? "#166534" : "#991b1b", marginTop: 3 }}>
//               {improved
//                 ? `${Math.abs(fuelSaved)}L less fuel than baseline · ~${(co2Saved / 0.12).toFixed(0)} km worth of savings`
//                 : `${Math.abs(fuelSaved)}L more fuel than baseline`}
//             </div>
//             <div style={{ fontSize: 10, color: THEME.text.tertiary, marginTop: 3 }}>
//               CO₂ factor: {CO2_PER_LITRE} kg/L diesel · Based on {validDays.length} days with fuel data
//             </div>
//           </div>
//           <div style={{ textAlign: "right" }}>
//             <div style={{ fontSize: 10, color: THEME.text.tertiary, textTransform: "uppercase", letterSpacing: 0.5 }}>
//               Fuel {improved ? "saved" : "excess"}
//             </div>
//             <div style={{ fontSize: 22, fontWeight: 800, color: improved ? "#16a34a" : "#dc2626" }}>
//               {improved ? "-" : "+"}{Math.abs(fuelSaved)} L
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ════════════════════════════════════════════════════
//           SECTION 2 — TRIP ANALYSIS
//       ════════════════════════════════════════════════════ */}
//       <SectionHeader icon="🗺️" title="Trip Analysis" sub="Ignition ON → OFF based trips with GPS distance" />

//       {tripsLoading ? <Spinner /> : tripSummary && (
//         <>
//           {/* Trip summary cards */}
//           <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
//             <StatCard icon="🚗" label="Total Trips"
//               value={`${tripSummary.total_trips}`}
//               sub={`${days}D window`}
//               color="#8b5cf6" bg="#f5f3ff" />
//             <StatCard icon="📍" label="GPS Distance"
//               value={`${tripSummary.total_distance_km} km`}
//               sub="Haversine calculated"
//               color={THEME.primary[500]} bg={THEME.primary[50]} />
//             <StatCard icon="⏱️" label="Total Drive Time"
//               value={formatDuration(tripSummary.total_duration_min)}
//               sub={`Avg ${formatDuration(tripSummary.avg_trip_duration_min)}/trip`}
//               color="#0891b2" bg="#ecfeff" />
//             <StatCard icon="🏆" label="Longest Trip"
//               value={`${tripSummary.longest_trip_km} km`}
//               sub={`Avg ${tripSummary.avg_trip_distance_km} km/trip`}
//               color="#f59e0b" bg="#fffbeb" />
//           </div>

//           {/* Trips table */}
//           {trips.length > 0 && (
//             <Card style={{ marginBottom: 28 }}>
//               <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary, marginBottom: 14 }}>
//                 Trip Log
//               </div>
//               {/* Table header */}
//               <div style={{
//                 display: "grid", gridTemplateColumns: "48px 1fr 80px 90px 90px 80px",
//                 gap: 10, padding: "8px 12px",
//                 background: THEME.neutral[50], borderRadius: 8,
//                 fontSize: 10, fontWeight: 700, color: THEME.text.tertiary,
//                 textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
//               }}>
//                 <div>#</div>
//                 <div>Time</div>
//                 <div>Duration</div>
//                 <div>Distance</div>
//                 <div>Avg Speed</div>
//                 <div style={{ textAlign: "right" }}>Max Speed</div>
//               </div>

//               {trips.map((trip) => (
//                 <div key={trip.trip_number} style={{
//                   display: "grid", gridTemplateColumns: "48px 1fr 80px 90px 90px 80px",
//                   gap: 10, padding: "10px 12px", alignItems: "center",
//                   borderBottom: `1px solid ${THEME.border.light}`,
//                 }}>
//                   <div style={{
//                     width: 28, height: 28, borderRadius: "50%",
//                     background: THEME.primary[100], color: THEME.primary[600],
//                     display: "flex", alignItems: "center", justifyContent: "center",
//                     fontSize: 11, fontWeight: 800,
//                   }}>
//                     {trip.trip_number}
//                   </div>
//                   <div>
//                     <div style={{ fontSize: 12, fontWeight: 600, color: THEME.text.primary }}>
//                       {formatTime(trip.start_time)} → {formatTime(trip.end_time)}
//                     </div>
//                     <div style={{ fontSize: 10, color: THEME.text.tertiary, marginTop: 1 }}>
//                       {new Date(trip.start_time).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
//                       {" · "}{trip.gps_points} GPS points
//                     </div>
//                   </div>
//                   <div style={{ fontSize: 13, fontWeight: 700, color: "#0891b2" }}>
//                     {formatDuration(trip.duration_min)}
//                   </div>
//                   <div style={{ fontSize: 13, fontWeight: 700, color: THEME.primary[600] }}>
//                     {trip.distance_km} km
//                   </div>
//                   <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text.primary }}>
//                     {trip.avg_speed_kmh} km/h
//                   </div>
//                   <div style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b", textAlign: "right" }}>
//                     {trip.max_speed_kmh} km/h
//                   </div>
//                 </div>
//               ))}
//             </Card>
//           )}

//           {trips.length === 0 && (
//             <Card style={{ marginBottom: 28, textAlign: "center", color: THEME.text.tertiary, fontSize: 13, padding: 32 }}>
//               No trips detected in this period. Check ignition IO 239 records.
//             </Card>
//           )}
//         </>
//       )}

//       {/* ════════════════════════════════════════════════════
//           SECTION 3 — IDLE TIME
//       ════════════════════════════════════════════════════ */}
//       <SectionHeader icon="💤" title="Idle Time" sub="Engine ON + Speed = 0 for more than 5 minutes" />

//       {idleLoading ? <Spinner /> : idleSummary && (
//         <>
//           <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
//             <StatCard icon="⏳" label="Total Idle Time"
//               value={formatDuration(idleSummary.total_idle_minutes)}
//               sub={`${idleSummary.total_idle_events} idle events`}
//               color="#dc2626" bg="#fef2f2" />
//             <StatCard icon="📊" label="Avg Idle Duration"
//               value={formatDuration(idleSummary.avg_idle_duration_min)}
//               sub="Per idle event"
//               color="#f59e0b" bg="#fffbeb" />
//             <StatCard icon="⛽" label="Fuel Wasted (est.)"
//               value={`${idleSummary.estimated_fuel_wasted_litres} L`}
//               sub="@ 0.8 L/h idle rate"
//               color="#ea580c" bg="#fff7ed" />
//             <StatCard icon="🌫️" label="CO₂ from Idling"
//               value={`${idleSummary.estimated_co2_wasted_kg} kg`}
//               sub="Preventable emissions"
//               color="#7c3aed" bg="#f5f3ff" />
//           </div>

//           {/* Daily idle bars */}
//           {dailyIdle.length > 0 && (
//             <Card style={{ marginBottom: 24 }}>
//               <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary, marginBottom: 14 }}>
//                 Daily Idle Breakdown
//               </div>
//               {dailyIdle.map((row, i) => (
//                 <div key={row.day} style={{
//                   display: "grid", gridTemplateColumns: "120px 1fr 90px 80px",
//                   gap: 12, padding: "10px 0", alignItems: "center",
//                   borderBottom: i < dailyIdle.length - 1 ? `1px solid ${THEME.border.light}` : "none",
//                 }}>
//                   <div style={{ fontSize: 12, fontWeight: 600, color: THEME.text.primary }}>
//                     {formatDay(row.day)}
//                   </div>
//                   <MiniBar value={row.idle_minutes} max={maxIdleMin} color="#dc2626" />
//                   <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", textAlign: "right" }}>
//                     {formatDuration(row.idle_minutes)}
//                   </div>
//                   <div style={{ fontSize: 11, color: THEME.text.tertiary, textAlign: "right" }}>
//                     {row.idle_events} event{row.idle_events !== 1 ? "s" : ""}
//                   </div>
//                 </div>
//               ))}
//             </Card>
//           )}

//           {dailyIdle.length === 0 && (
//             <Card style={{ marginBottom: 24, textAlign: "center", color: THEME.text.tertiary, fontSize: 13, padding: 32 }}>
//               No idle events ≥ 5 min detected in this period. 
//             </Card>
//           )}
//         </>
//       )}

//     </div>
//   );
// }
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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

// ── Date helpers ──────────────────────────────────────────────────────────────
function toLocalDateString(date: Date): string {
  // Returns YYYY-MM-DD in local time (not UTC)
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatRangeLabel(start: string, end: string): string {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const sl = s.toLocaleDateString("en-IN", opts);
  const el = e.toLocaleDateString("en-IN", opts);
  return sl === el ? sl : `${sl} – ${el}`;
}

function isSameDay(a: string, b: string) { return a === b; }
function isInRange(day: string, start: string, end: string) {
  return day >= start && day <= end;
}

// ── Calendar component ────────────────────────────────────────────────────────
interface CalendarProps {
  rangeStart: string | null;
  rangeEnd: string | null;
  onSelect: (date: string) => void;
}

function Calendar({ rangeStart, rangeEnd, onSelect }: CalendarProps) {
  const today = toLocalDateString(new Date());
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    // Start the calendar on the month of rangeStart or today
    if (rangeStart) return new Date(rangeStart + "T00:00:00");
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const prevMonth = () => setViewMonth(d => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n; });
  const nextMonth = () => setViewMonth(d => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; });

  // Build calendar grid
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }

  return (
    <div style={{ userSelect: "none" }}>
      {/* Month nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button onClick={prevMonth} style={{
          width: 28, height: 28, border: `1px solid ${THEME.border.light}`,
          borderRadius: 7, background: "white", cursor: "pointer", fontSize: 14, color: THEME.text.secondary,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>‹</button>
        <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary }}>
          {MONTHS[month]} {year}
        </div>
        <button onClick={nextMonth} style={{
          width: 28, height: 28, border: `1px solid ${THEME.border.light}`,
          borderRadius: 7, background: "white", cursor: "pointer", fontSize: 14, color: THEME.text.secondary,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>›</button>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700,
            color: THEME.text.tertiary, padding: "2px 0" }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;

          const isToday = day === today;
          const isFuture = day > today;
          const isStart = rangeStart && isSameDay(day, rangeStart);
          const isEnd = rangeEnd && isSameDay(day, rangeEnd);
          const inRange = rangeStart && rangeEnd && isInRange(day, rangeStart, rangeEnd);
          const isSelected = isStart || isEnd;

          return (
            <button
              key={day}
              disabled={isFuture}
              onClick={() => !isFuture && onSelect(day)}
              style={{
                width: "100%", aspectRatio: "1", border: "none", borderRadius: 7,
                fontSize: 11, fontWeight: isSelected ? 800 : isToday ? 700 : 500,
                cursor: isFuture ? "not-allowed" : "pointer",
                background: isSelected
                  ? THEME.primary[500]
                  : inRange
                    ? THEME.primary[100]
                    : "transparent",
                color: isSelected
                  ? "white"
                  : isFuture
                    ? THEME.neutral[300]
                    : isToday
                      ? THEME.primary[600]
                      : inRange
                        ? THEME.primary[700]
                        : THEME.text.primary,
                transition: "all 0.1s",
                outline: isToday && !isSelected ? `2px solid ${THEME.primary[200]}` : "none",
                outlineOffset: -1,
              }}
            >
              {parseInt(day.split("-")[2])}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Date range picker dropdown ────────────────────────────────────────────────
interface DateRangePickerProps {
  rangeStart: string | null;
  rangeEnd: string | null;
  onRangeChange: (start: string, end: string) => void;
  onClose: () => void;
}

type PickStep = "start" | "end";

function DateRangePicker({ rangeStart, rangeEnd, onRangeChange, onClose }: DateRangePickerProps) {
  const [step, setStep] = useState<PickStep>("start");
  const [tempStart, setTempStart] = useState<string | null>(rangeStart);
  const [tempEnd, setTempEnd] = useState<string | null>(rangeEnd);

  const handleSelect = (day: string) => {
    if (step === "start") {
      setTempStart(day);
      setTempEnd(null);
      setStep("end");
    } else {
      // Swap if end is before start
      if (tempStart && day < tempStart) {
        setTempStart(day);
        setTempEnd(tempStart);
        onRangeChange(day, tempStart!);
      } else {
        setTempEnd(day);
        onRangeChange(tempStart!, day);
      }
      onClose();
    }
  };

  return (
    <div style={{
      position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 999,
      background: "white", borderRadius: 14,
      border: `2px solid ${THEME.border.light}`,
      boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
      padding: 16, width: 270,
    }}>
      {/* Step indicator */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {(["start", "end"] as PickStep[]).map((s) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            style={{
              flex: 1, padding: "6px 0", borderRadius: 8, fontSize: 11, fontWeight: 700,
              border: `2px solid ${step === s ? THEME.primary[500] : THEME.border.light}`,
              background: step === s ? THEME.primary[50] : "white",
              color: step === s ? THEME.primary[600] : THEME.text.tertiary,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {s === "start" ? "📅 Start" : "📅 End"}
            {s === "start" && tempStart && (
              <span style={{ display: "block", fontSize: 10, color: THEME.primary[500], marginTop: 1 }}>
                {new Date(tempStart + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
            )}
            {s === "end" && tempEnd && (
              <span style={{ display: "block", fontSize: 10, color: THEME.primary[500], marginTop: 1 }}>
                {new Date(tempEnd + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 10, color: THEME.text.tertiary, marginBottom: 10, textAlign: "center" }}>
        {step === "start" ? "Select start date" : "Now select end date"}
      </div>

      <Calendar
        rangeStart={tempStart}
        rangeEnd={tempEnd}
        onSelect={handleSelect}
      />

      {/* Quick presets */}
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${THEME.border.light}` }}>
        <div style={{ fontSize: 10, color: THEME.text.tertiary, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Quick select</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { label: "This week", days: 7 },
            { label: "Last 14d", days: 14 },
            { label: "This month", days: 30 },
          ].map(({ label, days }) => {
            const end = toLocalDateString(new Date());
            const startD = new Date();
            startD.setDate(startD.getDate() - (days - 1));
            const start = toLocalDateString(startD);
            return (
              <button key={label} onClick={() => { onRangeChange(start, end); onClose(); }} style={{
                padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                border: `1px solid ${THEME.border.light}`, background: THEME.neutral[50],
                color: THEME.text.secondary, cursor: "pointer", fontFamily: "inherit",
              }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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

  // Custom date range for fuel section only
  const [customMode, setCustomMode] = useState(false);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

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

  // Close calendar on outside click
  useEffect(() => {
    if (!calendarOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [calendarOpen]);

  // Fetch fuel data — triggered by days, custom range, or device change
  const fetchFuel = useCallback(async () => {
    setFuelLoading(true);
    setError(null);
    try {
      let url: string;
      if (customMode && rangeStart && rangeEnd) {
        url = `/api/analytics?device_id=${device.id}&start_date=${rangeStart}&end_date=${rangeEnd}`;
      } else {
        url = `/api/analytics?device_id=${device.id}&days=${days}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) { setDailyData(data.data); setSummary(data.summary); }
      else setError(data.error);
    } catch { setError("Failed to fetch fuel data"); }
    finally { setFuelLoading(false); }
  }, [device.id, days, customMode, rangeStart, rangeEnd]);

  const fetchTrips = useCallback(async () => {
    setTripsLoading(true);
    try {
      const res = await fetch(`/api/analytics/trips?device_id=${device.id}&days=${days}`);
      const data = await res.json();
      if (data.success) { setTrips(data.trips); setTripSummary(data.summary); }
    } catch { /* non-fatal */ }
    finally { setTripsLoading(false); }
  }, [device.id, days]);

  const fetchIdle = useCallback(async () => {
    setIdleLoading(true);
    try {
      const res = await fetch(`/api/analytics/idle?device_id=${device.id}&days=${days}`);
      const data = await res.json();
      if (data.success) { setIdleSummary(data.summary); setDailyIdle(data.daily); }
    } catch { /* non-fatal */ }
    finally { setIdleLoading(false); }
  }, [device.id, days]);

  // Re-fetch on day/device change (for everything)
  useEffect(() => {
    if (!customMode) {
      fetchFuel();
    }
    fetchTrips();
    fetchIdle();
  }, [device.id, days]);

  // Re-fetch fuel when custom range changes
  useEffect(() => {
    if (customMode && rangeStart && rangeEnd) {
      fetchFuel();
    }
  }, [customMode, rangeStart, rangeEnd, device.id]);

  const handleDayButton = (d: number) => {
    setCustomMode(false);
    setDays(d);
  };

  const handleRangeChange = (start: string, end: string) => {
    setRangeStart(start);
    setRangeEnd(end);
    setCustomMode(true);
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

        {/* Day selector + Custom button */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {/* Preset day buttons */}
          <div style={{ display: "flex", gap: 4, background: THEME.neutral[100], padding: 4, borderRadius: 10 }}>
            {[1, 7, 14].map((d) => (
              <button key={d} onClick={() => handleDayButton(d)} style={{
                padding: "7px 18px", borderRadius: 7, fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit", border: "none", transition: "all 0.15s",
                background: !customMode && days === d ? THEME.primary[500] : "transparent",
                color: !customMode && days === d ? "white" : THEME.text.secondary,
                boxShadow: !customMode && days === d ? THEME.shadow.sm : "none",
              }}>
                {d}D
              </button>
            ))}
          </div>

          {/* Custom date range button + dropdown */}
          <div ref={calendarRef} style={{ position: "relative" }}>
            <button
              onClick={() => setCalendarOpen((o) => !o)}
              style={{
                padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit", border: "none", transition: "all 0.15s",
                background: customMode ? THEME.primary[500] : THEME.neutral[100],
                color: customMode ? "white" : THEME.text.secondary,
                boxShadow: customMode ? THEME.shadow.sm : "none",
                display: "flex", alignItems: "center", gap: 6,
                whiteSpace: "nowrap",
              }}
            >
              <span>📅</span>
              <span>
                {customMode && rangeStart && rangeEnd
                  ? formatRangeLabel(rangeStart, rangeEnd)
                  : "Custom"}
              </span>
              <span style={{ fontSize: 9, opacity: 0.7 }}>▼</span>
            </button>

            {calendarOpen && (
              <DateRangePicker
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                onRangeChange={handleRangeChange}
                onClose={() => setCalendarOpen(false)}
              />
            )}
          </div>
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
          (uses custom date range when active, else preset days)
      ════════════════════════════════════════════════════ */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
        <SectionHeader icon="⛽" title="Fuel Efficiency" sub="Daily consumption vs baseline target" />
        {customMode && rangeStart && rangeEnd && (
          <div style={{
            fontSize: 11, fontWeight: 700, color: THEME.primary[600],
            background: THEME.primary[50], border: `1px solid ${THEME.primary[200]}`,
            borderRadius: 8, padding: "4px 10px", marginBottom: 16,
          }}>
            📅 {formatRangeLabel(rangeStart, rangeEnd)}
          </div>
        )}
      </div>

      {/* Summary row */}
      {!fuelLoading && summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          <StatCard icon="🛣️" label="Total Distance"
            value={`${summary.total_distance_km.toLocaleString("en-IN")} km`}
            sub={`${summary.days_with_data} days with data`}
            color={THEME.primary[500]} bg={THEME.primary[50]} />
          <StatCard icon="⛽" label="Fuel Consumed"
            value={`${summary.total_fuel_litres.toLocaleString("en-IN")} L`}
            sub={customMode && rangeStart && rangeEnd ? formatRangeLabel(rangeStart, rangeEnd) : `${days}D window`}
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